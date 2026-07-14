"""Central configuration for backend services."""

from __future__ import annotations

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcp_project_id: str = os.getenv("GCP_PROJECT_ID", "citybrain-ai")
    gcp_credentials_path: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "backend/config/gcp-key.json")
    gemini_vision_model: str = "gemini-2.5-pro"
    gemini_flash_model: str = "gemini-2.5-flash"
    maps_api_key: str = os.getenv("MAPS_API_KEY", "")

    class Config:
        env_file = ".env"


settings = Settings()
