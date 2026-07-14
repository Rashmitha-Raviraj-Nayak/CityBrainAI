"""Tests for the Understanding Agent."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.understanding_agent import understand_report
from app.schemas.incident_state import IncidentState


def make_state(**kwargs: object) -> IncidentState:
    defaults = dict(
        incident_id="t1",
        citizen_id="c1",
        input_channels=["text"],
        raw_transcript="There is flooding near the main market.",
    )
    defaults.update(kwargs)
    return IncidentState(**defaults)


def payload(**overrides: object) -> dict:
    base = {
        "issue_type": "flood",
        "severity": "high",
        "urgency": "high",
        "location_clues": ["main market"],
        "landmarks": ["Central Market"],
        "department_hint": "water_and_drainage",
        "hazards": ["standing water"],
        "people_affected": "several shopkeepers",
        "model_confidence": 0.85,
        "supporting_phrases": ["flooding near the main market"],
        "ignored_information": [],
        "issue_type_reason": "Explicit mention of flooding.",
        "severity_reason": "Affects a commercial area with foot traffic.",
        "is_abusive": False,
        "is_irrelevant": False,
        "language_detected": "en",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_normal_report() -> None:
    state = make_state()
    response = MagicMock(text=json.dumps(payload()))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert result.issue_type == "flood"
    assert result.understanding_confidence > 0.7


@pytest.mark.asyncio
async def test_multilingual_report() -> None:
    state = make_state(raw_transcript="Hay una inundación cerca del mercado principal.")
    response = MagicMock(text=json.dumps(payload(language_detected="es")))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert result.language_detected == "es"
    assert result.issue_type == "flood"


@pytest.mark.asyncio
async def test_irrelevant_report_not_merged() -> None:
    state = make_state(raw_transcript="Is this app free to use?")
    response = MagicMock(text=json.dumps(payload(is_irrelevant=True, issue_type="other", severity="low")))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert result.is_irrelevant is True
    assert result.understanding_confidence == 0.0


@pytest.mark.asyncio
async def test_abusive_report_flagged_not_merged() -> None:
    state = make_state(raw_transcript="[abusive content redacted for test]")
    response = MagicMock(text=json.dumps(payload(is_abusive=True)))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert result.is_abusive is True
    assert result.understanding_confidence == 0.0
    assert result.department_hint is None


@pytest.mark.asyncio
async def test_empty_transcript_no_op() -> None:
    state = make_state(raw_transcript="")
    result = await understand_report(state)

    assert result.issue_type is None
    assert len(result.reasoning_trace) == 1


@pytest.mark.asyncio
async def test_malformed_json_degrades_after_retry() -> None:
    state = make_state()
    bad = MagicMock(text="Sure, here you go: {broken")
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=bad)):
        result = await understand_report(state)

    assert result.understanding_confidence == 0.0


@pytest.mark.asyncio
async def test_timeout_retries_once_then_degrades() -> None:
    state = make_state()
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(side_effect=TimeoutError("upstream timeout"))):
        result = await understand_report(state)

    assert result.understanding_confidence == 0.0


@pytest.mark.asyncio
async def test_merge_agreement_unions_hazards_and_takes_max_severity() -> None:
    state = make_state(issue_type="flood", severity="medium", vision_confidence=0.8, hazards_detected=["submerged vehicle"])
    response = MagicMock(text=json.dumps(payload(severity="critical", hazards=["standing water"])))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert set(result.hazards_detected) == {"submerged vehicle", "standing water"}
    assert result.severity == "critical"
    assert len(result.contradictions) == 0


@pytest.mark.asyncio
async def test_merge_contradiction_logged_and_higher_confidence_wins() -> None:
    state = make_state(issue_type="road_damage", severity="low", vision_confidence=0.5, hazards_detected=["pothole"])
    response = MagicMock(text=json.dumps(payload(issue_type="flood", model_confidence=0.9)))
    with patch("app.agents.understanding_agent.understanding_agent.run_async", new=AsyncMock(return_value=response)):
        result = await understand_report(state)

    assert len(result.contradictions) == 1
    assert result.issue_type == "flood"
