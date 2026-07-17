"""Centralized configuration management for the CityBrain AI backend."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class ApplicationSettings(BaseModel):
    """Application-wide runtime settings."""

    model_config = ConfigDict(extra="forbid")

    environment: Literal["development", "testing", "production"] = Field(
        default="development",
        description="Runtime environment of the service.",
    )
    debug: bool = Field(default=False, description="Enable debug mode for local development.")
    project_name: str = Field(default="CityBrain AI", description="Public project name.")
    api_prefix: str = Field(default="/api", description="Base API path prefix.")
    service_name: str = Field(default="citybrain-ai", description="Service identifier used in logs.")


class GeminiSettings(BaseModel):
    """Settings for Google Gemini model access."""

    model_config = ConfigDict(extra="forbid")

    api_key: str = Field(default="", description="Google Gemini API key.")
    model: str = Field(default="gemini-2.5-flash", description="Gemini model identifier.")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0, description="Model temperature.")
    max_output_tokens: int = Field(default=2048, ge=1, description="Maximum token budget for model output.")
    request_timeout_seconds: int = Field(default=60, ge=1, description="HTTP timeout for Gemini requests.")


class FirebaseSettings(BaseModel):
    """Settings for Firebase and Firestore integration."""

    model_config = ConfigDict(extra="forbid")

    project_id: str = Field(default="", description="Google Cloud Firebase project identifier.")
    storage_bucket: str | None = Field(default=None, description="Firebase Storage bucket name.")
    auth_enabled: bool = Field(default=True, description="Whether Firebase Authentication is enabled.")
    emulator_host: str | None = Field(default=None, description="Firebase emulator host for local testing.")
    credentials_path: str | None = Field(default=None, description="Path to a Firebase service account credentials file.")


class GoogleMapsSettings(BaseModel):
    """Settings for Google Maps platform integration."""

    model_config = ConfigDict(extra="forbid")

    api_key: str = Field(default="", description="Google Maps API key.")
    enabled: bool = Field(default=False, description="Whether Google Maps services are enabled.")
    default_latitude: float = Field(default=37.7749, description="Default latitude for location-based workflows.")
    default_longitude: float = Field(default=-122.4194, description="Default longitude for location-based workflows.")
    request_timeout_seconds: int = Field(default=20, ge=1, description="HTTP timeout for Maps API requests.")


class SecuritySettings(BaseModel):
    """Security-related runtime settings."""

    model_config = ConfigDict(extra="forbid")

    jwt_secret_key: str = Field(default="development-secret-key", description="Secret key used to sign internal JWTs.")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm.")
    jwt_access_token_expire_minutes: int = Field(default=60, ge=1, description="JWT access token lifetime.")
    api_key_header: str = Field(default="X-API-Key", description="Header name for API key authentication.")
    api_key_required: bool = Field(default=False, description="Require API key validation for incoming requests.")


class LoggingSettings(BaseModel):
    """Structured logging configuration."""

    model_config = ConfigDict(extra="forbid")

    level: str = Field(default="INFO", description="Default logging level.")
    format: str = Field(default="standard", description="Logging formatter style.")
    enable_structured_logs: bool = Field(default=True, description="Enable structured JSON logging when supported.")

    @field_validator("level")
    @classmethod
    def validate_level(cls, value: str) -> str:
        """Normalize and validate the logging level."""

        normalized = value.strip().upper()
        allowed_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if normalized not in allowed_levels:
            raise ValueError(f"Invalid logging level: {value}")
        return normalized


class CorsSettings(BaseModel):
    """Cross-origin request configuration."""

    model_config = ConfigDict(extra="forbid")

    allowed_origins: list[str] = Field(default_factory=lambda: ["*"], description="Allowed origins for CORS.")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: object) -> list[str]:
        """Allow CORS origins to be provided as a comma-separated environment string."""

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return ["*"]


class Settings(BaseSettings):
    """Top-level application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_assignment=True,
        case_sensitive=False,
        env_prefix="CITYBRAIN_",
        env_nested_delimiters="__",
    )

    application: ApplicationSettings = Field(default_factory=ApplicationSettings)
    gemini: GeminiSettings = Field(default_factory=GeminiSettings)
    firebase: FirebaseSettings = Field(default_factory=FirebaseSettings)
    google_maps: GoogleMapsSettings = Field(default_factory=GoogleMapsSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    cors: CorsSettings = Field(default_factory=CorsSettings)

    def __init__(self, **values: Any) -> None:
        direct_gemini_values: dict[str, Any] = {}
        for env_name, field_name in {
            "GEMINI_API_KEY": "api_key",
            "GEMINI_MODEL": "model",
            "GEMINI_TEMPERATURE": "temperature",
            "GEMINI_MAX_OUTPUT_TOKENS": "max_output_tokens",
            "GEMINI_REQUEST_TIMEOUT_SECONDS": "request_timeout_seconds",
        }.items():
            env_value = os.getenv(env_name)
            if env_value is not None and env_value != "":
                direct_gemini_values[field_name] = env_value

        if direct_gemini_values:
            existing_gemini = values.get("gemini")
            if isinstance(existing_gemini, dict):
                values["gemini"] = {**existing_gemini, **direct_gemini_values}
            else:
                values["gemini"] = direct_gemini_values

        super().__init__(**values)

    @property
    def is_development(self) -> bool:
        """Return True when the application is running in development mode."""

        return self.application.environment == "development"

    @property
    def is_testing(self) -> bool:
        """Return True when the application is running in testing mode."""

        return self.application.environment == "testing"

    @property
    def is_production(self) -> bool:
        """Return True when the application is running in production mode."""

        return self.application.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance for the application."""

    return Settings()
