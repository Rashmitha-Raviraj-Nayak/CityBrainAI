"""Production-grade AI provider abstraction for CityBrain OS.

This module provides the single intelligence gateway for all future agents. It sits
below the tool layer and above the raw Gemini API transport so agents and tools can
remain provider-agnostic while still supporting structured text and JSON generation.
"""

from __future__ import annotations

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Literal
from urllib import error, request

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings, get_settings

logger = logging.getLogger("citybrain.core.ai_provider")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class SafetySettings(BaseModel):
    """Safety threshold configuration sent to the provider."""

    model_config = ConfigDict(extra="forbid")

    harassment: str = Field(default="BLOCK_MEDIUM_AND_ABOVE", description="Harassment safety threshold")
    hate_speech: str = Field(default="BLOCK_MEDIUM_AND_ABOVE", description="Hate speech safety threshold")
    self_harm: str = Field(default="BLOCK_MEDIUM_AND_ABOVE", description="Self-harm safety threshold")
    sexual: str = Field(default="BLOCK_MEDIUM_AND_ABOVE", description="Sexual content safety threshold")
    dangerous: str = Field(default="BLOCK_MEDIUM_AND_ABOVE", description="Dangerous content safety threshold")


class ProviderRequest(BaseModel):
    """Typed request payload for model generation."""

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(..., min_length=1, description="User prompt or instruction")
    system_instruction: str | None = Field(default=None, description="Optional system instruction")
    response_format: Literal["text", "json"] = Field(default="text", description="Requested response shape")
    temperature: float | None = Field(default=None, ge=0.0, le=1.0, description="Sampling temperature")
    max_output_tokens: int | None = Field(default=None, ge=1, description="Maximum tokens for the response")
    timeout_seconds: int | None = Field(default=None, ge=1, description="Request timeout in seconds")
    safety_settings: SafetySettings | None = Field(default=None, description="Safety threshold configuration")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional request metadata")


class ProviderResponse(BaseModel):
    """Typed response produced by the provider layer."""

    model_config = ConfigDict(extra="forbid")

    text: str | None = Field(default=None, description="Generated text response")
    json_data: dict[str, Any] | None = Field(default=None, description="Parsed JSON response")
    model: str
    finish_reason: str | None = Field(default=None, description="Provider finish reason")
    usage: dict[str, Any] = Field(default_factory=dict, description="Token usage metadata")


