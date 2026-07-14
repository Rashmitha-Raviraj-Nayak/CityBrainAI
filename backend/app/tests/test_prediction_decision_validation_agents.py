from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.decision_agent import decide_incident
from app.agents.prediction_agent import predict_incident
from app.agents.validation_agent import validate_decision
from app.schemas.incident_state import IncidentState


def make_state(**kwargs: object) -> IncidentState:
    defaults = dict(
        incident_id="p1",
        citizen_id="c1",
        input_channels=["text"],
        raw_transcript="Flooding is affecting the main road.",
        issue_type="flood",
        severity="high",
        urgency="high",
        vision_confidence=0.75,
        understanding_confidence=0.82,
    )
    defaults.update(kwargs)
    return IncidentState(**defaults)


@pytest.mark.asyncio
async def test_prediction_normal_prediction() -> None:
    state = make_state()
    response = MagicMock(text=json.dumps({
        "priority_score": 0.88,
        "urgency": "high",
        "affected_population": "50-100",
        "recommended_departments": ["Public Works", "Emergency Management"],
        "estimated_response_minutes": 25,
        "risk_level": "high",
        "prediction_reason": "Flooding near a main road with high urgency.",
        "confidence": 0.82,
    }))
    with patch("app.agents.prediction_agent.prediction_agent.run_async", new=AsyncMock(return_value=response)):
        result = await predict_incident(state)

    assert result.priority_score > 0.7
    assert result.predicted_spread["risk_level"] == "high"
    assert result.reasoning_trace[-1].agent == "prediction_agent"


@pytest.mark.asyncio
async def test_prediction_fallback_when_no_vision_or_understanding() -> None:
    state = make_state(issue_type=None, severity=None, urgency=None, vision_confidence=None, understanding_confidence=None)
    with patch("app.agents.prediction_agent.prediction_agent.run_async", new=AsyncMock(side_effect=RuntimeError("boom"))):
        result = await predict_incident(state)

    assert result.predicted_spread["risk_level"] == "medium"
    assert result.prediction_confidence == 0.0


@pytest.mark.asyncio
async def test_decision_success_and_low_confidence() -> None:
    state = make_state(priority_score=0.88, predicted_spread={"risk_level": "high"}, assigned_department="Public Works")
    state.predicted_spread = {"risk_level": "high"}
    state.priority = "high"
    response = MagicMock(text=json.dumps({
        "departments": ["Public Works", "Emergency Management"],
        "emergency_level": "high",
        "sla_minutes": 30,
        "resources": ["rapid_response_team"],
        "citizen_message": "A response team has been dispatched.",
        "internal_message": "Escalate to field operations.",
        "decision_reason": "High-risk flood conditions require immediate response.",
        "confidence": 0.84,
    }))
    with patch("app.agents.decision_agent.decision_agent.run_async", new=AsyncMock(return_value=response)):
        result = await decide_incident(state)

    assert result.assigned_department == "Public Works"
    assert result.decision_confidence > 0.7

    low_state = make_state(priority_score=0.3, predicted_spread={"risk_level": "low"})
    low_state.predicted_spread = {"risk_level": "low"}
    low_state.priority = "low"
    low_response = MagicMock(text=json.dumps({
        "departments": ["Municipal Services"],
        "emergency_level": "low",
        "sla_minutes": 180,
        "resources": ["standard_inspection_team"],
        "citizen_message": "Your report is being reviewed.",
        "internal_message": "Continue monitoring.",
        "decision_reason": "Insufficient evidence for urgent dispatch.",
        "confidence": 0.3,
    }))
    with patch("app.agents.decision_agent.decision_agent.run_async", new=AsyncMock(return_value=low_response)):
        low_result = await decide_incident(low_state)

    assert low_result.validated is False


@pytest.mark.asyncio
async def test_validation_rejects_low_confidence_and_manual_review() -> None:
    state = make_state()
    state.decision_confidence = 0.3
    state.issue_type = "flood"
    state.severity = "high"
    state.prediction_confidence = 0.4
    state.predicted_spread = {"risk_level": "high"}
    state.priority = "high"
    state.assigned_department = "Public Works"
    response = MagicMock(text=json.dumps({
        "approved": False,
        "needs_review": True,
        "retry_count": 1,
        "validation_reason": "Confidence below threshold.",
        "confidence": 0.4,
        "manual_review": True,
    }))
    with patch("app.agents.validation_agent.validation_agent.run_async", new=AsyncMock(return_value=response)):
        result = await validate_decision(state)

    assert result.validated is False
    assert result.manual_review is True


@pytest.mark.asyncio
async def test_validation_offline_deterministic() -> None:
    state = make_state()
    state.decision_confidence = 0.9
    state.issue_type = "flood"
    state.severity = "high"
    state.prediction_confidence = 0.85
    state.predicted_spread = {"risk_level": "high"}
    state.priority = "high"
    state.assigned_department = "Public Works"
    response = MagicMock(text='{"approved":true,"needs_review":false,"retry_count":0,"validation_reason":"High confidence and consistent evidence.","confidence":0.9,"manual_review":false}')
    with patch("app.agents.validation_agent.validation_agent.run_async", new=AsyncMock(return_value=response)):
        result = await validate_decision(state)

    assert result.validated is True
    assert result.manual_review is False
