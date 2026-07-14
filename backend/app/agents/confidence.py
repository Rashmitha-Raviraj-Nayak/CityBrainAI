"""Composite confidence scoring for the Vision Agent."""

from __future__ import annotations


def compute_composite_confidence(
    model_confidence: float,
    image_quality_score: float,
    schema_completeness_score: float,
) -> float:
    """Compute a composite confidence score from multiple independent signals."""

    score = 0.6 * model_confidence + 0.25 * image_quality_score + 0.15 * schema_completeness_score
    return round(min(max(score, 0.0), 1.0), 2)


def schema_completeness(parsed: dict) -> float:
    """Measure how fully the structured output populated the required explainability fields."""

    required_lists = ["hazards_detected", "visible_evidence"]
    required_text = ["severity_reason", "issue_type_reason"]
    populated = sum(1 for field in required_lists if parsed.get(field)) + sum(1 for field in required_text if parsed.get(field))
    return populated / (len(required_lists) + len(required_text))
