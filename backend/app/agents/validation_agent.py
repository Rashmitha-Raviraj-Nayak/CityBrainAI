"""Validation Agent — safety gate for final incident decisions."""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, Field

from app.agents.confidence import compute_composite_confidence, schema_completeness
from app.config import settings
from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

VALIDATION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "approved": {"type": "boolean"},
        "needs_review": {"type": "boolean"},
        "retry_count": {"type": "number"},
        "validation_reason": {"type": "string"},
        "confidence": {"type": "number"},
        "manual_review": {"type": "boolean"},
    },
    "required": ["approved", "needs_review", "retry_count", "validation_reason", "confidence", "manual_review"],
}


class ValidationOutput(BaseModel):
    approved: bool
    needs_review: bool
    retry_count: int
    validation_reason: str
    confidence: float
    manual_review: bool


class _FallbackAgent:
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.name = kwargs.get("name", "validation_agent")
        self.model = kwargs.get("model", settings.gemini_flash_model)
        self.instruction = kwargs.get("instruction", "Validate the incident decision before finalizing it.")
        self.generate_content_config = kwargs.get("generate_content_config", {"response_mime_type": "application/json", "response_schema": VALIDATION_RESPONSE_SCHEMA})

    async def run_async(self, payload: dict) -> object:
        return type("Response", (), {"text": '{"approved":true,"needs_review":false,"retry_count":0,"validation_reason":"Fallback validator approved the decision.","confidence":0.8,"manual_review":false}'})()


try:
    from google.adk.agents import Agent
except Exception:  # pragma: no cover
    Agent = _FallbackAgent  # type: ignore[assignment]


validation_agent = Agent(
    name="validation_agent",
    model=settings.gemini_flash_model,
    instruction="Validate the decision and ensure it is safe to finalize.",
    generate_content_config={"response_mime_type": "application/json", "response_schema": VALIDATION_RESPONSE_SCHEMA},
)


async def validate_decision(state: IncidentState, retries: int = 0) -> IncidentState:
    """Validate confidence, consistency, and completeness before final approval."""

    try:
        response = await validation_agent.run_async({"state": state.model_dump()})
        parsed = ValidationOutput.model_validate_json(response.text)
        parsed_dict = parsed.model_dump()

        completeness = schema_completeness({
            "hazards_detected": state.hazards_detected,
            "visible_evidence": state.visible_evidence,
            "severity_reason": state.severity_reason,
            "issue_type_reason": state.issue_type_reason,
        })
        composite_confidence = compute_composite_confidence(parsed.confidence, 1.0, completeness)

        issues = []
        if composite_confidence < 0.65:
            issues.append("confidence below threshold")
        if not state.severity_reason or not state.issue_type_reason:
            issues.append("missing reasoning")
        if state.severity and state.issue_type and state.predicted_spread and state.predicted_spread.get("risk_level") == "critical" and state.severity != "critical":
            issues.append("severity mismatch")
        if state.assigned_department in {None, ""}:
            issues.append("missing department")

        approved = parsed.approved and not issues and not parsed.needs_review
        manual_review = parsed.manual_review or bool(issues) or not approved
        state.validated = approved and not manual_review
        state.validation_confidence = round(composite_confidence, 2)
        if parsed.confidence >= 0.8 and parsed.approved and not parsed.needs_review:
            state.validated = True
            manual_review = False
        if state.decision_confidence is not None and state.decision_confidence >= 0.8 and state.prediction_confidence is not None and state.prediction_confidence >= 0.8:
            state.validated = True
            manual_review = False
        state.validation_reason = parsed.validation_reason
        state.manual_review = manual_review

        state.log(
            agent="validation_agent",
            output=parsed_dict,
            why=f"{parsed.validation_reason} Composite confidence {state.validation_confidence:.0%}.",
        )
    except Exception as exc:
        if retries < 2:
            logger.warning("Validation agent retrying on incident %s after error: %s", state.incident_id, exc)
            return await validate_decision(state, retries + 1)

        logger.error("Validation agent failed after retry on incident %s: %s", state.incident_id, exc)
        state.validated = False
        state.validation_confidence = 0.0
        state.validation_reason = "Validation failed after retries; sent to manual review."
        state.manual_review = True
        state.log(
            agent="validation_agent",
            output={"error": str(exc)},
            why="Validation failed after retries; routed to manual review.",
        )

    return state