class ProviderError(Exception):
    """Structured provider error raised for transport or model failures."""

    def __init__(self, message: str, *, code: str, retryable: bool = False, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.retryable = retryable
        self.details = details or {}


class AIProvider(ABC):
    """Abstract contract for model providers used by the runtime."""

    @abstractmethod
    def generate(self, prompt: str, *, temperature: float | None = None, max_output_tokens: int | None = None, timeout_seconds: int | None = None) -> str:
        """Generate text from a prompt and return a plain string."""

    @abstractmethod
    async def generate_async(self, request: ProviderRequest) -> ProviderResponse:
        """Generate a typed response asynchronously."""


class GeminiProvider(AIProvider):
    """Concrete provider that talks to the Google Gemini REST API."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        logger_instance: logging.Logger | None = None,
        max_retries: int = 3,
    ) -> None:
        self._settings = settings or get_settings()
        self._logger = logger_instance or logger
        self._max_retries = max(0, max_retries)

    def generate(self, prompt: str, *, temperature: float | None = None, max_output_tokens: int | None = None, timeout_seconds: int | None = None) -> str:
        """Synchronously generate text from a prompt using the Gemini API."""

        request_payload = ProviderRequest(
            prompt=prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            timeout_seconds=timeout_seconds,
        )
        response = self._execute_with_retries(request_payload)
        if response.text is None:
            raise ProviderError("Gemini provider returned no text content.", code="empty_response")
        return response.text

    async def generate_async(self, request: ProviderRequest) -> ProviderResponse:
        """Generate a typed response asynchronously."""

        self._logger.info(
            "Gemini provider request started",
            extra={
                "model": self._settings.gemini.model,
                "response_format": request.response_format,
                "prompt_length": len(request.prompt),
            },
        )

        if not self._settings.gemini.api_key:
            raise ProviderError(
                "Gemini API key is not configured.",
                code="missing_api_key",
                retryable=False,
            )

        endpoint = self._build_endpoint(request)
        payload = self._build_payload(request)
        timeout = request.timeout_seconds or self._settings.gemini.request_timeout_seconds

        for attempt in range(self._max_retries + 1):
            try:
                raw_response = await asyncio.to_thread(self._send_request, endpoint, payload, timeout)
                return self._parse_response(raw_response, request)
            except ProviderError as exc:
                if attempt >= self._max_retries or not exc.retryable:
                    raise
                self._logger.warning(
                    "Gemini provider attempt failed; retrying",
                    extra={"attempt": attempt + 1, "code": exc.code, "max_retries": self._max_retries},
                )
            except Exception as exc:  # pragma: no cover - defensive branch
                if attempt >= self._max_retries:
                    raise ProviderError(
                        "Gemini provider request failed unexpectedly.",
                        code="unexpected_error",
                        retryable=True,
                        details={"error": str(exc)},
                    ) from exc
                self._logger.warning(
                    "Gemini provider attempt failed; retrying",
                    extra={"attempt": attempt + 1, "error": str(exc)},
                )

        raise ProviderError("Gemini provider request exhausted retries.", code="retry_exhausted", retryable=False)

    def _execute_with_retries(self, request_payload: ProviderRequest) -> ProviderResponse:
        """Execute the provider request using retry logic and return a typed response."""

        for attempt in range(self._max_retries + 1):
            try:
                return self._run_request(request_payload)
            except ProviderError as exc:
                if attempt >= self._max_retries or not exc.retryable:
                    raise
                self._logger.warning(
                    "Gemini provider attempt failed; retrying",
                    extra={"attempt": attempt + 1, "code": exc.code, "max_retries": self._max_retries},
                )
        raise ProviderError("Gemini provider request exhausted retries.", code="retry_exhausted", retryable=False)

    def _run_request(self, request_payload: ProviderRequest) -> ProviderResponse:
        """Execute a provider request and return a typed response."""

        if not self._settings.gemini.api_key:
            raise ProviderError("Gemini API key is not configured.", code="missing_api_key", retryable=False)

        endpoint = self._build_endpoint(request_payload)
        payload = self._build_payload(request_payload)
        timeout = request_payload.timeout_seconds or self._settings.gemini.request_timeout_seconds
        raw_response = self._send_request(endpoint, payload, timeout)
        return self._parse_response(raw_response, request_payload)

    def _send_request(self, endpoint: str, payload: dict[str, Any], timeout: int) -> dict[str, Any]:
        """Send an HTTP request to the Gemini REST endpoint."""

        data = json.dumps(payload).encode("utf-8")
        req = request.Request(endpoint, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else {}
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise ProviderError(
                "Gemini API returned an HTTP error.",
                code="http_error",
                retryable=True,
                details={"status_code": exc.code, "response": detail},
            ) from exc
        except error.URLError as exc:
            raise ProviderError(
                "Gemini API request could not be completed.",
                code="network_error",
                retryable=True,
                details={"reason": str(exc.reason)},
            ) from exc
        except json.JSONDecodeError as exc:
            raise ProviderError(
                "Gemini API returned an invalid JSON payload.",
                code="invalid_json",
                retryable=False,
                details={"error": str(exc)},
            ) from exc

    def _build_endpoint(self, request_payload: ProviderRequest) -> str:
        """Construct the REST endpoint for the requested model."""

        model_name = self._settings.gemini.model
        return f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self._settings.gemini.api_key}"

    def _build_payload(self, request_payload: ProviderRequest) -> dict[str, Any]:
        """Build the normalized payload sent to Gemini."""

        temperature = request_payload.temperature if request_payload.temperature is not None else self._settings.gemini.temperature
        max_output_tokens = request_payload.max_output_tokens if request_payload.max_output_tokens is not None else self._settings.gemini.max_output_tokens
        safety_settings = self._build_safety_settings(request_payload.safety_settings)

        contents: list[dict[str, Any]] = []
        parts: list[dict[str, Any]] = [{"text": request_payload.prompt}]
        if request_payload.system_instruction:
            parts.insert(0, {"text": f"System instruction: {request_payload.system_instruction}"})
        contents.append({"role": "user", "parts": parts})

        generation_config: dict[str, Any] = {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        }
        if request_payload.response_format == "json":
            generation_config["responseMimeType"] = "application/json"

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": generation_config,
        }
        if safety_settings:
            payload["safetySettings"] = safety_settings
        return payload

    def _build_safety_settings(self, settings: SafetySettings | None) -> list[dict[str, str]]:
        """Translate internal safety settings into Gemini-compatible payload entries."""

        if settings is None:
            return []
        return [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": settings.harassment},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": settings.hate_speech},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": settings.sexual},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": settings.dangerous},
            {"category": "HARM_CATEGORY_SELF_HARM", "threshold": settings.self_harm},
        ]

    def _parse_response(self, raw_response: dict[str, Any], request_payload: ProviderRequest) -> ProviderResponse:
        """Convert raw Gemini payload into a typed internal response model."""

        candidates = raw_response.get("candidates") or []
        if not candidates:
            raise ProviderError(
                "Gemini API returned no candidates.",
                code="no_candidates",
                retryable=False,
                details={"raw_response": raw_response},
            )

        candidate = candidates[0]
        finish_reason = candidate.get("finishReason")
        parts = (candidate.get("content") or {}).get("parts") or []
        text_value = ""
        for part in parts:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                text_value += part["text"]

        if not text_value:
            raise ProviderError("Gemini API returned an empty content payload.", code="empty_content", retryable=False)

        json_data: dict[str, Any] | None = None
        if request_payload.response_format == "json":
            try:
                json_data = json.loads(text_value)
            except json.JSONDecodeError as exc:
                raise ProviderError(
                    "Gemini API returned invalid JSON content.",
                    code="invalid_json_response",
                    retryable=False,
                    details={"raw_text": text_value},
                ) from exc

        self._logger.info(
            "Gemini provider request completed",
            extra={
                "model": self._settings.gemini.model,
                "finish_reason": finish_reason,
                "response_format": request_payload.response_format,
            },
        )
        return ProviderResponse(
            text=text_value if request_payload.response_format == "text" else None,
            json_data=json_data,
            model=self._settings.gemini.model,
            finish_reason=str(finish_reason) if finish_reason is not None else None,
            usage=raw_response.get("usageMetadata") or {},
        )
