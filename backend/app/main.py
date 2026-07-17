"""Application entrypoint for the CityBrain AI backend service."""

from __future__ import annotations

import logging
import logging.config
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from app.api.health_router import router as health_router
from app.api.metrics import router as metrics_router
from app.api.router import router as runtime_router
from app.core.config import get_settings


class RootResponse(BaseModel):
    """Response model for the service root endpoint."""

    model_config = ConfigDict(extra="forbid")

    message: str
    service: str


class HealthResponse(BaseModel):
    """Response model for the health endpoint."""

    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    timestamp: datetime


def configure_logging() -> None:
    """Configure structured logging for the application."""

    settings = get_settings()
    log_level = settings.logging.level
    formatter_name = "json" if settings.logging.format.lower() == "json" else "standard"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
                },
                "json": {
                    "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": formatter_name,
                    "stream": "ext://sys.stdout",
                }
            },
            "root": {"handlers": ["console"], "level": log_level},
            "loggers": {
                "citybrain": {
                    "handlers": ["console"],
                    "level": log_level,
                    "propagate": False,
                }
            },
        }
    )


def get_allowed_origins() -> list[str]:
    """Read allowed CORS origins from environment variables."""

    settings = get_settings()
    origins = settings.cors.allowed_origins
    if settings.application.environment == "production" and origins == ["*"]:
        return ["https://localhost", "http://localhost"]
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application startup and shutdown lifecycle hooks."""

    logger = logging.getLogger("citybrain")
    settings = get_settings()
    logger.info(
        "Starting CityBrain AI service",
        extra={"event": "startup", "service": settings.application.service_name},
    )

    try:
        app.state.service_name = settings.application.service_name
        app.state.metrics = {"requests": 0, "runtime_requests": 0, "errors": 0}
        app.state.started_at = time.time()
        app.state.uptime_seconds = 0
        app.state.startup_complete = True
        app.state.environment = settings.application.environment
        yield
    finally:
        logger.info(
            "Shutting down CityBrain AI service",
            extra={"event": "shutdown", "service": settings.application.service_name},
        )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title="CityBrain AI",
        version="0.1.0",
        description="Predictive civic intelligence platform powered by Google ADK and Gemini.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    allowed_origins = get_allowed_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allowed_origins != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        """Attach production-grade security headers to every response."""

        response = await call_next(request)
        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "DENY"
        response.headers["x-xss-protection"] = "1; mode=block"
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"
        response.headers["permissions-policy"] = "geolocation=(), microphone=()"
        response.headers["x-content-security-policy"] = "default-src 'self'; frame-ancestors 'none'"
        return response

    @app.middleware("http")
    async def collect_metrics(request: Request, call_next):
        """Track request and runtime usage counters in process memory."""

        if not hasattr(app.state, "metrics"):
            app.state.metrics = {"requests": 0, "runtime_requests": 0, "errors": 0}
        if not hasattr(app.state, "started_at"):
            app.state.started_at = time.time()
        app.state.metrics["requests"] = int(app.state.metrics.get("requests", 0)) + 1
        response = await call_next(request)
        if request.url.path.startswith("/api/v1/run"):
            app.state.metrics["runtime_requests"] = int(app.state.metrics.get("runtime_requests", 0)) + 1
        if response.status_code >= 500:
            app.state.metrics["errors"] = int(app.state.metrics.get("errors", 0)) + 1
        app.state.uptime_seconds = int(time.time() - app.state.started_at)
        return response

    router = APIRouter(tags=["health"])

    @router.get("/", response_model=RootResponse, status_code=status.HTTP_200_OK, summary="Service root")
    async def root() -> RootResponse:
        """Return a basic acknowledgement that the service is running."""

        return RootResponse(
            message="CityBrain AI API is running.",
            service=settings.application.service_name,
        )

    app.include_router(router)
    app.include_router(health_router)
    app.include_router(runtime_router)
    app.include_router(metrics_router)
    return app


app = create_app()
