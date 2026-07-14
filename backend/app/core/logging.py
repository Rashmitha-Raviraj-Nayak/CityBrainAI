"""Centralized logging infrastructure for the CityBrain AI backend."""

from __future__ import annotations

import contextvars
import logging
import logging.config
import sys
from collections.abc import MutableMapping
from typing import Any

from app.core.config import get_settings

REQUEST_ID_CONTEXT: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id",
    default=None,
)


class ContextualFilter(logging.Filter):
    """Inject request-scoped metadata into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Attach contextual values to log records."""

        request_id = REQUEST_ID_CONTEXT.get()
        if request_id is not None:
            record.request_id = request_id
        else:
            record.request_id = "-"

        return True


class JsonFormatter(logging.Formatter):
    """Formatter that emits structured JSON logs."""

    def format(self, record: logging.LogRecord) -> str:
        """Serialize the log record into a JSON-compatible dictionary."""

        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra") and isinstance(record.extra, MutableMapping):
            payload.update(dict(record.extra))

        return str(payload)


def configure_logging() -> None:
    """Configure logging based on shared application settings."""

    settings = get_settings()
    formatter_name = "json" if settings.logging.format.lower() == "json" else "standard"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "contextual": {
                    "()": "app.core.logging.ContextualFilter",
                }
            },
            "formatters": {
                "standard": {
                    "format": "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
                },
                "json": {
                    "()": "app.core.logging.JsonFormatter",
                    "datefmt": "%Y-%m-%dT%H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "stream": sys.stdout,
                    "formatter": formatter_name,
                    "filters": ["contextual"],
                }
            },
            "root": {
                "handlers": ["console"],
                "level": settings.logging.level,
            },
            "loggers": {
                "citybrain": {
                    "handlers": ["console"],
                    "level": settings.logging.level,
                    "propagate": False,
                }
            },
        }
    )


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger for the specified module."""

    return logging.getLogger(name)


def set_request_id(request_id: str | None) -> None:
    """Set the request ID for the current execution context."""

    REQUEST_ID_CONTEXT.set(request_id)


def clear_request_id() -> None:
    """Clear the request ID from the current execution context."""

    REQUEST_ID_CONTEXT.set(None)


def log_exception(logger: logging.Logger, message: str, exc: Exception, **context: Any) -> None:
    """Log an exception with contextual metadata."""

    logger.exception(message, extra={"extra": context}, exc_info=exc)
