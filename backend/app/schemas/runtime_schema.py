"""Shared schemas for the runtime API and service layer.

These models define the contract between the API boundary and the decision engine so
requests and responses remain typed, validated, and consistent.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RuntimeRequestSchema(BaseModel):
    """Request schema for submitting a civic signal to the runtime."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(...)
    location: str = Field(...)
    source: str = Field(default="citizen_report")
    severity_hint: int = Field(default=0, ge=0, le=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RuntimeResponseSchema(BaseModel):
    """Response schema for runtime decisions."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    decision: dict[str, Any]
    explanation: dict[str, Any]
    validation: dict[str, Any]
