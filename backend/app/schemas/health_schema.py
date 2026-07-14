"""Health-related API schemas for the CityBrain AI backend."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Response payload for health and readiness endpoints."""

    model_config = ConfigDict(extra="forbid")

    status: str = Field(description="Overall service status")
    runtime_ready: bool = Field(description="Whether the runtime is ready")
    checks: dict[str, bool] = Field(default_factory=dict, description="Per-component health checks")
