"""Prediction agent for CityBrain OS.

The Prediction Agent transforms structured civic understanding into explainable
predictive risk intelligence. It never assigns departments or prepares officer
summaries; those responsibilities belong to downstream agents.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.tools import GeminiTool, Tool as ToolContract, ToolResult
from app.runtime.runtime import AgentResult, RuntimeContext, RuntimeStatus

logger = logging.getLogger("citybrain.agents.prediction")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class PredictionInput(BaseModel):
    """Typed input structure for the prediction stage."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., min_length=5, description="Normalized issue description")
    category: str = Field(..., description="Issue category from the understanding stage")
    infrastructure: str = Field(..., description="Affected infrastructure from the understanding stage")
    location: str | None = Field(default=None, description="Optional location hint")
    entities: list[dict[str, Any]] = Field(default_factory=list, description="Extracted entities")
    missing_information: list[str] = Field(default_factory=list, description="Information gaps")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Understanding confidence")


class PredictionOutput(BaseModel):
    """Structured predictive intelligence returned by the prediction agent."""

    model_config = ConfigDict(extra="forbid")

    predicted_risk_level: str
    risk_score: int = Field(ge=0, le=100)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    contributing_factors: list[str] = Field(default_factory=list)
    predicted_issue_category: str
    time_horizon: str
    explainable_reasoning: str
    data_limitations: list[str] = Field(default_factory=list)
    recommended_next_action: str


