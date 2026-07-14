"""Production-ready multi-agent decision engine for CityBrain AI.

This module provides a reusable orchestration layer for civic intelligence workflows.
It is designed to be independently testable from Python and to later integrate with
Google ADK and Gemini-based implementations without changing the public contracts.
"""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator

logger = logging.getLogger("citybrain.agents.engine")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class AgentStatus(str, Enum):
    """States reported by agents during execution."""

    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class SignalCategory(str, Enum):
    """Supported signal categories for civic intelligence workflows."""

    INFRASTRUCTURE = "infrastructure"
    TRANSPORT = "transport"
    SAFETY = "safety"
    ENVIRONMENT = "environment"
    PUBLIC_SERVICE = "public_service"


class RiskLevel(str, Enum):
    """Risk levels produced by the prediction stage."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SignalInput(BaseModel):
    """Structured civic signal received for analysis."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, description="Short title of the civic signal.")
    description: str = Field(..., min_length=10, description="Detailed description of the reported issue.")
    category: SignalCategory = Field(..., description="Category of the civic signal.")
    location: str = Field(..., description="Location or area associated with the signal.")
    source: str = Field(default="citizen_report", description="Origin of the signal.")
    severity_hint: int = Field(default=0, ge=0, le=10, description="Optional severity hint from the source.")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional contextual metadata.")

    @field_validator("title", "description")
    @classmethod
    def validate_text(cls, value: str) -> str:
        """Trim surrounding whitespace from user-facing text."""

        return value.strip()


class AgentOutput(BaseModel):
    """Structured output emitted by any agent in the workflow."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str
    status: AgentStatus
    summary: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    details: dict[str, Any] = Field(default_factory=dict)


class DecisionOutput(BaseModel):
    """Final decision payload produced by the multi-agent engine."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    signal_title: str
    risk_level: RiskLevel
    risk_score: float = Field(ge=0.0, le=1.0)
    department: str
    recommended_action: str
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0)
    officer_brief: str
    agent_results: list[AgentOutput]


@dataclass(slots=True)
class AgentContext:
    """Context passed into each agent during execution."""

    workflow_id: str
    signal: SignalInput


class AgentProtocol(Protocol):
    """Protocol for agents participating in the orchestration pipeline."""

    name: str

    def run(self, context: AgentContext) -> AgentOutput:
        """Execute the agent against the provided context."""


class BaseAgent(ABC):
    """Abstract base class that standardizes agent behavior."""

    def __init__(self, name: str) -> None:
        self.name = name

    def execute(self, context: AgentContext) -> AgentOutput:
        """Execute the agent with uniform logging and error handling."""

        try:
            logger.info("Starting agent execution", extra={"agent": self.name, "workflow_id": context.workflow_id})
            result = self.run(context)
            logger.info(
                "Agent execution completed",
                extra={"agent": self.name, "workflow_id": context.workflow_id, "status": result.status.value},
            )
            return result
        except Exception as exc:  # pragma: no cover - defensive logging path
            logger.exception(
                "Agent execution failed",
                extra={"agent": self.name, "workflow_id": context.workflow_id, "error": str(exc)},
            )
            return AgentOutput(
                agent_name=self.name,
                status=AgentStatus.FAILED,
                summary="Agent execution failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )

    @abstractmethod
    def run(self, context: AgentContext) -> AgentOutput:
        """Implement the agent's concrete behavior."""


class SignalIntakeAgent(BaseAgent):
    """Extracts and normalizes civic signals for downstream processing."""

    def __init__(self) -> None:
        super().__init__("signal_intake")

    def run(self, context: AgentContext) -> AgentOutput:
        """Create a normalized signal summary for downstream agents."""

        signal = context.signal
        summary = f"Received {signal.category.value} signal from {signal.source}: {signal.title}"
        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=summary,
            confidence=0.95,
            details={
                "category": signal.category.value,
                "location": signal.location,
                "severity_hint": signal.severity_hint,
            },
        )


class UnderstandingAgent(BaseAgent):
    """Classifies the issue and extracts the operational context."""

    def __init__(self) -> None:
        super().__init__("understanding")

    def run(self, context: AgentContext) -> AgentOutput:
        """Infer the most likely issue type and operational intent."""

        signal = context.signal
        issue_type = "service_failure" if "break" in signal.description.lower() else "operational_issue"
        details = {
            "issue_type": issue_type,
            "keywords": [token for token in signal.description.lower().split() if len(token) > 4][:8],
        }
        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=f"Classified the issue as {issue_type} with civic operations context.",
            confidence=0.9,
            details=details,
        )


class PredictionAgent(BaseAgent):
    """Predicts risk severity and urgency from the current signal."""

    def __init__(self) -> None:
        super().__init__("prediction")

    def run(self, context: AgentContext) -> AgentOutput:
        """Score the signal's likely severity and impact."""

        signal = context.signal
        severity_score = min(1.0, 0.25 + (signal.severity_hint / 10.0) + 0.15)
        if "flood" in signal.description.lower() or "drain" in signal.description.lower():
            severity_score = min(1.0, severity_score + 0.2)
        if severity_score >= 0.85:
            risk_level = RiskLevel.CRITICAL
        elif severity_score >= 0.6:
            risk_level = RiskLevel.HIGH
        elif severity_score >= 0.35:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=f"Predicted {risk_level.value} risk based on severity and contextual indicators.",
            confidence=0.88,
            details={
                "risk_level": risk_level.value,
                "risk_score": round(severity_score, 3),
            },
        )


