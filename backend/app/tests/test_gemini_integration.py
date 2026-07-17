import os

from app.core.config import Settings


def test_settings_read_gemini_environment_variables(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-pro")
    monkeypatch.setenv("GEMINI_REQUEST_TIMEOUT_SECONDS", "45")
    monkeypatch.delenv("CITYBRAIN_GEMINI__API_KEY", raising=False)
    monkeypatch.delenv("CITYBRAIN_GEMINI__MODEL", raising=False)
    monkeypatch.delenv("CITYBRAIN_GEMINI__REQUEST_TIMEOUT_SECONDS", raising=False)

    settings = Settings()

    assert settings.gemini.api_key == "test-gemini-key"
    assert settings.gemini.model == "gemini-2.5-pro"
    assert settings.gemini.request_timeout_seconds == 45