class PredictionAgent:
    """Generate explainable civic risk predictions from structured understanding."""

    def __init__(self, tool: ToolContract | None = None, logger_instance: logging.Logger | None = None) -> None:
        self.name = "prediction"
        self._tool = tool or GeminiTool()
        self._logger = logger_instance or logger

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the prediction workflow against the runtime context."""

        self._logger.info(
            "Prediction agent started",
            extra={"execution_id": context.execution_id, "workflow_name": context.workflow_name},
        )

        try:
            request = self._parse_context(context)
            prediction = self._build_prediction(request)
            tool_result = self._invoke_tool(request, prediction)
            if tool_result.success and tool_result.data.get("response"):
                prediction.explainable_reasoning = str(tool_result.data["response"]).strip()
                prediction.confidence = min(0.99, prediction.confidence + 0.03)
            self._logger.info(
                "Prediction agent completed",
                extra={"execution_id": context.execution_id, "risk_score": prediction.risk_score},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=prediction.explainable_reasoning,
                confidence=prediction.confidence,
                details=prediction.model_dump(),
            )
        except Exception as exc:  # pragma: no cover - defensive branch for runtime robustness
            self._logger.exception(
                "Prediction agent failed",
                extra={"execution_id": context.execution_id, "error": str(exc)},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Prediction analysis failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )

    def _parse_context(self, context: RuntimeContext) -> PredictionInput:
        """Extract structured input from the runtime context."""

        if not isinstance(context.input_data, dict):
            raise ValueError("Runtime context input_data must be a dictionary")

        understanding_payload = context.input_data.get("understanding")
        if isinstance(understanding_payload, dict):
            payload = understanding_payload
        else:
            payload = context.input_data.get("signal") if isinstance(context.input_data.get("signal"), dict) else context.input_data

        if not isinstance(payload, dict):
            raise ValueError("Prediction input must be a dictionary")

        description = payload.get("description") or payload.get("title") or ""
        if not isinstance(description, str) or not description.strip():
            raise ValueError("A non-empty description is required")

        category = payload.get("category") if isinstance(payload.get("category"), str) else "public_service"
        infrastructure = payload.get("infrastructure") if isinstance(payload.get("infrastructure"), str) else "public_service_assets"
        location = payload.get("location") if isinstance(payload.get("location"), str) else None
        entities = payload.get("entities") if isinstance(payload.get("entities"), list) else []
        missing_information = payload.get("missing_information") if isinstance(payload.get("missing_information"), list) else []
        confidence = payload.get("confidence") if isinstance(payload.get("confidence"), (int, float)) else 0.0

        return PredictionInput(
            description=str(description).strip(),
            category=category,
            infrastructure=infrastructure,
            location=location,
            entities=[{"entity_type": str(item.get("entity_type", "unknown")), "value": str(item.get("value", "")), "confidence": float(item.get("confidence", 0.0))} for item in entities if isinstance(item, dict)],
            missing_information=[str(item) for item in missing_information],
            confidence=float(confidence),
        )

    def _build_prediction(self, request: PredictionInput) -> PredictionOutput:
        """Construct a typed prediction from the normalized request."""

        risk_score = self._score_risk(request)
        risk_level = self._classify_risk(risk_score)
        factors = self._find_contributing_factors(request)
        time_horizon = self._derive_time_horizon(risk_score)
        recommended_action = self._derive_next_action(request, risk_score)
        data_limitations = self._derive_data_limitations(request)
        confidence = round(min(0.99, 0.55 + (request.confidence * 0.3) + (0.02 * len(factors))), 3)

        return PredictionOutput(
            predicted_risk_level=risk_level,
            risk_score=risk_score,
            confidence=confidence,
            contributing_factors=factors,
            predicted_issue_category=request.category,
            time_horizon=time_horizon,
            explainable_reasoning=self._build_reasoning(request, risk_score, factors),
            data_limitations=data_limitations,
            recommended_next_action=recommended_action,
        )

    def _score_risk(self, request: PredictionInput) -> int:
        """Score the issue risk on a 0-100 scale."""

        score = 35
        if request.category in {"environment", "safety", "infrastructure"}:
            score += 20
        if "drain" in request.description.lower() or "flood" in request.description.lower():
            score += 15
        if request.location:
            score += 10
        if request.entities:
            score += 8
        if request.missing_information:
            score -= 5
        return max(0, min(100, score))

    def _classify_risk(self, risk_score: int) -> str:
        """Map a numeric score to a human-readable risk level."""

        if risk_score >= 80:
            return "critical"
        if risk_score >= 60:
            return "high"
        if risk_score >= 35:
            return "moderate"
        return "low"

    def _find_contributing_factors(self, request: PredictionInput) -> list[str]:
        """Identify the primary factors driving the risk estimate."""

        factors: list[str] = []
        if request.category in {"environment", "safety"}:
            factors.append("hazard_category")
        if "water" in request.description.lower() or "flood" in request.description.lower():
            factors.append("water_accumulation")
        if request.location:
            factors.append("known_location")
        if request.entities:
            factors.append("entity_evidence")
        if request.missing_information:
            factors.append("incomplete_context")
        return factors

    def _derive_time_horizon(self, risk_score: int) -> str:
        """Estimate whether the issue is likely to evolve quickly."""

        if risk_score >= 80:
            return "24 hours"
        if risk_score >= 60:
            return "7 days"
        if risk_score >= 35:
            return "14 days"
        return "30 days"

    def _derive_next_action(self, request: PredictionInput, risk_score: int) -> str:
        """Recommend the next operational action without assigning a department."""

        if risk_score >= 80:
            return "Escalate monitoring and prepare an immediate field response plan."
        if risk_score >= 60:
            return "Increase surveillance and collect additional field observations."
        return "Continue monitoring and validate the report with follow-up checks."

    def _derive_data_limitations(self, request: PredictionInput) -> list[str]:
        """Describe the data gaps that may affect the prediction."""

        limitations: list[str] = []
        if request.missing_information:
            limitations.append("missing_context")
        if not request.location:
            limitations.append("missing_location")
        if not request.entities:
            limitations.append("limited_entity_evidence")
        return limitations

    def _build_reasoning(self, request: PredictionInput, risk_score: int, factors: list[str]) -> str:
        """Compose a human-readable explanation for downstream agents."""

        return (
            f"The issue was assessed as {self._classify_risk(risk_score)} risk with a score of {risk_score}/100. "
            f"Contributing factors: {', '.join(factors) if factors else 'none'}. "
            f"The prediction is based on the issue category, infrastructure type, and available contextual evidence."
        )

    def _invoke_tool(self, request: PredictionInput, prediction: PredictionOutput) -> ToolResult:
        """Delegate the explanatory summary to the tool layer without calling an AI provider directly."""

        prompt = (
            "You are a civic risk analyst. Produce one concise sentence explaining the risk prediction. "
            f"Issue: {request.description}. Category: {request.category}. Infrastructure: {request.infrastructure}. "
            f"Risk score: {prediction.risk_score}."
        )
        tool_payload = {"prompt": prompt, "context": request.model_dump()}
        return self._tool.execute(tool_payload)
