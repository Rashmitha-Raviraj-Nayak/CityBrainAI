"""Tests for the CityBrain AI runtime."""

from __future__ import annotations

from app.agents.engine import SignalCategory, SignalInput
from app.agents.runtime import AgentRuntime
from app.agents.supervisor import SupervisorAgent
from app.agents.validation import ValidationAgent
from app.runtime.runtime import RuntimeContext, RuntimeStatus


def test_runtime_returns_structured_decision() -> None:
    """The runtime should produce a complete decision payload for a civic signal."""

    runtime = AgentRuntime()
    signal = SignalInput(
        title="Blocked drainage outlet near main road",
        description="Heavy rain caused water to pool near a public road and drainage outlet is blocked.",
        category=SignalCategory.INFRASTRUCTURE,
        location="Downtown District",
        severity_hint=8,
        metadata={"reported_by": "citizen"},
    )

    result = runtime.run(signal, workflow_id="test-workflow")

    assert result.workflow_id == "test-workflow"
    assert result.decision.department in {"Public Works", "Transport Operations", "Emergency Management", "Environmental Services", "Municipal Services"}
    assert result.validation.is_valid is True
    assert result.explanation.summary
    assert result.workflow_result.status == "completed"


def test_supervisor_includes_understanding_agent() -> None:
    """The supervisor should execute the understanding stage and surface its result."""

    supervisor = SupervisorAgent()
    context = RuntimeContext(
        workflow_name="complaint_workflow",
        input_data={
            "signal": {
                "description": "Heavy rain caused water to pool near a public road and drainage outlet is blocked.",
                "location": "Downtown District",
                "timestamp": "2026-07-11T10:00:00Z",
            }
        },
    )

    result = supervisor.execute(context)

    assert result.status == RuntimeStatus.SUCCESS
    assert "understanding" in result.details["selected_agents"]
    assert any(agent_result.get("agent_name") == "understanding" for agent_result in result.details.get("agent_results", []))


def test_supervisor_builds_dynamic_plan_for_image_and_voice_inputs() -> None:
    """The supervisor should include vision and understanding steps when image and voice channels are present."""

    supervisor = SupervisorAgent()
    context = RuntimeContext(
        workflow_name="complaint_workflow",
        input_data={
            "signal": {
                "description": "Flooding at the downtown drain outlet after heavy rain.",
                "location": "Downtown District",
                "timestamp": "2026-07-11T10:00:00Z",
            },
            "vision": {
                "image_reference": "flooded-street.jpg",
                "citizen_description": "Water is pooling on the road near the drain outlet.",
            },
            "transcript": "The road is flooded and the drain outlet is blocked.",
        },
        metadata={"input_channels": ["image", "voice"]},
    )

    result = supervisor.execute(context)

    assert result.status == RuntimeStatus.SUCCESS
    assert "vision" in result.details["selected_agents"]
    assert "understanding" in result.details["selected_agents"]
    assert "prediction" in result.details["selected_agents"]
    assert result.details["plan"]["reason"]


def test_validation_agent_marks_low_confidence_as_needs_review() -> None:
    """The validation agent should flag low-confidence decisions for review."""

    validator = ValidationAgent()
    context = RuntimeContext(
        workflow_name="complaint_workflow",
        input_data={"signal": {"description": "A road sign is broken near the intersection.", "location": "North Avenue"}},
    )
    context.state["decision_confidence"] = 0.4

    result = validator.execute(context)

    assert result.status == RuntimeStatus.SUCCESS
    assert result.details["validated"] is False
    assert result.details["review_required"] is True
