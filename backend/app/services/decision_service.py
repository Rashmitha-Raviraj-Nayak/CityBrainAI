"""Application service for submitting civic signals to the CityRuntime."""

from __future__ import annotations

from typing import Any

from app.runtime.runtime import CityRuntime, RuntimeRequest, RuntimeResponse


class DecisionService:
    """Translate application inputs into a single CityRuntime execution request."""

    def __init__(self, runtime: CityRuntime | None = None) -> None:
        self._runtime = runtime or CityRuntime.create_civic_runtime()

    def evaluate_signal(
        self,
        title: str,
        description: str,
        category: str,
        location: str,
        source: str = "citizen_report",
        severity_hint: int = 0,
        metadata: dict[str, Any] | None = None,
    ) -> RuntimeResponse:
        """Submit a civic signal to the composed runtime and return its typed result."""

        signal_metadata = metadata or {}
        return self._runtime.execute(
            RuntimeRequest(
                workflow_name="complaint_workflow",
                input_data={
                    "signal": {
                        "title": title,
                        "description": description,
                        "category": category,
                        "location": location,
                        "source": source,
                        "severity_hint": severity_hint,
                        "metadata": signal_metadata,
                    }
                },
                metadata=signal_metadata,
            )
        )
