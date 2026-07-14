"""Tool abstractions for the CityBrain AI runtime.

Agents must use tools rather than directly reaching into external services. This module
provides typed tool contracts and structured implementations that can later be backed by
Google Gemini, Firestore, Maps, Storage, or notification services.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from app.core.ai_provider import AIProvider, GeminiProvider, ProviderRequest
from app.core.config import Settings, get_settings

logger = logging.getLogger("citybrain.agents.tools")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class ToolResult(BaseModel):
    """Structured result returned by a tool."""

    model_config = ConfigDict(extra="forbid")

    tool_name: str
    success: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class Tool(ABC):
    """Abstract base class for reusable runtime tools."""

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Execute the tool for the provided payload."""


class GeminiTool(Tool):
    """Tool wrapper for Gemini-backed reasoning tasks."""

    def __init__(
        self,
        provider: AIProvider | None = None,
        settings: Settings | None = None,
        logger_instance: logging.Logger | None = None,
    ) -> None:
        super().__init__("gemini")
        self._settings = settings or get_settings()
        self._provider = provider or self._build_default_provider()
        self._logger = logger_instance or logger

    def _build_default_provider(self) -> AIProvider | None:
        """Create the configured Gemini provider while keeping local runs offline."""

        if not self._settings.gemini.api_key:
            return None
        return GeminiProvider(settings=self._settings)

    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Execute a Gemini text-generation request through the provider boundary."""

        prompt = payload.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            return ToolResult(
                tool_name=self.name,
                success=False,
                message="A non-empty prompt is required.",
                data={},
                error="invalid_prompt",
            )

        self._logger.info(
            "Gemini tool invoked",
            extra={"tool_name": self.name, "prompt_length": len(prompt.strip())},
        )

        if self._provider is None:
            self._logger.warning(
                "Gemini tool invoked without a provider",
                extra={"tool_name": self.name, "configured": bool(self._settings.gemini.api_key)},
            )
            return ToolResult(
                tool_name=self.name,
                success=False,
                message="Gemini provider is not configured for execution.",
                data={"prompt": prompt.strip(), "model": self._settings.gemini.model},
                error="provider_not_configured",
            )

        try:
            request_payload = ProviderRequest(
                prompt=prompt.strip(),
                response_format="text",
                temperature=self._settings.gemini.temperature,
                max_output_tokens=self._settings.gemini.max_output_tokens,
                timeout_seconds=self._settings.gemini.request_timeout_seconds,
            )
            provider_response = self._provider.generate(
                prompt.strip(),
                temperature=self._settings.gemini.temperature,
                max_output_tokens=self._settings.gemini.max_output_tokens,
                timeout_seconds=self._settings.gemini.request_timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover - defensive branch for provider failures
            self._logger.exception(
                "Gemini tool execution failed",
                extra={"tool_name": self.name, "error": str(exc)},
            )
            return ToolResult(
                tool_name=self.name,
                success=False,
                message="Gemini tool execution failed.",
                data={"prompt": prompt.strip()},
                error=str(exc),
            )

        return ToolResult(
            tool_name=self.name,
            success=True,
            message="Gemini tool completed successfully.",
            data={
                "prompt": prompt.strip(),
                "response": provider_response,
                "model": self._settings.gemini.model,
                "provider_request": request_payload.model_dump(),
                "provider_response": provider_response,
            },
        )


class FirestoreTool(Tool):
    """Tool wrapper for future Firestore-backed persistence operations."""

    def __init__(self) -> None:
        super().__init__("firestore")

    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Return a structured result for Firestore access."""

        logger.info("Firestore tool invoked", extra={"payload_keys": sorted(payload.keys())})
        return ToolResult(
            tool_name=self.name,
            success=True,
            message="Firestore tool ready for future integration.",
            data={"collection": payload.get("collection", ""), "operation": payload.get("operation", "read")},
        )


class MapsTool(Tool):
    """Tool wrapper for future Google Maps integration."""

    def __init__(self) -> None:
        super().__init__("maps")

    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Return a structured result for Maps operations."""

        logger.info("Maps tool invoked", extra={"payload_keys": sorted(payload.keys())})
        return ToolResult(
            tool_name=self.name,
            success=True,
            message="Maps tool ready for future integration.",
            data={"location": payload.get("location", "")},
        )


class StorageTool(Tool):
    """Tool wrapper for future Cloud Storage operations."""

    def __init__(self) -> None:
        super().__init__("storage")

    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Return a structured result for storage operations."""

        logger.info("Storage tool invoked", extra={"payload_keys": sorted(payload.keys())})
        return ToolResult(
            tool_name=self.name,
            success=True,
            message="Storage tool ready for future integration.",
            data={"bucket": payload.get("bucket", "")},
        )


class NotificationTool(Tool):
    """Tool wrapper for future notification workflows."""

    def __init__(self) -> None:
        super().__init__("notification")

    def execute(self, payload: dict[str, Any]) -> ToolResult:
        """Return a structured result for notifications."""

        logger.info("Notification tool invoked", extra={"payload_keys": sorted(payload.keys())})
        return ToolResult(
            tool_name=self.name,
            success=True,
            message="Notification tool ready for future integration.",
            data={"recipient": payload.get("recipient", "")},
        )