class DecisionAgent(BaseAgent):
    """Selects the most appropriate department and action for the signal."""

    def __init__(self) -> None:
        super().__init__("decision")

    def run(self, context: AgentContext) -> AgentOutput:
        """Generate a department recommendation and intervention action."""

        signal = context.signal
        if signal.category == SignalCategory.INFRASTRUCTURE:
            department = "Public Works"
            action = "Dispatch inspection and assess structural or utility risk."
        elif signal.category == SignalCategory.TRANSPORT:
            department = "Transport Operations"
            action = "Review traffic flow and deploy temporary safety controls."
        elif signal.category == SignalCategory.SAFETY:
            department = "Emergency Management"
            action = "Escalate to safety response and secure the location."
        elif signal.category == SignalCategory.ENVIRONMENT:
            department = "Environmental Services"
            action = "Coordinate environmental mitigation and monitoring."
        else:
            department = "Municipal Services"
            action = "Assign a field team for follow-up review."

        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=f"Recommended the {department} department for intervention.",
            confidence=0.92,
            details={
                "department": department,
                "recommended_action": action,
            },
        )


class OfficerCopilotAgent(BaseAgent):
    """Produces an officer-facing summary for rapid review and action."""

    def __init__(self) -> None:
        super().__init__("officer_copilot")

    def run(self, context: AgentContext) -> AgentOutput:
        """Create a concise executive brief for officers."""

        signal = context.signal
        brief = (
            f"Officer brief for {signal.location}: {signal.title}. "
            f"Review the issue promptly, verify the reported conditions on site, and coordinate with the recommended department."
        )
        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=brief,
            confidence=0.9,
            details={"location": signal.location},
        )


class SupervisorAgent(BaseAgent):
    """Coordinates the multi-agent pipeline and composes the final output."""

    def __init__(self, agents: list[BaseAgent] | None = None) -> None:
        super().__init__("supervisor")
        self._agents = agents or [
            SignalIntakeAgent(),
            UnderstandingAgent(),
            PredictionAgent(),
            DecisionAgent(),
            OfficerCopilotAgent(),
        ]

    def run(self, context: AgentContext) -> AgentOutput:
        """Orchestrate the downstream agents and summarize the workflow."""

        outputs: list[AgentOutput] = []
        for agent in self._agents:
            result = agent.execute(context)
            outputs.append(result)

        summary = "Multi-agent review completed successfully."
        return AgentOutput(
            agent_name=self.name,
            status=AgentStatus.SUCCESS,
            summary=summary,
            confidence=0.93,
            details={"agent_count": len(outputs)},
        )


class MultiAgentEngine:
    """Main entrypoint for coordinating a full civic intelligence workflow."""

    def __init__(self, supervisor: SupervisorAgent | None = None) -> None:
        self._supervisor = supervisor or SupervisorAgent()

    def run(self, signal: SignalInput, workflow_id: str | None = None) -> DecisionOutput:
        """Run the full multi-agent workflow and return a structured decision payload."""

        execution_id = workflow_id or str(uuid.uuid4())
        context = AgentContext(workflow_id=execution_id, signal=signal)

        logger.info("Starting multi-agent workflow", extra={"workflow_id": execution_id, "signal_title": signal.title})

        agent_results: list[AgentOutput] = []
        for agent in self._supervisor._agents:  # type: ignore[attr-defined]
            result = agent.execute(context)
            agent_results.append(result)

        prediction_result = next((item for item in agent_results if item.agent_name == "prediction"), None)
        decision_result = next((item for item in agent_results if item.agent_name == "decision"), None)
        officer_result = next((item for item in agent_results if item.agent_name == "officer_copilot"), None)

        if prediction_result is None or decision_result is None or officer_result is None:
            raise RuntimeError("Required agents did not produce results.")

        prediction_details = prediction_result.details
        decision_details = decision_result.details
        risk_level = RiskLevel(prediction_details.get("risk_level", RiskLevel.MEDIUM.value))
        risk_score = float(prediction_details.get("risk_score", 0.5))
        department = str(decision_details.get("department", "Municipal Services"))
        recommended_action = str(decision_details.get("recommended_action", "Assign a review team."))
        explanation = (
            f"The workflow identified a {risk_level.value} risk based on the reported signal, severity context, "
            f"and departmental routing logic."
        )

        officer_brief = str(officer_result.summary)
        output = DecisionOutput(
            workflow_id=execution_id,
            signal_title=signal.title,
            risk_level=risk_level,
            risk_score=risk_score,
            department=department,
            recommended_action=recommended_action,
            explanation=explanation,
            confidence=round(min(0.99, 0.75 + (risk_score * 0.2)), 3),
            officer_brief=officer_brief,
            agent_results=agent_results,
        )

        logger.info(
            "Completed multi-agent workflow",
            extra={"workflow_id": execution_id, "risk_level": risk_level.value, "department": department},
        )
        return output


if __name__ == "__main__":
    sample_signal = SignalInput(
        title="Blocked drainage outlet near main road",
        description="Heavy rain caused water to pool near a public road and drainage outlet is blocked.",
        category=SignalCategory.INFRASTRUCTURE,
        location="Downtown District",
        severity_hint=8,
        metadata={"reported_by": "citizen"},
    )
    engine = MultiAgentEngine()
    result = engine.run(sample_signal)
    print(result.model_dump_json(indent=2))
