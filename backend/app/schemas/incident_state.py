"""Shared incident state passed between agents in the CityBrain AI pipeline."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ReasoningStep(BaseModel):
    """A single reasoning contribution recorded by an agent."""

    agent: str
    output: dict
    why: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IncidentState(BaseModel):
    """Strongly typed incident context shared across the agent workflow."""

    incident_id: str
    citizen_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    input_channels: list[str] = Field(default_factory=list)

    raw_image_url: Optional[str] = None
    raw_transcript: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    issue_type: Optional[str] = None
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None
    urgency: Optional[Literal["low", "medium", "high", "immediate"]] = None
    vision_confidence: Optional[float] = None
    understanding_confidence: Optional[float] = None
    predicted_spread: Optional[dict] = None
    priority_score: Optional[float] = None
    assigned_department: Optional[str] = None
    priority: Optional[str] = None
    decision_confidence: Optional[float] = None
    validated: bool = False

    objects_detected: list[str] = Field(default_factory=list)
    location_clues: list[str] = Field(default_factory=list)
    landmarks: list[str] = Field(default_factory=list)
    department_hint: Optional[str] = None
    people_affected: Optional[str] = None
    supporting_phrases: list[str] = Field(default_factory=list)
    ignored_information: list[str] = Field(default_factory=list)
    is_abusive: bool = False
    is_irrelevant: bool = False
    language_detected: Optional[str] = None
    contradictions: list[str] = Field(default_factory=list)
    hazards_detected: list[str] = Field(default_factory=list)
    damage_indicators: list[str] = Field(default_factory=list)
    visible_evidence: list[str] = Field(default_factory=list)
    possible_risks: list[str] = Field(default_factory=list)
    severity_reason: Optional[str] = None
    issue_type_reason: Optional[str] = None

    predicted_spread: Optional[dict] = None
    prediction_confidence: Optional[float] = None
    decision_confidence: Optional[float] = None
    validation_confidence: Optional[float] = None
    validation_reason: Optional[str] = None
    manual_review: bool = False

    plan: list[str] = Field(default_factory=list)
    reasoning_trace: list[ReasoningStep] = Field(default_factory=list)

    def log(self, agent: str, output: dict, why: str) -> None:
        """Append a reasoning step to the shared incident trace."""

        self.reasoning_trace.append(ReasoningStep(agent=agent, output=output, why=why))
