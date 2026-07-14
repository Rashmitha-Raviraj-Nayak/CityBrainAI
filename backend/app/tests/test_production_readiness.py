from fastapi.testclient import TestClient

from app.main import create_app


def test_metrics_endpoint_exposes_runtime_metrics() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/metrics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "citybrain-ai"
    assert "runtime_requests" in payload["counters"]


def test_security_headers_are_present() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
