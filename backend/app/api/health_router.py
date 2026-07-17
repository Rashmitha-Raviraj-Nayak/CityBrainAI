"""Health API routes for the CityBrain AI backend."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.schemas.health_schema import HealthResponse
from app.services.health_service import HealthService

router = APIRouter(prefix="/health", tags=["health"])


def get_health_service(request: Request) -> HealthService:
    """Create a health service instance for dependency injection."""

    startup_ready = bool(getattr(request.app.state, "startup_complete", True))
    return HealthService(startup_ready=startup_ready)


@router.get("", response_model=HealthResponse)
async def get_health(service: HealthService = Depends(get_health_service)) -> HealthResponse:
    """Return the current health and readiness status."""

    return HealthResponse(**service.get_status().model_dump())


@router.get("/ready", response_model=HealthResponse)
async def get_readiness(service: HealthService = Depends(get_health_service)) -> HealthResponse:
    """Return readiness information for deployment and orchestration."""

    return HealthResponse(**service.get_status().model_dump())
