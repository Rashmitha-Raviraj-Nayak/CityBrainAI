"""Dependency injection helpers for the CityBrain AI API layer."""

from __future__ import annotations

from app.runtime.runtime import CityRuntime


def get_city_runtime() -> CityRuntime:
    """Create the fully composed civic runtime for one API request."""

    return CityRuntime.create_civic_runtime()
