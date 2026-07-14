"""Supervisor agent for CityBrain OS.

The Supervisor is the orchestration engine of the runtime. It coordinates
specialized agents, manages execution context, aggregates results, and emits
structured trace events without directly calling external services.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.decision import DecisionAgent as RuntimeDecisionAgent
from app.agents.prediction import PredictionAgent as RuntimePredictionAgent
from app.agents.understanding import UnderstandingAgent as RuntimeUnderstandingAgent
from app.agents.validation import ValidationAgent as RuntimeValidationAgent
from app.agents.vision import VisionAgent as RuntimeVisionAgent
from app.runtime.runtime import (
    Agent,
    AgentRegistry,
    AgentResult,
    RuntimeContext,
    RuntimeStatus,
    RuntimeTracer,
    ToolRegistry,
)

logger = logging.getLogger("citybrain.agents.supervisor")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class SupervisorDecision(BaseModel):
    """Structured output describing a supervisor orchestration decision."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str
    selected_agents: list[str] = Field(default_factory=list)
    summary: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    details: dict[str, Any] = Field(default_factory=dict)


class SupervisorAgent:
    """Coordinate specialized agents and aggregate their outputs."""

    def __init__(
        self,
        *,
        name: str = "supervisor",
        agent_registry: AgentRegistry | None = None,
        tool_registry: ToolRegistry | None = None,
        tracer: RuntimeTracer | None = None,
        workflow_plan: Sequence[str] | None = None,
    ) -> None:
        self.name = name
        self._agent_registry = agent_registry or AgentRegistry()
        self._tool_registry = tool_registry or ToolRegistry()
        self._tracer = tracer or RuntimeTracer()
        self._workflow_plan = list(workflow_plan or ["understanding", "prediction", "decision", "validation"])
        self._register_default_agents()

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the supervisor orchestration flow for the current context."""

        self._tracer.record(context.execution_id, "supervisor_start", "Supervisor orchestration started")

        try:
            workflow_name = self._resolve_workflow(context)
            self._validate_context(context)
            plan = self._build_execution_plan(context)
            selected_agents = plan["steps"]
            results = self._execute_agents(context, selected_agents)
            decision = self._build_decision(workflow_name, selected_agents, results)

            self._tracer.record(
                context.execution_id,
                "supervisor_complete",
                "Supervisor orchestration completed",
                payload={"workflow_name": workflow_name, "agent_count": len(selected_agents)},
            )

            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=decision.summary,
                confidence=decision.confidence,
                details={
                    "workflow_name": workflow_name,
                    "selected_agents": selected_agents,
                    "agent_results": [result.model_dump() for result in results],
                    "decision": decision.model_dump(),
                    "plan": plan,
                },
            )
        except Exception as exc:  # pragma: no cover - defensive runtime path
            logger.exception(
                "Supervisor execution failed",
                extra={"execution_id": context.execution_id, "error": str(exc)},
            )
            self._tracer.record(
                context.execution_id,
                "supervisor_error",
                "Supervisor orchestration failed",
                payload={"error": str(exc)},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Supervisor orchestration failed",
                confidence=0.0,
                details={"error": str(exc)},
            )

    def _register_default_agents(self) -> None:
        """Populate the agent registry with the runtime-compatible default agents."""

        self._agent_registry.register(RuntimeUnderstandingAgent())
        self._agent_registry.register(RuntimePredictionAgent())
        self._agent_registry.register(RuntimeDecisionAgent())
        self._agent_registry.register(RuntimeVisionAgent())
        self._agent_registry.register(RuntimeValidationAgent())
        self._agent_registry.register(_FallbackAgent("notification"))

    def _resolve_workflow(self, context: RuntimeContext) -> str:
        """Resolve the workflow name from the runtime context."""

        workflow_name = context.metadata.get("workflow_name") or context.workflow_name
        if not isinstance(workflow_name, str) or not workflow_name.strip():
            raise ValueError("Workflow name is required")
        return workflow_name

    def _build_execution_plan(self, context: RuntimeContext) -> dict[str, Any]:
        """Build a dynamic execution plan from the available input channels and early signals."""

        input_channels = self._extract_input_channels(context)
        signal = context.input_data.get("signal") if isinstance(context.input_data.get("signal"), dict) else {}
        description = str(
            signal.get("description")
            or signal.get("title")
            or context.input_data.get("description")
            or context.input_data.get("title")
            or ""
        ).lower()
        severity_hint = signal.get("severity_hint") if isinstance(signal.get("severity_hint"), (int, float)) else None
        if severity_hint is None:
            severity_hint = context.metadata.get("severity_hint") if isinstance(context.metadata.get("severity_hint"), (int, float)) else 0

        selected_agents: list[str] = []
        has_image = "image" in input_channels or "video" in input_channels or "vision" in context.input_data
        has_voice = "voice" in input_channels or "transcript" in context.input_data or "transcript" in signal
        if has_image:
            selected_agents.append("vision")
        if has_voice or description:
            selected_agents.append("understanding")
        if self._should_run_prediction(description, float(severity_hint or 0), has_image=has_image, has_voice=has_voice):
            selected_agents.append("prediction")
        selected_agents.extend(["decision", "validation"])

        reason = (
            f"The supervisor selected {', '.join(selected_agents) or 'no agents'} based on input channels {input_channels} "
            f"and the incident signals detected in the report."
        )
        return {"steps": selected_agents, "reason": reason, "input_channels": input_channels}

    def _extract_input_channels(self, context: RuntimeContext) -> list[str]:
        """Infer the available input channels from the context payload and metadata."""

        metadata_channels = context.metadata.get("input_channels")
        if isinstance(metadata_channels, list):
            return [str(item) for item in metadata_channels if isinstance(item, str)]

        channels: list[str] = []
        if context.input_data.get("vision") is not None:
            channels.append("image")
        if context.input_data.get("transcript") is not None:
            channels.append("voice")
        if context.input_data.get("signal") is not None:
            channels.append("text")
        return channels

    def _should_run_prediction(
        self,
        description: str,
        severity_hint: float,
        *,
        has_image: bool,
        has_voice: bool,
    ) -> bool:
        """Determine when the prediction agent is required for the current incident."""

        relevant_keywords = ["flood", "road_damage", "garbage_overflow", "power_outage", "water_shortage"]
        if any(keyword in description for keyword in relevant_keywords):
            return True
        if severity_hint >= 5:
            return True
        if has_image or has_voice:
            return True
        return False

    def _validate_context(self, context: RuntimeContext) -> None:
        """Validate that the runtime context contains the required structure."""

        if not isinstance(context.input_data, dict):
            raise ValueError("Runtime context input_data must be a dictionary")

    def _execute_agents(self, context: RuntimeContext, selected_agents: Sequence[str]) -> list[AgentResult]:
        """Execute each selected agent through the registry."""

        results: list[AgentResult] = []
        for agent_name in selected_agents:
            self._tracer.record(
                context.execution_id,
                "agent_dispatch",
                f"Dispatching agent {agent_name}",
                payload={"agent_name": agent_name},
            )
            agent = self._agent_registry.get(agent_name)
            result = agent.execute(context)
            results.append(result)
            if agent_name == "decision" and result.status == RuntimeStatus.SUCCESS:
                context.state["decision_confidence"] = result.confidence
            if agent_name == "validation" and result.status == RuntimeStatus.SUCCESS:
                context.state["validation_result"] = result.details
            if result.status == RuntimeStatus.FAILED:
                self._tracer.record(
                    context.execution_id,
                    "agent_failed",
                    f"Agent {agent_name} failed",
                    payload={"agent_name": agent_name, "summary": result.summary},
                )
                break

        context.state.setdefault("reasoning_trace", []).append(
            {
                "agent": "supervisor",
                "output": {"selected_agents": selected_agents},
                "why": "Supervisor completed the planned execution sequence.",
            }
        )
        return results

    def _build_decision(
        self,
        workflow_name: str,
        selected_agents: Sequence[str],
        results: Sequence[AgentResult],
    ) -> SupervisorDecision:
        """Aggregate agent results into a structured supervisor decision."""

        successful_results = [result for result in results if result.status == RuntimeStatus.SUCCESS]
        confidence = round(sum(result.confidence for result in successful_results) / max(1, len(successful_results)), 3)
        summary = (
            f"Completed workflow {workflow_name} with {len(successful_results)} successful agent execution(s)."
        )
        return SupervisorDecision(
            workflow_name=workflow_name,
            selected_agents=list(selected_agents),
            summary=summary,
            confidence=confidence,
            details={
                "successful_agents": [result.agent_name for result in successful_results],
                "result_count": len(results),
            },
        )


class _FallbackAgent:
    """Lightweight runtime-compatible fallback for downstream agents not yet implemented."""

    def __init__(self, name: str) -> None:
        self.name = name

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Return a stable placeholder result for the current runtime context."""

        return AgentResult(
            agent_name=self.name,
            status=RuntimeStatus.SUCCESS,
            summary=f"{self.name} completed with a runtime fallback",
            confidence=0.7,
            details={"context_workflow": context.workflow_name},
        )
