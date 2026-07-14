"""Decision Agent — turns predictions into a routed operational decision."""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, Field

from app.agents.confidence import compute_composite_confidence, schema_completeness
from app.config import settings
from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

DECISION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "departments": {"type": "array", "items": {"type": "string"}},
        "emergency_level": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
        "sla_minutes": {"type": "number"},
        "resources": {"type": "array", "items": {"type": "string"}},
        "citizen_message": {"type": "string"},
        "internal_message": {"type": "string"},
        "decision_reason": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": ["departments", "emergency_level", "sla_minutes", "resources", "citizen_message", "internal_message", "decision_reason", "confidence"],
}


class DecisionOutput(BaseModel):
    departments: list[str] = Field(default_factory=list)
    emergency_level: str
    sla_minutes: int
    resources: list[str] = Field(default_factory=list)
    citizen_message: str
    internal_message: str
    decision_reason: str
    confidence: float


class _FallbackAgent:
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.name = kwargs.get("name", "decision_agent")
        self.model = kwargs.get("model", settings.gemini_flash_model)
        self.instruction = kwargs.get("instruction", "Make a routing decision from the shared incident state.")
        self.generate_content_config = kwargs.get("generate_content_config", {"response_mime_type": "application/json", "response_schema": DECISION_RESPONSE_SCHEMA})

    async def run_async(self, payload: dict) -> object:
        return type("Response", (), {"text": '{"departments":["Municipal Services"],"emergency_level":"low","sla_minutes":180,"resources":["standard_inspection_team"],"citizen_message":"Your report is being reviewed.","internal_message":"Continue monitoring.","decision_reason":"Fallback heuristic applied due to unavailable model.","confidence":0.2}'})()


try:
    from google.adk.agents import Agent
except Exception:  # pragma: no cover
    Agent = _FallbackAgent  # type: ignore[assignment]


decision_agent = Agent(
    name="decision_agent",
    model=settings.gemini_flash_model,
    instruction="Convert the incident analysis into a routing and response decision.",
    generate_content_config={"response_mime_type": "application/json", "response_schema": DECISION_RESPONSE_SCHEMA},
)


async def decide_incident(state: IncidentState, retries: int = 0) -> IncidentState:
    """Make the final routing decision for the incident."""

    if not state.predicted_spread:
        state.predicted_spread = {
            "priority_score": 0.4,
            "urgency": "medium",
            "affected_population": "unknown",
            "recommended_departments": ["Municipal Services"],
            "estimated_response_minutes": 240,
            "risk_level": "medium",
            "prediction_reason": "No prediction output available; defaulting to a cautious routing decision.",
        }

    try:
        response = await decision_agent.run_async({"state": state.model_dump()})
        parsed = DecisionOutput.model_validate_json(response.text)
        parsed_dict = parsed.model_dump()

        completeness = schema_completeness({
            "hazards_detected": state.hazards_detected,
            "visible_evidence": state.visible_evidence,
            "severity_reason": state.severity_reason,
            "issue_type_reason": state.issue_type_reason,
        })
        composite_confidence = compute_composite_confidence(parsed.confidence, 1.0, completeness)

        state.assigned_department = parsed.departments[0] if parsed.departments else "Municipal Services"
        state.priority = _priority_label(parsed.emergency_level, parsed.confidence)
        state.decision_confidence = round(composite_confidence, 2)
        state.validated = False
        if state.decision_confidence >= 0.65:
            state.validated = True

        state.log(
            agent="decision_agent",
            output=parsed_dict,
            why=f"{parsed.decision_reason} Composite confidence {state.decision_confidence:.0%}.",
        )
    except Exception as exc:
        if retries < 1:
            logger.warning("Decision agent retrying on incident %s after error: %s", state.incident_id, exc)
            return await decide_incident(state, retries + 1)

        logger.error("Decision agent failed after retry on incident %s: %s", state.incident_id, exc)
        state.assigned_department = "Municipal Services"
        state.priority = "medium"
        state.decision_confidence = 0.0
        state.validated = False
        state.log(
            agent="decision_agent",
            output={"error": str(exc)},
            why="Decision failed after retry; falling back to default routing.",
        )

    return state


def _priority_label(emergency_level: str, confidence: float) -> Optional[str]:
    if confidence < 0.35:
        return "low"
    if emergency_level in {"critical", "high"}:
        return "high"
    if emergency_level == "medium":
        return "medium"
    return "low"
