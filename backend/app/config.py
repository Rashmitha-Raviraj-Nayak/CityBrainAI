"""Backward-compatible configuration shim for legacy backend imports."""

from __future__ import annotations

import os
from typing import Any

from app.core.config import Settings as CoreSettings, get_settings


class Settings:
    """Provide the historical settings interface while delegating to the centralized config."""

    def __init__(self, *, core_settings: CoreSettings | None = None) -> None:
        self._core_settings = core_settings or get_settings()

    @property
    def application(self) -> Any:
        return self._core_settings.application

    @property
    def gemini(self) -> Any:
        return self._core_settings.gemini

    @property
    def firebase(self) -> Any:
        return self._core_settings.firebase

    @property
    def google_maps(self) -> Any:
        return self._core_settings.google_maps

    @property
    def security(self) -> Any:
        return self._core_settings.security

    @property
    def logging(self) -> Any:
        return self._core_settings.logging

    @property
    def cors(self) -> Any:
        return self._core_settings.cors

    @property
    def gcp_project_id(self) -> str:
        return self._core_settings.firebase.project_id or os.getenv("GCP_PROJECT_ID", "citybrain-ai")

    @property
    def gcp_credentials_path(self) -> str:
        return self._core_settings.firebase.credentials_path or os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "backend/config/gcp-key.json",
        )

    @property
    def gemini_vision_model(self) -> str:
        return self._core_settings.gemini.model

    @property
    def gemini_flash_model(self) -> str:
        return self._core_settings.gemini.model

    @property
    def maps_api_key(self) -> str:
        return self._core_settings.google_maps.api_key

    def __getattr__(self, name: str) -> Any:
        """Proxy any other attribute access to the centralized settings model."""

        if name in {"project_name", "service_name", "environment", "debug"}:
            return getattr(self._core_settings.application, name)
        if name in {"api_key_header", "api_key_required", "jwt_secret_key", "jwt_algorithm"}:
            return getattr(self._core_settings.security, name)
        if name in {"allowed_origins"}:
            return getattr(self._core_settings.cors, name)
        return getattr(self._core_settings, name)


settings = Settings()
