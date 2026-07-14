"""Core AI runtime for CityBrain OS.

This module defines a backend-agnostic execution layer for agent-based workflows.
It is intentionally decoupled from FastAPI, UI layers, and any future Google ADK
integration so business logic can evolve without changing the runtime contract.
"""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from collections.abc import Callable
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator

logger = logging.getLogger("citybrain.runtime")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class RuntimeStatus(str, Enum):
    """Execution status for the runtime."""

    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class RuntimeTraceEvent(BaseModel):
    """A structured trace event emitted during workflow execution."""

    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    execution_id: str
    event_type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RuntimeRequest(BaseModel):
    """Typed request payload for the runtime."""

    model_config = ConfigDict(extra="forbid")

    request_id: str | None = Field(default=None, description="Caller-supplied request identifier")
    workflow_name: str = Field(..., min_length=3, description="Workflow to execute")
    input_data: dict[str, Any] = Field(default_factory=dict, description="Workflow-specific input")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional execution metadata")

    @field_validator("request_id")
    @classmethod
    def validate_request_id(cls, value: str | None) -> str | None:
        """Trim whitespace from user-supplied request identifiers."""

        if value is None:
            return None
        return value.strip() or None


class RuntimeContext(BaseModel):
    """Execution context propagated through the runtime."""

    model_config = ConfigDict(extra="forbid")

    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_name: str
    request_id: str | None = None
    input_data: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    trace_events: list[RuntimeTraceEvent] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    """Structured output emitted by an agent."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str
    status: RuntimeStatus
    summary: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    details: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """Structured result emitted by a tool call."""

    model_config = ConfigDict(extra="forbid")

    tool_name: str
    status: RuntimeStatus
    summary: str
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class RuntimeResponse(BaseModel):
    """Typed runtime response returned to callers."""

    model_config = ConfigDict(extra="forbid")

    execution_id: str
    workflow_name: str
    status: RuntimeStatus
    summary: str
    result: dict[str, Any] = Field(default_factory=dict)
    traces: list[RuntimeTraceEvent] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Agent(Protocol):
    """Protocol for runtime agents."""

    name: str

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the agent against the current runtime context."""


class Tool(Protocol):
    """Protocol for runtime tools."""

    name: str

    def execute(self, context: RuntimeContext, payload: dict[str, Any] | None = None) -> ToolResult:
        """Run the tool and return a typed result."""


class Workflow(Protocol):
    """Protocol for runtime workflows."""

    name: str

    def execute(self, request: RuntimeRequest, context: RuntimeContext) -> RuntimeResponse:
        """Execute the workflow and return a typed runtime response."""


class AgentRegistry:
    """Registry for agents used by the runtime."""

    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        """Register an agent for runtime execution."""

        self._agents[agent.name] = agent

    def get(self, name: str) -> Agent:
        """Resolve an agent by name."""

        if name not in self._agents:
            raise KeyError(f"Unknown agent: {name}")
        return self._agents[name]


