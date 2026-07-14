"""Supervisor Agent — planning authority for the CityBrain AI pipeline.

This module decides which specialist agents are needed for a given incident and
stores the resultant plan on the shared IncidentState. It uses an ADK-based
planning interface when available and falls back to a deterministic plan if the
planner call fails.
"""

from __future__ import annotations

import json
import logging

from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

try:
    from google.adk.agents import Agent
    from google.adk.planners import PlanReActPlanner
except Exception:  # pragma: no cover - allows tests to run without ADK installed
    Agent = None  # type: ignore[assignment]
    PlanReActPlanner = None  # type: ignore[assignment]


PLANNING_PROMPT = """
You are the Supervisor for CityBrain AI, a civic incident triage system.
Given the available input channels and any early signals for this incident,
decide which specialist agents are required and in what order.

Available agents: vision_agent, understanding_agent, prediction_agent,
decision_agent, validation_agent, notification_agent

Rules:
- If "image" or "video" is in input_channels -> include vision_agent.
- If "voice" or "text" is in input_channels -> include understanding_agent.
- Include prediction_agent only if issue_type is one of
  [flood, road_damage, garbage_overflow, power_outage, water_shortage],
  OR if vision/understanding output indicates severity of "medium" or higher.
- decision_agent always runs after all analysis agents finish.
- validation_agent always runs immediately after decision_agent.
- notification_agent runs only if validation_agent approves.

Respond ONLY with JSON: {"steps": ["agent_name", ...], "reason": "one sentence"}
"""


class _PlannerProxy:
    """Simple proxy that mimics the ADK planner interface for tests and offline use."""

    async def run_async(self, payload: str) -> object:
        raise RuntimeError("ADK planner is unavailable")


if Agent is not None and PlanReActPlanner is not None:
    supervisor_agent = Agent(
        name="supervisor_agent",
        model="gemini-2.5-flash",
        instruction=PLANNING_PROMPT,
        planner=PlanReActPlanner(),
    )
else:
    supervisor_agent = _PlannerProxy()


async def build_plan(state: IncidentState) -> IncidentState:
    """Generate and store the supervisor plan on the shared incident state."""

    try:
        context = {
            "input_channels": state.input_channels,
            "issue_type": state.issue_type,
        }
        planner = supervisor_agent or _PlannerProxy()
        response = await planner.run_async(json.dumps(context))
        plan_data = json.loads(response.text)

        state.plan = plan_data["steps"]
        state.log(
            agent="supervisor_agent",
            output={"plan": state.plan},
            why=plan_data.get("reason", "Plan generated from available input channels."),
        )
    except Exception as exc:
        logger.warning("Supervisor planning failed, falling back to default plan: %s", exc)
        state.plan = _default_plan(state)
        state.log(
            agent="supervisor_agent",
            output={"plan": state.plan},
            why=f"Fell back to default plan after planner error: {exc}",
        )

    return state


def _default_plan(state: IncidentState) -> list[str]:
    """Deterministic fallback plan used when the planner call fails."""

    steps: list[str] = []
    if "image" in state.input_channels or "video" in state.input_channels:
        steps.append("vision_agent")
    if "voice" in state.input_channels or "text" in state.input_channels:
        steps.append("understanding_agent")
    steps += ["prediction_agent", "decision_agent", "validation_agent", "notification_agent"]
    return steps
