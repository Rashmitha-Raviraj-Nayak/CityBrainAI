"""Explicit reconciliation between Vision Agent and Understanding Agent output."""

from __future__ import annotations

from app.agents.confidence import compute_composite_confidence


def merge_with_vision(state, parsed, completeness: float):
    """Mutate and return the shared incident state using text and vision evidence."""

    vision_present = state.vision_confidence is not None and state.vision_confidence > 0

    if not vision_present:
        state.issue_type = parsed.issue_type
        state.severity = parsed.severity
        consistency_bonus = 1.0
        state.hazards_detected = list(set(state.hazards_detected + parsed.hazards))
        why = "No prior Vision Agent output; adopting text-derived classification directly."
    else:
        text_hazards = set(parsed.hazards)
        vision_hazards = set(state.hazards_detected)
        overlap = text_hazards & vision_hazards
        new_hazards = text_hazards - vision_hazards
        state.hazards_detected = list(vision_hazards | text_hazards)

        if parsed.issue_type == state.issue_type:
            consistency_bonus = 1.0
            why = (
                f"Text classification ({parsed.issue_type}) agrees with Vision Agent; "
                f"{len(overlap)} hazard(s) confirmed by both sources, {len(new_hazards)} new from text."
            )
            severity_order = ["low", "medium", "high", "critical"]
            if severity_order.index(parsed.severity) > severity_order.index(state.severity or "low"):
                state.severity = parsed.severity
        else:
            consistency_bonus = 0.3
            contradiction = (
                f"Text suggests '{parsed.issue_type}' but Vision Agent detected '{state.issue_type}' — flagged for Validation Agent review."
            )
            state.contradictions.append(contradiction)
            why = contradiction
            if parsed.model_confidence > (state.vision_confidence or 0):
                state.issue_type = parsed.issue_type
                state.severity = parsed.severity

    composite = compute_composite_confidence(parsed.model_confidence, 1.0, completeness)
    state.understanding_confidence = round(min(max(0.85 * composite + 0.15 * consistency_bonus, 0.0), 1.0), 2)

    state.log(
        agent="understanding_agent",
        output=parsed.model_dump(),
        why=f"{parsed.issue_type_reason} {parsed.severity_reason} {why} Composite confidence {state.understanding_confidence:.0%}.",
    )
    return state
