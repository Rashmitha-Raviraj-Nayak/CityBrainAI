"""Workflow orchestration for the CityBrain AI runtime.

This module defines reusable workflow pipelines that coordinate agents, memory, and
reasoning steps. It stays independent of UI and API layers so it can be reused by
tests, future FastAPI endpoints, and later ADK-based deployments.
"""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.engine import (
    AgentContext,
    DecisionOutput,
    MultiAgentEngine,
    SignalInput,
)
from app.agents.memory import SharedMemory

logger = logging.getLogger("citybrain.agents.workflow")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class WorkflowResult(BaseModel):
    """Structured output for a completed workflow."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    status: str
    decision: DecisionOutput
    memory_snapshot: dict[str, Any]


class Workflow(ABC):
    """Abstract workflow interface for the multi-agent runtime."""

    def __init__(self, name: str, memory: SharedMemory | None = None) -> None:
        self.name = name
        self.memory = memory or SharedMemory()

    def execute(self, signal: SignalInput, workflow_id: str | None = None) -> WorkflowResult:
        """Run the workflow and return a structured result."""

        execution_id = workflow_id or str(uuid.uuid4())
        logger.info("Starting workflow", extra={"workflow_id": execution_id, "workflow_name": self.name})
        self.memory.record_trace(
            execution_id,
            self.name,
            "workflow_start",
            f"Starting workflow {self.name}",
            payload={"signal_title": signal.title},
        )

        try:
            decision = self._run(signal, execution_id)
            self.memory.record_trace(
                execution_id,
                self.name,
                "workflow_complete",
                "Workflow completed successfully",
                payload={"risk_level": decision.risk_level.value},
            )
            return WorkflowResult(
                workflow_id=execution_id,
                status="completed",
                decision=decision,
                memory_snapshot=self.memory.snapshot(execution_id),
            )
        except Exception as exc:  # pragma: no cover - defensive branch
            logger.exception(
                "Workflow execution failed",
                extra={"workflow_id": execution_id, "workflow_name": self.name, "error": str(exc)},
            )
            self.memory.record_trace(
                execution_id,
                self.name,
                "workflow_error",
                "Workflow failed",
                payload={"error": str(exc)},
            )
            raise RuntimeError(f"Workflow {self.name} failed") from exc

    @abstractmethod
    def _run(self, signal: SignalInput, workflow_id: str) -> DecisionOutput:
        """Execute the workflow-specific logic."""


class ComplaintWorkflow(Workflow):
    """Workflow for processing civic complaints into an intervention decision."""

    def __init__(self, memory: SharedMemory | None = None, engine: MultiAgentEngine | None = None) -> None:
        super().__init__("complaint_workflow", memory=memory)
        self.engine = engine or MultiAgentEngine()

    def _run(self, signal: SignalInput, workflow_id: str) -> DecisionOutput:
        """Run the complaint decision pipeline."""

        self.memory.record_fact(workflow_id, self.name, "signal_title", signal.title)
        self.memory.record_fact(workflow_id, self.name, "location", signal.location)
        self.memory.record_trace(
            workflow_id,
            self.name,
            "engine_dispatch",
            "Dispatching the multi-agent engine",
            payload={"signal_title": signal.title},
        )
        result = self.engine.run(signal, workflow_id=workflow_id)
        self.memory.record_fact(workflow_id, self.name, "department", result.department)
        self.memory.record_fact(workflow_id, self.name, "risk_level", result.risk_level.value)
        return result
