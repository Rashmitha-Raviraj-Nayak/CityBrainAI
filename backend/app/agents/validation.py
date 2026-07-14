"""Validation and quality control for the CityBrain AI runtime.

This module ensures that agent outputs and workflow decisions meet minimum quality
standards before being surfaced to downstream systems. It is designed to be
reusable, typed, and independent of any UI or API layer.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.runtime.runtime import AgentResult, RuntimeContext, RuntimeStatus

logger = logging.getLogger("citybrain.agents.validation")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class ValidationIssue(BaseModel):
    """A single validation problem discovered in a decision payload."""

    model_config = ConfigDict(extra="forbid")

    field: str
    message: str


class ValidationResult(BaseModel):
    """The outcome of validating a workflow decision."""

    model_config = ConfigDict(extra="forbid")

    is_valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
    score: float = Field(ge=0.0, le=1.0)


class DecisionValidator:
    """Validates the structure, completeness, and confidence of a decision."""

    def validate(self, payload: dict[str, Any]) -> ValidationResult:
        """Return a validation result for a decision payload."""

        issues: list[ValidationIssue] = []

        required_fields = ["workflow_id", "signal_title", "risk_level", "department", "recommended_action", "explanation"]
        for field in required_fields:
            if not payload.get(field):
                issues.append(ValidationIssue(field=field, message="Field is missing or empty."))

        confidence = float(payload.get("confidence", 0.0))
        if confidence < 0.5:
            issues.append(ValidationIssue(field="confidence", message="Confidence is below the minimum threshold."))

        raw_risk_level = payload.get("risk_level", "")
        if hasattr(raw_risk_level, "value"):
            risk_level = str(raw_risk_level.value).lower()
        else:
            risk_level = str(raw_risk_level).lower()
        if risk_level not in {"low", "medium", "high", "critical"}:
            issues.append(ValidationIssue(field="risk_level", message="Risk level is not recognized."))

        score = max(0.0, min(1.0, 1.0 - (len(issues) * 0.2)))
        return ValidationResult(is_valid=len(issues) == 0, issues=issues, score=score)


class ValidationAgent:
    """Validate a decision and decide whether it should be approved or escalated."""

    def __init__(self, logger_instance: logging.Logger | None = None) -> None:
        self.name = "validation"
        self._logger = logger_instance or logger

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Validate the current decision confidence and completeness."""

        self._logger.info("Validation agent started", extra={"execution_id": context.execution_id})
        try:
            decision_confidence = float(context.state.get("decision_confidence", 0.0))
            decision_payload = context.input_data.get("decision") if isinstance(context.input_data.get("decision"), dict) else {}
            review_required = decision_confidence < 0.65 or bool(decision_payload.get("review_required"))
            validated = not review_required

            details: dict[str, Any] = {
                "validated": validated,
                "review_required": review_required,
                "decision_confidence": decision_confidence,
                "reason": "Decision confidence exceeds the validation threshold." if validated else "Decision confidence is below the validation threshold.",
            }

            if not validated:
                context.state["manual_review"] = True

            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=details["reason"],
                confidence=0.85 if validated else 0.45,
                details=details,
            )
        except Exception as exc:  # pragma: no cover - defensive logging path
            self._logger.exception("Validation agent failed", extra={"execution_id": context.execution_id, "error": str(exc)})
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Validation failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )
