"""Tests for the Supervisor planning module."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.supervisor_agent import _default_plan, build_plan
from app.schemas.incident_state import IncidentState


def make_state(**kwargs: object) -> IncidentState:
    defaults = {"incident_id": "test-1", "citizen_id": "citizen-1", "input_channels": []}
    defaults.update(kwargs)
    return IncidentState(**defaults)


@pytest.mark.asyncio
async def test_plan_falls_back_on_planner_failure() -> None:
    state = make_state(input_channels=["image"])
    with patch(
        "app.agents.supervisor_agent.supervisor_agent.run_async",
        new=AsyncMock(side_effect=RuntimeError("network error")),
    ):
        result = await build_plan(state)

    assert "vision_agent" in result.plan
    assert result.reasoning_trace[-1].agent == "supervisor_agent"
    assert "fallback" in result.reasoning_trace[-1].why.lower() or "error" in result.reasoning_trace[-1].why.lower()


def test_default_plan_skips_vision_for_sensor_only() -> None:
    state = make_state(input_channels=["sensor"])
    plan = _default_plan(state)

    assert "vision_agent" not in plan
    assert "understanding_agent" not in plan
    assert plan[0] == "prediction_agent"


def test_default_plan_includes_vision_for_image_channel() -> None:
    state = make_state(input_channels=["image"])
    plan = _default_plan(state)

    assert "vision_agent" in plan
