"""Runtime configuration for the CityBrain AI agents.

This module centralizes non-secret runtime tuning for the engine, workflows, and
agent behavior. It enables the platform to change thresholds, retries, and defaults
without modifying core logic.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AgentRuntimeConfig(BaseModel):
    """Configuration values that affect agent execution behavior."""

    model_config = ConfigDict(extra="forbid")

    default_confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    max_retries: int = Field(default=2, ge=0)
    workflow_timeout_seconds: int = Field(default=30, ge=1)
    enable_explainability: bool = Field(default=True)
    enable_validation: bool = Field(default=True)


DEFAULT_AGENT_RUNTIME_CONFIG = AgentRuntimeConfig()
