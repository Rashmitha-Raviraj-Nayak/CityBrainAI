"""Tests for the Vision Agent."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.confidence import compute_composite_confidence
from app.agents.image_validator import ImageValidationError, validate_and_scrub
from app.agents.vision_agent import analyze_image
from app.schemas.incident_state import IncidentState


def make_state(**kwargs: object) -> IncidentState:
    defaults = dict(
        incident_id="test-1",
        citizen_id="citizen-1",
        input_channels=["image"],
        raw_image_url="gs://citybrain-uploads/test.jpg",
    )
    defaults.update(kwargs)
    return IncidentState(**defaults)


def good_payload(**overrides: object) -> dict:
    payload = {
        "issue_type": "flood",
        "severity": "high",
        "model_confidence": 0.9,
        "objects_detected": ["car"],
        "hazards_detected": ["standing water"],
        "damage_indicators": [],
        "visible_evidence": ["submerged road"],
        "possible_risks": ["electrical hazard"],
        "severity_reason": "Large area flooded, blocking a main road.",
        "issue_type_reason": "Standing water covers the roadway.",
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_successful_classification() -> None:
    state = make_state()
    prefilter = MagicMock(text="yes")
    analysis = MagicMock(text=json.dumps(good_payload()))
    with patch("app.agents.vision_agent.vision_prefilter.run_async", new=AsyncMock(return_value=prefilter)), patch(
        "app.agents.vision_agent.vision_agent.run_async",
        new=AsyncMock(return_value=analysis),
    ):
        result = await analyze_image(state, image_quality_score=1.0)

    assert result.issue_type == "flood"
    assert result.severity == "high"
    assert result.vision_confidence > 0.8
    assert result.reasoning_trace[-1].agent == "vision_agent"


@pytest.mark.asyncio
async def test_api_failure_retries_then_degrades() -> None:
    state = make_state()
    prefilter = MagicMock(text="yes")
    with patch("app.agents.vision_agent.vision_prefilter.run_async", new=AsyncMock(return_value=prefilter)), patch(
        "app.agents.vision_agent.vision_agent.run_async",
        new=AsyncMock(side_effect=RuntimeError("500")),
    ):
        result = await analyze_image(state)

    assert result.vision_confidence == 0.0
    assert result.severity == "medium"
    assert "human review" in result.reasoning_trace[-1].why.lower()


@pytest.mark.asyncio
async def test_malformed_json_triggers_retry_path() -> None:
    state = make_state()
    prefilter = MagicMock(text="yes")
    bad = MagicMock(text="Sure! Here's the JSON: {not valid}")
    with patch("app.agents.vision_agent.vision_prefilter.run_async", new=AsyncMock(return_value=prefilter)), patch(
        "app.agents.vision_agent.vision_agent.run_async",
        new=AsyncMock(return_value=bad),
    ):
        result = await analyze_image(state)

    assert result.vision_confidence == 0.0


@pytest.mark.asyncio
async def test_low_confidence_flagged_not_hidden() -> None:
    state = make_state()
    prefilter = MagicMock(text="yes")
    low = MagicMock(text=json.dumps(good_payload(model_confidence=0.3)))
    with patch("app.agents.vision_agent.vision_prefilter.run_async", new=AsyncMock(return_value=prefilter)), patch(
        "app.agents.vision_agent.vision_agent.run_async",
        new=AsyncMock(return_value=low),
    ):
        result = await analyze_image(state, image_quality_score=1.0)

    assert result.vision_confidence < 0.65


@pytest.mark.asyncio
async def test_missing_image_no_op() -> None:
    state = make_state(raw_image_url=None)
    result = await analyze_image(state)

    assert result.issue_type is None
    assert len(result.reasoning_trace) == 0


@pytest.mark.asyncio
async def test_prefilter_rejects_unusable_image() -> None:
    state = make_state()
    prefilter = MagicMock(text="no")
    with patch("app.agents.vision_agent.vision_prefilter.run_async", new=AsyncMock(return_value=prefilter)):
        result = await analyze_image(state)

    assert result.vision_confidence == 0.0
    assert result.issue_type is None


def test_large_image_rejected_by_validator() -> None:
    oversized = b"0" * (11 * 1024 * 1024)
    with pytest.raises(ImageValidationError):
        validate_and_scrub(oversized, "image/jpeg")


def test_composite_confidence_weights_image_quality() -> None:
    high_quality = compute_composite_confidence(0.9, 1.0, 1.0)
    low_quality = compute_composite_confidence(0.9, 0.1, 1.0)

    assert high_quality > low_quality
