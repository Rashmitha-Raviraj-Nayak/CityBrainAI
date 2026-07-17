from app.runtime.runtime import CityRuntime, RuntimeRequest, RuntimeStatus


def test_civic_runtime_executes_full_pipeline() -> None:
    runtime = CityRuntime.create_civic_runtime()
    response = runtime.execute(
        RuntimeRequest(
            workflow_name="complaint_workflow",
            input_data={
                "signal": {
                    "title": "Blocked storm drain flooding the street",
                    "description": "Heavy rain caused water to pool near the downtown drainage inlet and traffic is backing up.",
                    "category": "infrastructure",
                    "location": "Downtown District",
                    "source": "citizen_report",
                    "severity_hint": 8,
                    "metadata": {"channel": "web"},
                }
            },
            metadata={"workflow_name": "complaint_workflow"},
        )
    )

    assert response.status == RuntimeStatus.SUCCESS
    assert response.result.get("supervisor") is not None
    assert response.result.get("decision")
    assert response.summary
