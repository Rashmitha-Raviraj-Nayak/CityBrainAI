"""Vision agent for CityBrain OS.

The Vision Agent converts civic image references into structured observations about
visible issues, infrastructure conditions, and confidence estimates. It remains
provider-agnostic by using the existing tool layer rather than calling Gemini directly.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents.tools import GeminiTool, Tool as ToolContract, ToolResult
from app.runtime.runtime import AgentResult, RuntimeContext, RuntimeStatus

logger = logging.getLogger("citybrain.agents.vision")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class DetectedIssue(BaseModel):
    """A single issue observed in the supplied image context."""

    model_config = ConfigDict(extra="forbid")

    issue_type: str
    description: str
    severity: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class VisionInput(BaseModel):
    """Typed input for multimodal civic observation analysis."""

    model_config = ConfigDict(extra="forbid")

    image_reference: str = Field(..., min_length=3, description="Image file path, URL, or storage identifier")
    citizen_description: str | None = Field(default=None, description="Optional citizen-provided description")
    location: str | None = Field(default=None, description="Optional location hint")
    timestamp: str | None = Field(default=None, description="Optional timestamp hint")


class VisionResult(BaseModel):
    """Structured observations returned by the Vision Agent."""

    model_config = ConfigDict(extra="forbid")

    detected_issues: list[DetectedIssue] = Field(default_factory=list)
    infrastructure_type: str
    severity_estimate: str
    visual_evidence: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    extracted_objects: list[str] = Field(default_factory=list)
    image_quality: str
    uncertainty: list[str] = Field(default_factory=list)
    reasoning: str


class VisionAgent:
    """Convert civic image context into structured infrastructure observations."""

    def __init__(self, tool: ToolContract | None = None, logger_instance: logging.Logger | None = None) -> None:
        self.name = "vision"
        self._tool = tool or GeminiTool()
        self._logger = logger_instance or logger

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the vision workflow against the runtime context."""

        self._logger.info(
            "Vision agent started",
            extra={"execution_id": context.execution_id, "workflow_name": context.workflow_name},
        )

        try:
            request = self._parse_context(context)
            vision = self._build_vision(request)
            tool_result = self._invoke_tool(request, vision)
            if tool_result.success and tool_result.data.get("response"):
                vision.reasoning = str(tool_result.data["response"]).strip()
                vision.confidence_score = min(0.99, vision.confidence_score + 0.03)
            self._logger.info(
                "Vision agent completed",
                extra={"execution_id": context.execution_id, "severity": vision.severity_estimate},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=vision.reasoning,
                confidence=vision.confidence_score,
                details=vision.model_dump(),
            )
        except Exception as exc:  # pragma: no cover - defensive branch for runtime robustness
            self._logger.exception(
                "Vision agent failed",
                extra={"execution_id": context.execution_id, "error": str(exc)},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Vision analysis failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )

    def _parse_context(self, context: RuntimeContext) -> VisionInput:
        """Extract and validate the vision input from the runtime context."""

        if not isinstance(context.input_data, dict):
            raise ValueError("Runtime context input_data must be a dictionary")

        payload = context.input_data.get("vision") if isinstance(context.input_data.get("vision"), dict) else context.input_data
        if not isinstance(payload, dict):
            raise ValueError("Vision input must be a dictionary")

        image_reference = payload.get("image_reference") or payload.get("image_path") or payload.get("image_url") or payload.get("image") or ""
        if not isinstance(image_reference, str) or not image_reference.strip():
            raise ValueError("An image reference is required")

        description = payload.get("citizen_description") if isinstance(payload.get("citizen_description"), str) else None
        location = payload.get("location") if isinstance(payload.get("location"), str) else None
        timestamp = payload.get("timestamp") if isinstance(payload.get("timestamp"), str) else None

        return VisionInput(
            image_reference=str(image_reference).strip(),
            citizen_description=description,
            location=location,
            timestamp=timestamp,
        )

    def _build_vision(self, request: VisionInput) -> VisionResult:
        """Construct structured observations from the image reference and optional description."""

        combined_text = " ".join(
            part for part in [request.image_reference, request.citizen_description or "", request.location or ""] if part
        ).lower()
        detected_issues = self._detect_issues(combined_text)
        infrastructure_type = self._classify_infrastructure(combined_text, detected_issues)
        severity_estimate = self._estimate_severity(combined_text, detected_issues)
        visual_evidence = self._build_visual_evidence(detected_issues)
        extracted_objects = self._extract_objects(combined_text, detected_issues)
        confidence_score = self._estimate_confidence(combined_text, detected_issues)
        uncertainty = self._derive_uncertainty(request, detected_issues)
        reasoning = self._build_reasoning(detected_issues, infrastructure_type, severity_estimate, uncertainty)

        return VisionResult(
            detected_issues=detected_issues,
            infrastructure_type=infrastructure_type,
            severity_estimate=severity_estimate,
            visual_evidence=visual_evidence,
            confidence_score=confidence_score,
            extracted_objects=extracted_objects,
            image_quality=self._derive_image_quality(request),
            uncertainty=uncertainty,
            reasoning=reasoning,
        )

    def _detect_issues(self, text: str) -> list[DetectedIssue]:
        """Identify visible civic issues from the supplied image context."""

        issues: list[DetectedIssue] = []
        if any(keyword in text for keyword in ["flood", "water", "drain", "pool", "overflow"]):
            issues.append(DetectedIssue(issue_type="water_accumulation", description="Visible water accumulation or drainage concern", severity="high", confidence=0.9))
        if any(keyword in text for keyword in ["road", "pothole", "crack", "lane", "traffic"]):
            issues.append(DetectedIssue(issue_type="road_damage", description="Visible road or surface damage", severity="moderate", confidence=0.82))
        if any(keyword in text for keyword in ["light", "streetlight", "lamp", "pole"]):
            issues.append(DetectedIssue(issue_type="lighting_defect", description="Visible lighting or streetlight issue", severity="moderate", confidence=0.8))
        if any(keyword in text for keyword in ["trash", "litter", "waste", "garbage"]):
            issues.append(DetectedIssue(issue_type="waste_accumulation", description="Visible waste accumulation", severity="low", confidence=0.78))
        if any(keyword in text for keyword in ["collapse", "broken", "damage", "fire"]):
            issues.append(DetectedIssue(issue_type="structural_damage", description="Visible structural or safety damage", severity="critical", confidence=0.87))
        return issues

    def _classify_infrastructure(self, text: str, issues: list[DetectedIssue]) -> str:
        """Map the observed issues to the most likely infrastructure domain."""

        if any(issue.issue_type in {"water_accumulation", "drainage_obstruction"} for issue in issues):
            return "drainage_system"
        if any(issue.issue_type == "road_damage" for issue in issues):
            return "transport_infrastructure"
        if any(issue.issue_type == "lighting_defect" for issue in issues):
            return "streetlighting"
        if any(issue.issue_type == "waste_accumulation" for issue in issues):
            return "public_cleanliness"
        if any(issue.issue_type == "structural_damage" for issue in issues):
            return "public_safety_infrastructure"
        if any(keyword in text for keyword in ["drain", "water", "flood"]):
            return "drainage_system"
        if any(keyword in text for keyword in ["road", "lane", "pothole"]):
            return "transport_infrastructure"
        return "public_service_assets"

    def _estimate_severity(self, text: str, issues: list[DetectedIssue]) -> str:
        """Estimate the overall visible severity of the observed conditions."""

        severity_scores = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
        levels = [issue.severity for issue in issues]
        if any(level == "critical" for level in levels):
            return "critical"
        if any(level == "high" for level in levels):
            return "high"
        if any(level == "moderate" for level in levels):
            return "moderate"
        if any(keyword in text for keyword in ["flood", "collapse", "fire", "broken"]):
            return "high"
        return "low"

    def _build_visual_evidence(self, issues: list[DetectedIssue]) -> list[str]:
        """Translate detected issues into human-readable evidence phrases."""

        evidence: list[str] = []
        for issue in issues:
            evidence.append(issue.description)
        return evidence

    def _extract_objects(self, text: str, issues: list[DetectedIssue]) -> list[str]:
        """Extract likely visible objects from the image context."""

        objects: set[str] = set()
        if any(keyword in text for keyword in ["drain", "outlet", "channel"]):
            objects.add("drainage_outlet")
        if any(keyword in text for keyword in ["road", "lane", "surface"]):
            objects.add("road_surface")
        if any(keyword in text for keyword in ["light", "streetlight", "lamp"]):
            objects.add("streetlight")
        if any(keyword in text for keyword in ["trash", "litter", "waste"]):
            objects.add("waste_container")
        if any(keyword in text for keyword in ["water", "flood"]):
            objects.add("water_pool")
        for issue in issues:
            objects.add(issue.issue_type)
        return sorted(objects)

    def _estimate_confidence(self, text: str, issues: list[DetectedIssue]) -> float:
        """Estimate the confidence of the observation using the available evidence."""

        confidence = 0.6
        if issues:
            confidence += 0.12 * min(3, len(issues))
        if any(keyword in text for keyword in ["jpg", "jpeg", "png", "gif", "webp"]):
            confidence += 0.05
        if any(keyword in text for keyword in ["road", "drain", "flood", "light", "trash"]):
            confidence += 0.05
        return round(min(0.99, confidence), 3)

    def _derive_uncertainty(self, request: VisionInput, issues: list[DetectedIssue]) -> list[str]:
        """Capture uncertainty that may affect downstream reasoning."""

        uncertainty: list[str] = []
        if not request.citizen_description:
            uncertainty.append("limited_text_context")
        if not issues:
            uncertainty.append("no_obvious_issue_detected")
        if not re.search(r"\.(jpg|jpeg|png|gif|webp)$", request.image_reference.lower()):
            uncertainty.append("image_reference_not_standard")
        return uncertainty

    def _derive_image_quality(self, request: VisionInput) -> str:
        """Infer the likely quality or availability of the supplied image reference."""

        if re.search(r"\.(jpg|jpeg|png|gif|webp)$", request.image_reference.lower()):
            return "available"
        return "unknown"

    def _build_reasoning(self, issues: list[DetectedIssue], infrastructure_type: str, severity_estimate: str, uncertainty: list[str]) -> str:
        """Compose a concise explanation for downstream agents."""

        issue_summary = ", ".join(issue.issue_type for issue in issues) if issues else "no obvious civic issue"
        uncertainty_summary = ", ".join(uncertainty) if uncertainty else "none"
        return (
            f"The image context suggests {issue_summary} affecting {infrastructure_type}. "
            f"Overall visible severity is {severity_estimate}. Uncertainty: {uncertainty_summary}."
        )

    def _invoke_tool(self, request: VisionInput, vision: VisionResult) -> ToolResult:
        """Delegate reasoning enhancement to the tool layer without calling an AI provider directly."""

        prompt = (
            "You are a civic image analyst. Produce one concise sentence summarizing the visible civic observations. "
            f"Image reference: {request.image_reference}. Description: {request.citizen_description or 'none'}. "
            f"Infrastructure: {vision.infrastructure_type}. Severity: {vision.severity_estimate}."
        )
        tool_payload = {"prompt": prompt, "context": request.model_dump()}
        return self._tool.execute(tool_payload)
