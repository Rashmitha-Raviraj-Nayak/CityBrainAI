"""Exception types and handlers for the CityBrain AI backend.

This module provides typed exceptions for the runtime and API layers so failures can be
handled consistently and surfaced with meaningful context.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AppError(Exception):
    """Base exception for application-level failures."""

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(AppError):
    """Raised when input validation fails."""


class RuntimeExecutionError(AppError):
    """Raised when the AI runtime fails unexpectedly."""


class DecisionNotFoundError(AppError):
    """Raised when a requested decision cannot be found."""


class ErrorResponse(BaseModel):
    """Structured error response payload."""

    model_config = ConfigDict(extra="forbid")

    message: str
    details: dict[str, Any] = Field(default_factory=dict)
