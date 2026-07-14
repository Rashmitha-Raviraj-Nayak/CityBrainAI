"""Main runtime composition for the CityBrain AI engine.

This module assembles the AI runtime from its core building blocks: memory, workflow,
explainability, validation, and the multi-agent engine. It serves as the primary
entrypoint for running the platform's decision intelligence workflows.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.engine import DecisionOutput, SignalInput
from app.agents.explainability import ExplainabilityEngine, Explanation
from app.agents.memory import SharedMemory
from app.agents.validation import DecisionValidator, ValidationResult
from app.agents.workflow import ComplaintWorkflow, WorkflowResult

logger = logging.getLogger("citybrain.agents.runtime")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class RuntimeDecision(BaseModel):
    """Final runtime output that combines decision, explanation, and validation."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    decision: DecisionOutput
    explanation: Explanation
    validation: ValidationResult
    workflow_result: WorkflowResult


class AgentRuntime:
    """Composes the AI runtime and exposes a simple execution interface."""

    def __init__(
        self,
        memory: SharedMemory | None = None,
        explainability_engine: ExplainabilityEngine | None = None,
        validator: DecisionValidator | None = None,
    ) -> None:
        self.memory = memory or SharedMemory()
        self.explainability_engine = explainability_engine or ExplainabilityEngine()
        self.validator = validator or DecisionValidator()
        self.workflow = ComplaintWorkflow(memory=self.memory)

    def run(self, signal: SignalInput, workflow_id: str | None = None) -> RuntimeDecision:
        """Run a complete workflow and return a runtime decision payload."""

        workflow_result = self.workflow.execute(signal, workflow_id=workflow_id)
        decision = workflow_result.decision

        context: dict[str, Any] = {
            "signal_title": decision.signal_title,
            "risk_level": decision.risk_level.value,
            "department": decision.department,
            "recommended_action": decision.recommended_action,
            "confidence": decision.confidence,
            "location": signal.location,
        }

        explanation = self.explainability_engine.build_explanation(context)
        validation = self.validator.validate(decision.model_dump())

        logger.info(
            "Runtime decision completed",
            extra={"workflow_id": workflow_result.workflow_id, "valid": validation.is_valid},
        )

        return RuntimeDecision(
            workflow_id=workflow_result.workflow_id,
            decision=decision,
            explanation=explanation,
            validation=validation,
            workflow_result=workflow_result,
        )
