"""Explainability utilities for the CityBrain AI runtime.

This module turns agent outputs and workflow decisions into structured, human-readable
explanations. It is central to making the platform feel like a real decision engine
rather than a black-box model wrapper.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExplanationStep(BaseModel):
    """A single reasoning step in an explanation chain."""

    model_config = ConfigDict(extra="forbid")

    title: str
    detail: str
    confidence: float = Field(ge=0.0, le=1.0)


class Explanation(BaseModel):
    """Structured explanation emitted for a workflow decision."""

    model_config = ConfigDict(extra="forbid")

    summary: str
    rationale: list[ExplanationStep] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class ExplainabilityEngine:
    """Generates explainable reasoning from workflow outputs."""

    def build_explanation(self, context: dict[str, Any]) -> Explanation:
        """Build a structured explanation from workflow context."""

        title = str(context.get("signal_title", "civic signal"))
        risk_level = str(context.get("risk_level", "medium")).upper()
        department = str(context.get("department", "Municipal Services"))
        confidence = float(context.get("confidence", 0.75))

        rationale = [
            ExplanationStep(
                title="Signal interpretation",
                detail=f"The platform interpreted the report titled '{title}' as a civic operations issue.",
                confidence=confidence,
            ),
            ExplanationStep(
                title="Risk assessment",
                detail=f"The predicted risk level is {risk_level}, which indicates a need for proactive intervention.",
                confidence=confidence,
            ),
            ExplanationStep(
                title="Department routing",
                detail=f"The recommended department is {department}, aligning the issue with the correct operational team.",
                confidence=confidence,
            ),
        ]

        evidence = [
            f"Location context: {context.get('location', 'unknown')}",
            f"Recommended action: {context.get('recommended_action', 'review needed')}",
        ]

        return Explanation(
            summary="The decision was produced by coordinated reasoning across intake, understanding, prediction, and routing stages.",
            rationale=rationale,
            evidence=evidence,
            confidence=confidence,
        )
