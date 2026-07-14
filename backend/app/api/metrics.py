"""Metrics and observability endpoints for the backend service."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(tags=["observability"])


class MetricsResponse(BaseModel):
    """Response payload for the metrics endpoint."""

    model_config = ConfigDict(extra="forbid")

    service: str = Field(description="Service identifier")
    uptime_seconds: int = Field(description="Number of seconds the process has been alive")
    counters: dict[str, int] = Field(default_factory=dict, description="Simple request counters")
    status: str = Field(default="ok", description="Service status")


def _get_metrics_payload(request: Request) -> dict[str, Any]:
    """Collect process-local metrics from the request state."""

    metrics = getattr(request.app.state, "metrics", {})
    return {
        "service": getattr(request.app.state, "service_name", "citybrain-ai"),
        "uptime_seconds": int(getattr(request.app.state, "uptime_seconds", 0)),
        "counters": {
            "requests": int(metrics.get("requests", 0)),
            "runtime_requests": int(metrics.get("runtime_requests", 0)),
            "errors": int(metrics.get("errors", 0)),
        },
        "status": "ok",
    }


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(request: Request) -> MetricsResponse:
    """Expose simple operational metrics and counters for monitoring."""

    return MetricsResponse(**_get_metrics_payload(request))
