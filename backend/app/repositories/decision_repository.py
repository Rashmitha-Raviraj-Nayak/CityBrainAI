"""Repository abstraction for decision persistence.

This module defines the boundary for storing and retrieving decision results. It is
kept intentionally generic so the implementation can later be backed by Firestore,
SQLite, or another durable store without changing the application layer.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DecisionRecord(BaseModel):
    """Persisted representation of a decision outcome."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    signal_title: str
    department: str
    risk_level: str
    recommended_action: str
    confidence: float = Field(ge=0.0, le=1.0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DecisionRepository(ABC):
    """Repository interface for decision persistence."""

    @abstractmethod
    def save(self, record: DecisionRecord) -> DecisionRecord:
        """Persist a decision record and return it."""

    @abstractmethod
    def get_by_workflow_id(self, workflow_id: str) -> DecisionRecord | None:
        """Return a persisted record by workflow identifier."""


class InMemoryDecisionRepository(DecisionRepository):
    """Simple in-memory repository for local development and tests."""

    def __init__(self) -> None:
        self._records: dict[str, DecisionRecord] = {}

    def save(self, record: DecisionRecord) -> DecisionRecord:
        """Persist a decision record in memory."""

        self._records[record.workflow_id] = record
        return record

    def get_by_workflow_id(self, workflow_id: str) -> DecisionRecord | None:
        """Return a stored decision record if one exists."""

        return self._records.get(workflow_id)
