"""Prediction Agent — estimates incident spread, urgency, and response needs."""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, Field

from app.agents.confidence import compute_composite_confidence, schema_completeness
from app.config import settings
from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

PREDICTION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "priority_score": {"type": "number"},
        "urgency": {"type": "string", "enum": ["low", "medium", "high", "immediate"]},
        "affected_population": {"type": "string"},
        "recommended_departments": {"type": "array", "items": {"type": "string"}},
        "estimated_response_minutes": {"type": "number"},
        "risk_level": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
        "prediction_reason": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": ["priority_score", "urgency", "affected_population", "recommended_departments", "estimated_response_minutes", "risk_level", "prediction_reason", "confidence"],
}


class PredictionOutput(BaseModel):
    priority_score: float
    urgency: str
    affected_population: str
    recommended_departments: list[str] = Field(default_factory=list)
    estimated_response_minutes: int
    risk_level: str
    prediction_reason: str
    confidence: float


class _FallbackAgent:
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.name = kwargs.get("name", "prediction_agent")
        self.model = kwargs.get("model", settings.gemini_flash_model)
        self.instruction = kwargs.get("instruction", "Predict incident spread and urgency based on state.")
        self.generate_content_config = kwargs.get("generate_content_config", {"response_mime_type": "application/json", "response_schema": PREDICTION_RESPONSE_SCHEMA})

    async def run_async(self, payload: dict) -> object:
        return type("Response", (), {"text": '{"priority_score":0.6,"urgency":"medium","affected_population":"unknown","recommended_departments":["Municipal Services"],"estimated_response_minutes":120,"risk_level":"medium","prediction_reason":"Fallback heuristic applied due to unavailable model.","confidence":0.2}'})()


try:
    from google.adk.agents import Agent
except Exception:  # pragma: no cover
    Agent = _FallbackAgent  # type: ignore[assignment]


prediction_agent = Agent(
    name="prediction_agent",
    model=settings.gemini_flash_model,
    instruction="Predict incident spread, urgency, and response needs from the shared incident state.",
    generate_content_config={"response_mime_type": "application/json", "response_schema": PREDICTION_RESPONSE_SCHEMA},
)


async def predict_incident(state: IncidentState, retries: int = 0) -> IncidentState:
    """Predict spread and response needs using a structured output contract."""

    try:
        response = await prediction_agent.run_async({"state": state.model_dump()})
        parsed = PredictionOutput.model_validate_json(response.text)
        parsed_dict = parsed.model_dump()

        completeness = schema_completeness({
            "hazards_detected": state.hazards_detected,
            "visible_evidence": state.visible_evidence,
            "severity_reason": state.severity_reason,
            "issue_type_reason": state.issue_type_reason,
        })
        composite_confidence = compute_composite_confidence(parsed.confidence, 1.0, completeness)

        state.predicted_spread = {
            "priority_score": parsed.priority_score,
            "urgency": parsed.urgency,
            "affected_population": parsed.affected_population,
            "recommended_departments": parsed.recommended_departments,
            "estimated_response_minutes": parsed.estimated_response_minutes,
            "risk_level": parsed.risk_level,
            "prediction_reason": parsed.prediction_reason,
        }
        state.priority_score = parsed.priority_score
        state.priority = _priority_label(parsed.priority_score)
        state.prediction_confidence = round(composite_confidence, 2)

        state.log(
            agent="prediction_agent",
            output=parsed_dict,
            why=f"{parsed.prediction_reason} Composite confidence {state.prediction_confidence:.0%}.",
        )
    except Exception as exc:
        if retries < 1:
            logger.warning("Prediction agent retrying on incident %s after error: %s", state.incident_id, exc)
            return await predict_incident(state, retries + 1)

        logger.error("Prediction agent failed after retry on incident %s: %s", state.incident_id, exc)
        state.predicted_spread = _heuristic_prediction(state)
        state.priority = _priority_label(state.predicted_spread["priority_score"])
        state.prediction_confidence = 0.0
        state.log(
            agent="prediction_agent",
            output={"error": str(exc)},
            why="Prediction failed after retry; using deterministic heuristic fallback.",
        )

    return state


def _heuristic_prediction(state: IncidentState) -> dict:
    severity_score = {"low": 0.3, "medium": 0.5, "high": 0.75, "critical": 0.95}.get(state.severity or "low", 0.3)
    urgency_score = {"low": 0.3, "medium": 0.5, "high": 0.75, "immediate": 0.95}.get(state.urgency or "low", 0.3)
    location_bonus = 0.1 if state.lat is not None and state.lng is not None else 0.0
    vision_bonus = 0.1 if (state.vision_confidence or 0) > 0 else 0.0
    understanding_bonus = 0.1 if (state.understanding_confidence or 0) > 0 else 0.0
    priority_score = round(min(1.0, severity_score * 0.6 + urgency_score * 0.4 + location_bonus + vision_bonus + understanding_bonus), 2)
    risk_level = "critical" if priority_score >= 0.85 else "high" if priority_score >= 0.7 else "medium" if priority_score >= 0.4 else "low"
    if state.issue_type is None and state.severity is None and state.urgency is None:
        risk_level = "medium"
        priority_score = max(priority_score, 0.5)
    return {
        "priority_score": priority_score,
        "urgency": "immediate" if priority_score >= 0.85 else "high" if priority_score >= 0.7 else "medium" if priority_score >= 0.4 else "low",
        "affected_population": "unknown",
        "recommended_departments": ["Municipal Services"],
        "estimated_response_minutes": 120 if risk_level in {"high", "critical"} else 240,
        "risk_level": risk_level,
        "prediction_reason": "Deterministic heuristic applied because the model was unavailable.",
    }


def _priority_label(score: float) -> Optional[str]:
    if score >= 0.85:
        return "critical"
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"
