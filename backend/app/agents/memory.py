"""Shared memory and execution tracing for the CityBrain AI runtime.

This module provides the state layer for multi-agent reasoning. It is intentionally
independent of any specific UI, API, or Google SDK so the core AI runtime can be
used locally, in tests, and later inside ADK workflows.
"""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("citybrain.agents.memory")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class ExecutionTrace(BaseModel):
    """A single event emitted during agent execution."""

    model_config = ConfigDict(extra="forbid")

    trace_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    agent_name: str
    event_type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryFact(BaseModel):
    """A durable fact captured by the runtime for later reasoning."""

    model_config = ConfigDict(extra="forbid")

    fact_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    source: str
    key: str
    value: Any
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryStore(Protocol):
    """Protocol for a pluggable memory backend."""

    def save_fact(self, fact: MemoryFact) -> None:
        """Persist a fact."""

    def save_trace(self, trace: ExecutionTrace) -> None:
        """Persist an execution trace."""

    def get_facts(self, workflow_id: str) -> list[MemoryFact]:
        """Return all facts for a workflow."""

    def get_traces(self, workflow_id: str) -> list[ExecutionTrace]:
        """Return all traces for a workflow."""


class BaseMemoryStore(ABC):
    """Abstract base class for memory backends."""

    @abstractmethod
    def save_fact(self, fact: MemoryFact) -> None:
        """Persist a fact."""

    @abstractmethod
    def save_trace(self, trace: ExecutionTrace) -> None:
        """Persist an execution trace."""

    @abstractmethod
    def get_facts(self, workflow_id: str) -> list[MemoryFact]:
        """Return all facts for a workflow."""

    @abstractmethod
    def get_traces(self, workflow_id: str) -> list[ExecutionTrace]:
        """Return all traces for a workflow."""


class InMemoryMemoryStore(BaseMemoryStore):
    """Simple in-memory implementation suitable for local development and tests."""

    def __init__(self) -> None:
        self._facts: dict[str, list[MemoryFact]] = defaultdict(list)
        self._traces: dict[str, list[ExecutionTrace]] = defaultdict(list)

    def save_fact(self, fact: MemoryFact) -> None:
        """Persist a fact in memory."""

        self._facts[fact.workflow_id].append(fact)

    def save_trace(self, trace: ExecutionTrace) -> None:
        """Persist an execution trace in memory."""

        self._traces[trace.workflow_id].append(trace)

    def get_facts(self, workflow_id: str) -> list[MemoryFact]:
        """Return the facts recorded for a workflow."""

        return list(self._facts.get(workflow_id, []))

    def get_traces(self, workflow_id: str) -> list[ExecutionTrace]:
        """Return the traces recorded for a workflow."""

        return list(self._traces.get(workflow_id, []))


class SharedMemory:
    """Shared state container for the multi-agent runtime."""

    def __init__(self, store: MemoryStore | None = None) -> None:
        self._store = store or InMemoryMemoryStore()

    def record_fact(self, workflow_id: str, source: str, key: str, value: Any) -> MemoryFact:
        """Persist a fact for a workflow and return it."""

        fact = MemoryFact(workflow_id=workflow_id, source=source, key=key, value=value)
        self._store.save_fact(fact)
        logger.info(
            "Recorded memory fact",
            extra={"workflow_id": workflow_id, "source": source, "key": key},
        )
        return fact

    def record_trace(
        self,
        workflow_id: str,
        agent_name: str,
        event_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> ExecutionTrace:
        """Persist an execution trace event for observability."""

        trace = ExecutionTrace(
            workflow_id=workflow_id,
            agent_name=agent_name,
            event_type=event_type,
            message=message,
            payload=payload or {},
        )
        self._store.save_trace(trace)
        logger.info(
            "Recorded execution trace",
            extra={"workflow_id": workflow_id, "agent_name": agent_name, "event_type": event_type},
        )
        return trace

    def get_context(self, workflow_id: str) -> dict[str, Any]:
        """Return the current memory context for a workflow."""

        facts = self._store.get_facts(workflow_id)
        traces = self._store.get_traces(workflow_id)
        return {
            "workflow_id": workflow_id,
            "facts": [fact.model_dump() for fact in facts],
            "traces": [trace.model_dump() for trace in traces],
        }

    def snapshot(self, workflow_id: str) -> dict[str, Any]:
        """Return a serializable snapshot of workflow memory."""

        return self.get_context(workflow_id)
