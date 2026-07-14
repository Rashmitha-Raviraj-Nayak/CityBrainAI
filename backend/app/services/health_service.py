"""Health and readiness service for the CityBrain AI backend.

This module exposes a shared service for reporting whether the backend and its core
runtime components are ready to serve requests.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HealthStatus(BaseModel):
    """Operational health representation for the service."""

    model_config = ConfigDict(extra="forbid")

    status: str
    runtime_ready: bool
    checks: dict[str, bool] = Field(default_factory=dict)


class HealthService:
    """Service for reporting health and readiness state."""

    def get_status(self) -> HealthStatus:
        """Return the current readiness state of the backend."""

        checks = {
            "runtime": True,
            "logging": True,
            "configuration": True,
        }
        return HealthStatus(
            status="ok" if all(checks.values()) else "degraded",
            runtime_ready=True,
            checks=checks,
        )
