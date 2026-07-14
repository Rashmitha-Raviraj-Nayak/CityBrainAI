"""Vision Agent — interprets image and video-frame input for the CityBrain pipeline."""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel

from app.agents.confidence import compute_composite_confidence, schema_completeness
from app.agents.maps_enrichment import enrich_if_needed
from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

try:
    from google.adk.agents import Agent
except Exception:  # pragma: no cover - allows tests to run without ADK installed
    Agent = None  # type: ignore[assignment]


VISION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "issue_type": {
            "type": "string",
            "enum": [
                "flood",
                "road_damage",
                "garbage_overflow",
                "fire",
                "illegal_dumping",
                "water_leakage",
                "traffic_congestion",
                "other",
            ],
        },
        "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
        "model_confidence": {"type": "number"},
        "objects_detected": {"type": "array", "items": {"type": "string"}},
        "hazards_detected": {"type": "array", "items": {"type": "string"}},
        "damage_indicators": {"type": "array", "items": {"type": "string"}},
        "visible_evidence": {"type": "array", "items": {"type": "string"}},
        "possible_risks": {"type": "array", "items": {"type": "string"}},
        "severity_reason": {"type": "string"},
        "issue_type_reason": {"type": "string"},
    },
    "required": [
        "issue_type",
        "severity",
        "model_confidence",
        "hazards_detected",
        "visible_evidence",
        "severity_reason",
        "issue_type_reason",
    ],
}

FILTER_PROMPT = "Is this a usable, in-focus photo of a real-world civic scene? Reply only 'yes' or 'no'."
ANALYSIS_PROMPT = """
You are the Vision Agent for CityBrain AI. Analyze this civic incident image in detail.
Identify objects, hazards, and damage indicators, then explain your reasoning for both
issue_type and severity explicitly. Base severity on visible extent and immediate risk
to people.
"""


class VisionOutput(BaseModel):
    """Structured output produced by the Vision Agent."""

    issue_type: str
    severity: Literal["low", "medium", "high", "critical"]
    model_confidence: float
    objects_detected: list[str] = []
    hazards_detected: list[str]
    damage_indicators: list[str] = []
    visible_evidence: list[str]
    possible_risks: list[str] = []
    severity_reason: str
    issue_type_reason: str


class _VisionPlannerProxy:
    """Simple proxy with the same async interface used by the real ADK agent."""

    async def run_async(self, payload: object) -> object:
        raise RuntimeError("ADK vision agent is unavailable")


if Agent is not None:
    vision_prefilter = Agent(name="vision_prefilter", model="gemini-2.5-flash", instruction=FILTER_PROMPT)
    vision_agent = Agent(
        name="vision_agent",
        model="gemini-2.5-pro",
        instruction=ANALYSIS_PROMPT,
        generate_content_config={"response_mime_type": "application/json", "response_schema": VISION_RESPONSE_SCHEMA},
    )
else:
    vision_prefilter = _VisionPlannerProxy()
    vision_agent = _VisionPlannerProxy()


async def analyze_image(state: IncidentState, image_quality_score: float = 1.0, retries: int = 0) -> IncidentState:
    """Run vision analysis for the incident and write structured results onto state."""

    if not state.raw_image_url:
        logger.warning("vision_agent called with no image URL on incident %s", state.incident_id)
        return state

    try:
        prefilter_response = await vision_prefilter.run_async({"image_url": state.raw_image_url})
        if "no" in str(prefilter_response.text).strip().lower():
            state.log(
                agent="vision_agent",
                output={"skipped": True},
                why="Flash pre-filter judged the image unusable; skipped Pro analysis to save cost.",
            )
            state.vision_confidence = 0.0
            return state

        response = await vision_agent.run_async({"image_url": state.raw_image_url})
        parsed = VisionOutput.model_validate_json(response.text)
        parsed_dict = parsed.model_dump()

        completeness = schema_completeness(parsed_dict)
        composite_confidence = compute_composite_confidence(parsed.model_confidence, image_quality_score, completeness)

        state.issue_type = parsed.issue_type
        state.severity = parsed.severity
        state.vision_confidence = composite_confidence
        state.objects_detected = parsed.objects_detected
        state.hazards_detected = parsed.hazards_detected
        state.damage_indicators = parsed.damage_indicators
        state.visible_evidence = parsed.visible_evidence
        state.possible_risks = parsed.possible_risks + enrich_if_needed(state.lat, state.lng, parsed.severity)
        state.severity_reason = parsed.severity_reason
        state.issue_type_reason = parsed.issue_type_reason

        state.log(
            agent="vision_agent",
            output=parsed_dict,
            why=(
                f"{parsed.issue_type_reason} {parsed.severity_reason} Composite confidence {composite_confidence:.0%} "
                f"(model {parsed.model_confidence:.0%}, image quality {image_quality_score:.0%})."
            ),
        )
    except Exception as exc:
        if retries < 1:
            logger.warning("Vision agent retrying on incident %s after error: %s", state.incident_id, exc)
            return await analyze_image(state, image_quality_score, retries + 1)

        logger.error("Vision agent failed after retry on incident %s: %s", state.incident_id, exc)
        state.issue_type = state.issue_type or "unknown"
        state.severity = state.severity or "medium"
        state.vision_confidence = 0.0
        state.log(
            agent="vision_agent",
            output={"error": str(exc)},
            why="Vision analysis failed after retry; defaulting to medium severity pending human review.",
        )

    return state
