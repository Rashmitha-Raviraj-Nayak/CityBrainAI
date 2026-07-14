"""Understanding Agent — parses text reports into a structured incident shape."""

from __future__ import annotations

import logging
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.agents.confidence import schema_completeness
from app.agents.merge_vision_understanding import merge_with_vision
from app.config import settings
from app.schemas.incident_state import IncidentState

logger = logging.getLogger(__name__)

UNDERSTANDING_RESPONSE_SCHEMA = {
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
        "urgency": {"type": "string", "enum": ["low", "medium", "high", "immediate"]},
        "location_clues": {"type": "array", "items": {"type": "string"}},
        "landmarks": {"type": "array", "items": {"type": "string"}},
        "department_hint": {"type": "string"},
        "hazards": {"type": "array", "items": {"type": "string"}},
        "people_affected": {"type": "string"},
        "model_confidence": {"type": "number"},
        "supporting_phrases": {"type": "array", "items": {"type": "string"}},
        "ignored_information": {"type": "array", "items": {"type": "string"}},
        "issue_type_reason": {"type": "string"},
        "severity_reason": {"type": "string"},
        "is_abusive": {"type": "boolean"},
        "is_irrelevant": {"type": "boolean"},
        "language_detected": {"type": "string"},
    },
    "required": [
        "issue_type",
        "severity",
        "urgency",
        "model_confidence",
        "supporting_phrases",
        "issue_type_reason",
        "severity_reason",
        "is_abusive",
        "is_irrelevant",
        "language_detected",
    ],
}

UNDERSTANDING_PROMPT = """
You are the Understanding Agent for CityBrain AI, a civic incident reporting system.
The citizen report may be in any language. Regardless of input language, always
respond with English field values.

Extract structured incident information from the report. Quote the exact phrases
(translated to English if needed) that support your issue_type and severity
choices in supporting_phrases. List any information in the report you deliberately
ignored as irrelevant to classification in ignored_information.

Set is_abusive=true if the report contains harassment, hate speech, or threats
directed at any person. Set is_irrelevant=true if the report is not a genuine
civic incident (for example spam, testing, or unrelated question) — in either
case, still fill required fields with your best-effort defaults (issue_type="other",
severity="low") so the schema remains valid.

Never fabricate location details, landmarks, or people_affected counts that are
not stated or clearly implied by the report — leave those lists/fields empty
rather than guessing.
"""


class UnderstandingOutput(BaseModel):
    issue_type: str
    severity: Literal["low", "medium", "high", "critical"]
    urgency: Literal["low", "medium", "high", "immediate"]
    location_clues: list[str] = Field(default_factory=list)
    landmarks: list[str] = Field(default_factory=list)
    department_hint: Optional[str] = None
    hazards: list[str] = Field(default_factory=list)
    people_affected: Optional[str] = None
    model_confidence: float
    supporting_phrases: list[str]
    ignored_information: list[str] = Field(default_factory=list)
    issue_type_reason: str
    severity_reason: str
    is_abusive: bool
    is_irrelevant: bool
    language_detected: str


class _FallbackAgent:
    """A lightweight fallback when the ADK runtime is unavailable."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        self.name = kwargs.get("name", "understanding_agent")
        self.model = kwargs.get("model", settings.gemini_flash_model)
        self.instruction = kwargs.get("instruction", UNDERSTANDING_PROMPT)
        self.generate_content_config = kwargs.get(
            "generate_content_config",
            {"response_mime_type": "application/json", "response_schema": UNDERSTANDING_RESPONSE_SCHEMA},
        )

    async def run_async(self, payload: dict) -> object:
        return type(
            "Response",
            (),
            {
                "text": '{"issue_type":"other","severity":"low","urgency":"low","location_clues":[],"landmarks":[],"department_hint":null,"hazards":[],"people_affected":null,"model_confidence":0.2,"supporting_phrases":[],"ignored_information":[],"issue_type_reason":"Fallback because ADK is unavailable.","severity_reason":"Fallback because ADK is unavailable.","is_abusive":false,"is_irrelevant":true,"language_detected":"en"}'
            },
        )()


try:
    from google.adk.agents import Agent
except Exception:  # pragma: no cover - fallback for environments without ADK
    Agent = _FallbackAgent  # type: ignore[assignment]


understanding_agent = Agent(
    name="understanding_agent",
    model=settings.gemini_flash_model,
    instruction=UNDERSTANDING_PROMPT,
    generate_content_config={
        "response_mime_type": "application/json",
        "response_schema": UNDERSTANDING_RESPONSE_SCHEMA,
    },
)


async def understand_report(state: IncidentState, retries: int = 0) -> IncidentState:
    """Parse a transcript into structured fields and merge with any vision output."""
    if not state.raw_transcript or not state.raw_transcript.strip():
        logger.warning("understanding_agent called with empty transcript on incident %s", state.incident_id)
        state.log("understanding_agent", {"skipped": True}, "No transcript provided; nothing to parse.")
        return state

    try:
        response = await understanding_agent.run_async({"transcript": state.raw_transcript})
        parsed = UnderstandingOutput.model_validate_json(response.text)
        parsed_dict = parsed.model_dump()

        if parsed.is_abusive:
            state.log("understanding_agent", parsed_dict, "Report flagged as abusive; routing to moderation instead of standard triage.")
            state.understanding_confidence = 0.0
            state.is_abusive = True
            return state

        if parsed.is_irrelevant:
            state.log("understanding_agent", parsed_dict, "Report flagged as irrelevant/non-incident; not merged into triage fields.")
            state.understanding_confidence = 0.0
            state.is_irrelevant = True
            return state

        completeness = schema_completeness(
            {
                "hazards_detected": parsed.hazards,
                "visible_evidence": parsed.supporting_phrases,
                "severity_reason": parsed.severity_reason,
                "issue_type_reason": parsed.issue_type_reason,
            }
        )

        state = merge_with_vision(state, parsed, completeness)

        state.location_clues = parsed.location_clues
        state.landmarks = parsed.landmarks
        state.department_hint = parsed.department_hint
        state.people_affected = parsed.people_affected
        state.urgency = parsed.urgency
        state.supporting_phrases = parsed.supporting_phrases
        state.ignored_information = parsed.ignored_information
        state.language_detected = parsed.language_detected
    except Exception as exc:
        if retries < 1:
            logger.warning("Understanding agent retrying on incident %s after error: %s", state.incident_id, exc)
            return await understand_report(state, retries + 1)
        logger.error("Understanding agent failed after retry on incident %s: %s", state.incident_id, exc)
        state.understanding_confidence = 0.0
        state.log("understanding_agent", {"error": str(exc)}, "Text understanding failed after retry; relying on Vision Agent output alone if available.")

    return state
