"""Decision agent for CityBrain OS.

The Decision Agent converts predictive risk intelligence into structured operational
recommendations. It is responsible for prioritization and intervention strategy,
but it does not execute actions or notify departments.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.tools import GeminiTool, Tool as ToolContract, ToolResult
from app.runtime.runtime import AgentResult, RuntimeContext, RuntimeStatus

logger = logging.getLogger("citybrain.agents.decision")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class DecisionInput(BaseModel):
    """Typed input structure for the decision stage."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., min_length=5, description="Normalized issue description")
    category: str = Field(..., description="Issue category from understanding")
    infrastructure: str = Field(..., description="Affected infrastructure from understanding")
    location: str | None = Field(default=None, description="Optional location hint")
    risk_level: str = Field(..., description="Risk level from the prediction stage")
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from the prediction stage")
    contributing_factors: list[str] = Field(default_factory=list, description="Factors driving the prediction")
    time_horizon: str = Field(..., description="Predicted time horizon")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Prediction confidence")
    data_limitations: list[str] = Field(default_factory=list, description="Known data gaps")
    policy_context: dict[str, Any] = Field(default_factory=dict, description="Optional policy context")


class DecisionOutput(BaseModel):
    """Structured operational decision returned by the decision agent."""

    model_config = ConfigDict(extra="forbid")

    decision_id: str
    intervention_priority: str
    recommended_departments: list[str] = Field(default_factory=list)
    urgency_level: str
    recommended_actions: list[str] = Field(default_factory=list)
    estimated_resource_type: str
    reasoning: str
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    assumptions: list[str] = Field(default_factory=list)
    review_required: bool = Field(default=False)


