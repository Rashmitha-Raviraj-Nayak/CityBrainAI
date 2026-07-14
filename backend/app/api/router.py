"""HTTP adapter for the CityBrain AI civic operations runtime."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.agents.engine import SignalInput
from app.api.dependencies import get_city_runtime
from app.runtime.runtime import CityRuntime, RuntimeRequest as CityRuntimeRequest
from app.runtime.runtime import RuntimeResponse as CityRuntimeResult
from app.runtime.runtime import RuntimeStatus

router = APIRouter(prefix="/api/v1", tags=["runtime"])


class RuntimeRequest(BaseModel):
    """Request payload for running the AI runtime."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(...)
    location: str = Field(...)
    source: str = Field(default="citizen_report")
    severity_hint: int = Field(default=0, ge=0, le=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RuntimeResponse(BaseModel):
    """Response payload returned by the runtime endpoint."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    decision: dict[str, Any]
    explanation: dict[str, Any]
    validation: dict[str, Any]


def _agent_results(result: CityRuntimeResult) -> list[dict[str, Any]]:
    """Extract serialized specialist-agent results from the runtime response."""

    supervisor = result.result.get("supervisor")
    if not isinstance(supervisor, dict):
        return []
    details = supervisor.get("details")
    if not isinstance(details, dict):
        return []
    raw_results = details.get("agent_results")
    if not isinstance(raw_results, list):
        return []
    return [item for item in raw_results if isinstance(item, dict)]


def _details_for(agent_results: list[dict[str, Any]], agent_name: str) -> dict[str, Any]:
    """Return the typed details emitted by one named specialist agent."""

    for agent_result in agent_results:
        if agent_result.get("agent_name") != agent_name:
            continue
        details = agent_result.get("details")
        return details if isinstance(details, dict) else {}
    return {}


def _confidence(value: object, default: float = 0.0) -> float:
    """Normalize a runtime confidence value for the stable response contract."""

    if isinstance(value, int | float):
        return max(0.0, min(1.0, float(value)))
    return default


def _adapt_response(result: CityRuntimeResult) -> RuntimeResponse:
    """Map CityRuntime output into the established public API response contract."""

    agent_results = _agent_results(result)
    prediction = _details_for(agent_results, "prediction")
    decision_result = _details_for(agent_results, "decision")
    supervisor = result.result.get("supervisor")
    supervisor_data = supervisor if isinstance(supervisor, dict) else {}
    supervisor_confidence = _confidence(supervisor_data.get("confidence"))
    risk_score = prediction.get("risk_score")
    normalized_risk_score = float(risk_score) / 100.0 if isinstance(risk_score, int | float) else 0.0
    recommended_departments = decision_result.get("recommended_departments")
    recommended_actions = decision_result.get("recommended_actions")
    contributing_factors = prediction.get("contributing_factors")
    data_limitations = prediction.get("data_limitations")

    failed_agents = [item for item in agent_results if item.get("status") != RuntimeStatus.SUCCESS.value]
    validation_issues = [
        {
            "field": str(item.get("agent_name", "runtime")),
            "message": str(item.get("summary", "Agent execution failed.")),
        }
        for item in failed_agents
    ]
    validation_score = 1.0 if not agent_results else (len(agent_results) - len(failed_agents)) / len(agent_results)

    return RuntimeResponse(
        workflow_id=result.execution_id,
        decision={
            "workflow_id": result.execution_id,
            "signal_title": result.result.get("signal_title", ""),
            "risk_level": prediction.get("predicted_risk_level", "medium"),
            "risk_score": max(0.0, min(1.0, normalized_risk_score)),
            "department": recommended_departments[0] if isinstance(recommended_departments, list) and recommended_departments else "Municipal Services",
            "recommended_action": recommended_actions[0] if isinstance(recommended_actions, list) and recommended_actions else "Assign a field team for review.",
            "explanation": decision_result.get("reasoning", result.summary),
            "confidence": _confidence(decision_result.get("confidence_score"), supervisor_confidence),
            "officer_brief": result.summary,
            "agent_results": agent_results,
        },
        explanation={
            "summary": result.summary,
            "rationale": [
                {
                    "title": str(item.get("agent_name", "runtime")).replace("_", " ").title(),
                    "detail": str(item.get("summary", "")),
                    "confidence": _confidence(item.get("confidence")),
                }
                for item in agent_results
            ],
            "evidence": [str(item) for item in contributing_factors] if isinstance(contributing_factors, list) else [],
            "confidence": supervisor_confidence,
        },
        validation={
            "is_valid": result.status == RuntimeStatus.SUCCESS and not validation_issues,
            "issues": validation_issues,
            "score": max(0.0, min(1.0, validation_score)),
            "data_limitations": [str(item) for item in data_limitations] if isinstance(data_limitations, list) else [],
        },
    )


@router.post("/run", response_model=RuntimeResponse, status_code=status.HTTP_200_OK)
async def run_runtime(
    request: RuntimeRequest,
    runtime: CityRuntime = Depends(get_city_runtime),
) -> RuntimeResponse:
    """Execute the civic runtime and return the established decision response."""

    try:
        signal = SignalInput(
            title=request.title,
            description=request.description,
            category=request.category,  # type: ignore[arg-type]
            location=request.location,
            source=request.source,
            severity_hint=request.severity_hint,
            metadata=request.metadata,
        )
    except Exception as exc:  # pragma: no cover - preserves the established API error path
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    try:
        result = runtime.execute(
            CityRuntimeRequest(
                workflow_name="complaint_workflow",
                input_data={"signal": signal.model_dump(mode="json")},
                metadata=request.metadata,
            )
        )
    except Exception as exc:  # pragma: no cover - defensive boundary for unexpected failures
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    if result.status == RuntimeStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(result.metadata.get("error", "Runtime execution failed")),
        )

    return _adapt_response(result)