class ToolRegistry:
    """Registry for tools used by the runtime."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """Register a tool for runtime execution."""

        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool:
        """Resolve a tool by name."""

        if name not in self._tools:
            raise KeyError(f"Unknown tool: {name}")
        return self._tools[name]


class WorkflowRegistry:
    """Registry for workflows used by the runtime."""

    def __init__(self) -> None:
        self._workflows: dict[str, Workflow] = {}

    def register(self, workflow: Workflow) -> None:
        """Register a workflow for runtime execution."""

        self._workflows[workflow.name] = workflow

    def get(self, name: str) -> Workflow:
        """Resolve a workflow by name."""

        if name not in self._workflows:
            raise KeyError(f"Unknown workflow: {name}")
        return self._workflows[name]


class RuntimeTracer:
    """Collects and exposes structured execution traces."""

    def __init__(self) -> None:
        self._events: dict[str, list[RuntimeTraceEvent]] = {}

    def record(
        self,
        execution_id: str,
        event_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> RuntimeTraceEvent:
        """Store a trace event and return it."""

        event = RuntimeTraceEvent(
            execution_id=execution_id,
            event_type=event_type,
            message=message,
            payload=payload or {},
        )
        self._events.setdefault(execution_id, []).append(event)
        logger.info(
            "Recorded runtime trace",
            extra={"execution_id": execution_id, "event_type": event_type, "trace_message": message},
        )
        return event

    def snapshot(self, execution_id: str) -> list[RuntimeTraceEvent]:
        """Return the trace events collected for an execution."""

        return list(self._events.get(execution_id, []))


class RuntimeExecutor:
    """Executes agents and tools with logging and trace collection."""

    def __init__(self, agent_registry: AgentRegistry, tool_registry: ToolRegistry, tracer: RuntimeTracer) -> None:
        self._agent_registry = agent_registry
        self._tool_registry = tool_registry
        self._tracer = tracer

    def execute_agent(self, context: RuntimeContext, agent_name: str) -> AgentResult:
        """Execute an agent and record trace information."""

        agent = self._agent_registry.get(agent_name)
        self._tracer.record(context.execution_id, "agent_start", f"Starting agent {agent_name}")
        result = agent.execute(context)
        self._tracer.record(
            context.execution_id,
            "agent_complete",
            f"Completed agent {agent_name}",
            payload={"status": result.status.value, "confidence": result.confidence},
        )
        return result

    def execute_tool(self, context: RuntimeContext, tool_name: str, payload: dict[str, Any] | None = None) -> ToolResult:
        """Execute a tool and record trace information."""

        tool = self._tool_registry.get(tool_name)
        self._tracer.record(context.execution_id, "tool_start", f"Starting tool {tool_name}")
        result = tool.execute(context, payload)
        self._tracer.record(
            context.execution_id,
            "tool_complete",
            f"Completed tool {tool_name}",
            payload={"status": result.status.value},
        )
        return result


class BaseWorkflow(ABC):
    """Abstract workflow implementation for runtime orchestration."""

    def __init__(self, name: str, executor: RuntimeExecutor, tracer: RuntimeTracer) -> None:
        self.name = name
        self._executor = executor
        self._tracer = tracer

    @abstractmethod
    def execute(self, request: RuntimeRequest, context: RuntimeContext) -> RuntimeResponse:
        """Execute the workflow and return a runtime response."""


class ComplaintWorkflow(BaseWorkflow):
    """Delegate civic complaint processing to the registered supervisor."""

    def __init__(self, executor: RuntimeExecutor, tracer: RuntimeTracer) -> None:
        super().__init__("complaint_workflow", executor, tracer)

    def execute(self, request: RuntimeRequest, context: RuntimeContext) -> RuntimeResponse:
        """Execute the complaint workflow through the supervisor agent."""

        self._tracer.record(context.execution_id, "workflow_start", "Complaint workflow started")
        raw_signal = request.input_data.get("signal")
        signal = raw_signal if isinstance(raw_signal, dict) else {}
        context.input_data = {**context.input_data, **signal, "signal": signal}
        context.state["signal_title"] = str(signal.get("title") or "unknown")

        supervisor_result = self._executor.execute_agent(context, "supervisor")
        status = supervisor_result.status

        self._tracer.record(
            context.execution_id,
            "workflow_complete" if status == RuntimeStatus.SUCCESS else "workflow_failed",
            "Complaint workflow completed" if status == RuntimeStatus.SUCCESS else "Complaint workflow failed",
            payload={"summary": supervisor_result.summary, "status": status.value},
        )

        return RuntimeResponse(
            execution_id=context.execution_id,
            workflow_name=self.name,
            status=status,
            summary=supervisor_result.summary,
            result={
                "supervisor": supervisor_result.model_dump(),
                "decision": supervisor_result.details.get("decision", {}),
                "signal_title": context.state.get("signal_title"),
            },
            traces=self._tracer.snapshot(context.execution_id),
            metadata={"request_id": request.request_id},
        )


class CityRuntime:
    """Main AI runtime that composes registries, executor, tracer, and workflows."""

    def __init__(
        self,
        *,
        agent_registry: AgentRegistry | None = None,
        tool_registry: ToolRegistry | None = None,
        workflow_registry: WorkflowRegistry | None = None,
        tracer: RuntimeTracer | None = None,
        executor: RuntimeExecutor | None = None,
    ) -> None:
        self.agent_registry = agent_registry or AgentRegistry()
        self.tool_registry = tool_registry or ToolRegistry()
        self.workflow_registry = workflow_registry or WorkflowRegistry()
        self.tracer = tracer or RuntimeTracer()
        self.executor = executor or RuntimeExecutor(self.agent_registry, self.tool_registry, self.tracer)

    def register_agent(self, agent: Agent) -> None:
        """Register an agent with the runtime."""

        self.agent_registry.register(agent)

    def register_tool(self, tool: Tool) -> None:
        """Register a tool with the runtime."""

        self.tool_registry.register(tool)

    def register_workflow(self, workflow: Workflow) -> None:
        """Register a workflow with the runtime."""

        self.workflow_registry.register(workflow)

    @classmethod
    def create_civic_runtime(cls) -> CityRuntime:
        """Build the production civic workflow with a single supervisor entrypoint."""

        from app.agents.supervisor import SupervisorAgent

        runtime = cls()
        supervisor = SupervisorAgent(
            agent_registry=runtime.agent_registry,
            tool_registry=runtime.tool_registry,
            tracer=runtime.tracer,
        )
        runtime.register_agent(supervisor)
        runtime.register_workflow(ComplaintWorkflow(runtime.executor, runtime.tracer))
        return runtime

    def build_context(self, request: RuntimeRequest) -> RuntimeContext:
        """Create a typed execution context from a runtime request."""

        return RuntimeContext(
            workflow_name=request.workflow_name,
            request_id=request.request_id,
            input_data=request.input_data,
            metadata=request.metadata,
        )

    def execute(self, request: RuntimeRequest) -> RuntimeResponse:
        """Execute the requested workflow and return a typed response."""

        context = self.build_context(request)
        self.tracer.record(context.execution_id, "runtime_start", "Runtime execution started", payload=request.model_dump())

        try:
            workflow = self.workflow_registry.get(request.workflow_name)
            response = workflow.execute(request, context)
        except Exception as exc:  # pragma: no cover - defensive path for runtime robustness
            logger.exception("Runtime execution failed", extra={"execution_id": context.execution_id, "error": str(exc)})
            self.tracer.record(context.execution_id, "runtime_error", "Runtime execution failed", payload={"error": str(exc)})
            return RuntimeResponse(
                execution_id=context.execution_id,
                workflow_name=request.workflow_name,
                status=RuntimeStatus.FAILED,
                summary="Runtime execution failed",
                result={},
                traces=self.tracer.snapshot(context.execution_id),
                metadata={"request_id": request.request_id, "error": str(exc)},
            )

        self.tracer.record(context.execution_id, "runtime_complete", "Runtime execution completed")
        return response