class DecisionAgent:
    """Translate predictive risk intelligence into structured operational decisions."""

    def __init__(self, tool: ToolContract | None = None, logger_instance: logging.Logger | None = None) -> None:
        self.name = "decision"
        self._tool = tool or GeminiTool()
        self._logger = logger_instance or logger

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the decision workflow against the runtime context."""

        self._logger.info(
            "Decision agent started",
            extra={"execution_id": context.execution_id, "workflow_name": context.workflow_name},
        )

        try:
            request = self._parse_context(context)
            decision = self._build_decision(request)
            tool_result = self._invoke_tool(request, decision)
            if tool_result.success and tool_result.data.get("response"):
                decision.reasoning = str(tool_result.data["response"]).strip()
                decision.confidence_score = min(0.99, decision.confidence_score + 0.02)
            self._logger.info(
                "Decision agent completed",
                extra={"execution_id": context.execution_id, "priority": decision.intervention_priority},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=decision.reasoning,
                confidence=decision.confidence_score,
                details=decision.model_dump(),
            )
        except Exception as exc:  # pragma: no cover - defensive branch for runtime robustness
            self._logger.exception(
                "Decision agent failed",
                extra={"execution_id": context.execution_id, "error": str(exc)},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Decision analysis failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )

    def _parse_context(self, context: RuntimeContext) -> DecisionInput:
        """Extract and validate the decision input from the runtime context."""

        if not isinstance(context.input_data, dict):
            raise ValueError("Runtime context input_data must be a dictionary")

        prediction_payload = context.input_data.get("prediction")
        if isinstance(prediction_payload, dict):
            prediction = prediction_payload
        else:
            prediction = context.input_data.get("understanding") if isinstance(context.input_data.get("understanding"), dict) else context.input_data

        if not isinstance(prediction, dict):
            raise ValueError("Decision input must be a dictionary")

        description = prediction.get("description") or prediction.get("title") or ""
        if not isinstance(description, str) or not description.strip():
            raise ValueError("A non-empty description is required")

        category = prediction.get("category") if isinstance(prediction.get("category"), str) else "public_service"
        infrastructure = prediction.get("infrastructure") if isinstance(prediction.get("infrastructure"), str) else "public_service_assets"
        location = prediction.get("location") if isinstance(prediction.get("location"), str) else None
        risk_level = prediction.get("predicted_risk_level") if isinstance(prediction.get("predicted_risk_level"), str) else "moderate"
        risk_score = prediction.get("risk_score") if isinstance(prediction.get("risk_score"), (int, float)) else 50
        contributing_factors = prediction.get("contributing_factors") if isinstance(prediction.get("contributing_factors"), list) else []
        time_horizon = prediction.get("time_horizon") if isinstance(prediction.get("time_horizon"), str) else "7 days"
        confidence = prediction.get("confidence") if isinstance(prediction.get("confidence"), (int, float)) else 0.5
        data_limitations = prediction.get("data_limitations") if isinstance(prediction.get("data_limitations"), list) else []
        policy_context = context.input_data.get("policy_context") if isinstance(context.input_data.get("policy_context"), dict) else {}

        return DecisionInput(
            description=str(description).strip(),
            category=category,
            infrastructure=infrastructure,
            location=location,
            risk_level=risk_level,
            risk_score=int(risk_score),
            contributing_factors=[str(item) for item in contributing_factors],
            time_horizon=time_horizon,
            confidence=float(confidence),
            data_limitations=[str(item) for item in data_limitations],
            policy_context=policy_context,
        )

    def _build_decision(self, request: DecisionInput) -> DecisionOutput:
        """Construct a typed operational decision from the prediction context."""

        priority = self._derive_priority(request)
        departments = self._derive_departments(request)
        urgency = self._derive_urgency(request)
        actions = self._derive_actions(request)
        resource_type = self._derive_resource_type(request)
        review_required = request.risk_score >= 80 or bool(request.data_limitations)
        assumptions = self._derive_assumptions(request)
        reasoning = self._build_reasoning(request, priority, urgency, departments)

        return DecisionOutput(
            decision_id=f"decision-{abs(hash(request.description)) % 100000:05d}",
            intervention_priority=priority,
            recommended_departments=departments,
            urgency_level=urgency,
            recommended_actions=actions,
            estimated_resource_type=resource_type,
            reasoning=reasoning,
            confidence_score=round(min(0.99, 0.6 + (request.confidence * 0.25) + (0.03 if request.risk_score >= 70 else 0.0)), 3),
            assumptions=assumptions,
            review_required=review_required,
        )

    def _derive_priority(self, request: DecisionInput) -> str:
        """Determine the intervention priority from the prediction signal."""

        if request.risk_score >= 80:
            return "critical"
        if request.risk_score >= 60:
            return "high"
        if request.risk_score >= 35:
            return "medium"
        return "low"

    def _derive_departments(self, request: DecisionInput) -> list[str]:
        """Recommend departments without turning the decision into a notification payload."""

        if request.category == "safety":
            return ["Emergency Management", "Public Works"]
        if request.category == "environment":
            return ["Environmental Services", "Public Works"]
        if request.category == "infrastructure":
            return ["Public Works", "Utilities"]
        return ["Municipal Services"]

    def _derive_urgency(self, request: DecisionInput) -> str:
        """Translate the prediction into an urgency level."""

        if request.risk_score >= 80:
            return "immediate"
        if request.risk_score >= 60:
            return "high"
        if request.risk_score >= 35:
            return "moderate"
        return "routine"

    def _derive_actions(self, request: DecisionInput) -> list[str]:
        """Create actionable response steps for downstream agents."""

        actions: list[str] = []
        if request.risk_score >= 80:
            actions.append("activate_emergency_monitoring")
        if request.category in {"environment", "safety"}:
            actions.append("deploy_field_assessment")
        if request.infrastructure:
            actions.append("inspect_relevant_infrastructure")
        actions.append("record_observations_for_follow_up")
        return actions

    def _derive_resource_type(self, request: DecisionInput) -> str:
        """Estimate the resource class required for the operational response."""

        if request.risk_score >= 80:
            return "rapid_response_team"
        if request.category == "safety":
            return "safety_inspection_team"
        if request.category == "environment":
            return "field_operations_unit"
        return "standard_inspection_team"

    def _derive_assumptions(self, request: DecisionInput) -> list[str]:
        """Capture assumptions that may affect the decision."""

        assumptions: list[str] = []
        if not request.location:
            assumptions.append("location_is_inferred")
        if request.data_limitations:
            assumptions.append("limited_observability")
        if request.risk_score >= 70:
            assumptions.append("escalation_threshold_reached")
        return assumptions

    def _build_reasoning(self, request: DecisionInput, priority: str, urgency: str, departments: list[str]) -> str:
        """Compose a concise human-readable explanation for the decision."""

        return (
            f"The decision prioritizes {priority} intervention because the predicted risk is {request.risk_level} "
            f"with a score of {request.risk_score}/100 over a {request.time_horizon} horizon. "
            f"Recommended departments: {', '.join(departments)}. Urgency: {urgency}."
        )

    def _invoke_tool(self, request: DecisionInput, decision: DecisionOutput) -> ToolResult:
        """Delegate explanation refinement to the tool layer without calling an AI provider directly."""

        prompt = (
            "You are a civic operations decision analyst. Produce one concise sentence summarizing this decision. "
            f"Issue: {request.description}. Priority: {decision.intervention_priority}. "
            f"Urgency: {decision.urgency_level}."
        )
        tool_payload = {"prompt": prompt, "context": request.model_dump()}
        return self._tool.execute(tool_payload)
