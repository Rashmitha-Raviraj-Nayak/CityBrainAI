"""Shared dependency helpers for the CityBrain AI backend."""

from __future__ import annotations

from app.runtime.runtime import CityRuntime
from app.services.decision_service import DecisionService
from app.services.health_service import HealthService


def get_decision_service() -> DecisionService:
    """Create a decision service backed by the composed civic runtime."""

    return DecisionService(runtime=CityRuntime.create_civic_runtime())


def get_health_service() -> HealthService:
    """Create the health service used by API endpoints."""

    return HealthService()
