"""Understanding agent for CityBrain OS.

The Understanding Agent transforms raw civic signals into structured civic intelligence.
It classifies the issue, extracts entities, normalizes the complaint, and identifies
missing information without making final decisions or assigning departments.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.agents.tools import GeminiTool, Tool as ToolContract, ToolResult
from app.runtime.runtime import AgentResult, RuntimeContext, RuntimeStatus

logger = logging.getLogger("citybrain.agents.understanding")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class UnderstandingInput(BaseModel):
    """Typed input model for civic signal understanding."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., min_length=5, description="Citizen-reported issue description")
    image_metadata: dict[str, Any] = Field(default_factory=dict, description="Optional image metadata")
    location: str | None = Field(default=None, description="Optional location hint")
    timestamp: str | None = Field(default=None, description="Optional timestamp hint")

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        """Trim and normalize the human-readable description."""

        return re.sub(r"\s+", " ", value.strip())


class NormalizedIssue(BaseModel):
    """Structured issue representation produced by the understanding stage."""

    model_config = ConfigDict(extra="forbid")

    title: str
    category: str
    affected_infrastructure: str
    description: str


class ExtractedEntity(BaseModel):
    """A normalized entity extracted from the civic signal."""

    model_config = ConfigDict(extra="forbid")

    entity_type: str
    value: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class UnderstandingOutput(BaseModel):
    """Structured result returned by the understanding agent."""

    model_config = ConfigDict(extra="forbid")

    normalized_issue: NormalizedIssue
    extracted_entities: list[ExtractedEntity] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    reasoning_summary: str
    validation_status: str
    missing_information: list[str] = Field(default_factory=list)


class UnderstandingAgent:
    """Transform raw civic input into structured understanding for downstream agents."""

    def __init__(self, tool: ToolContract | None = None, logger_instance: logging.Logger | None = None) -> None:
        self.name = "understanding"
        self._tool = tool or GeminiTool()
        self._logger = logger_instance or logger

    def execute(self, context: RuntimeContext) -> AgentResult:
        """Execute the understanding workflow against the runtime context."""

        self._logger.info(
            "Understanding agent started",
            extra={"execution_id": context.execution_id, "workflow_name": context.workflow_name},
        )

        try:
            request = self._parse_context(context)
            understanding = self._build_understanding(request)
            tool_result = self._invoke_tool(request, understanding)
            if tool_result.success and tool_result.data.get("response"):
                understanding.reasoning_summary = str(tool_result.data["response"]).strip()
                understanding.confidence = min(0.99, understanding.confidence + 0.03)
            self._logger.info(
                "Understanding agent completed",
                extra={"execution_id": context.execution_id, "confidence": understanding.confidence},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.SUCCESS,
                summary=understanding.reasoning_summary,
                confidence=understanding.confidence,
                details=understanding.model_dump(),
            )
        except Exception as exc:  # pragma: no cover - defensive branch for runtime robustness
            self._logger.exception(
                "Understanding agent failed",
                extra={"execution_id": context.execution_id, "error": str(exc)},
            )
            return AgentResult(
                agent_name=self.name,
                status=RuntimeStatus.FAILED,
                summary="Understanding analysis failed.",
                confidence=0.0,
                details={"error": str(exc)},
            )

    def _parse_context(self, context: RuntimeContext) -> UnderstandingInput:
        """Extract and validate the understanding input from the runtime context."""

        if not isinstance(context.input_data, dict):
            raise ValueError("Runtime context input_data must be a dictionary")

        payload = context.input_data.get("signal") if isinstance(context.input_data.get("signal"), dict) else context.input_data
        if not isinstance(payload, dict):
            raise ValueError("Understanding input must be a dictionary")

        description = payload.get("description") or payload.get("title") or ""
        if not isinstance(description, str) or not description.strip():
            raise ValueError("A non-empty issue description is required")

        return UnderstandingInput(
            description=str(description).strip(),
            image_metadata=isinstance(payload.get("image_metadata"), dict) and payload.get("image_metadata") or {},
            location=payload.get("location") if isinstance(payload.get("location"), str) else None,
            timestamp=payload.get("timestamp") if isinstance(payload.get("timestamp"), str) else None,
        )

    def _build_understanding(self, request: UnderstandingInput) -> UnderstandingOutput:
        """Build a structured understanding payload from the request."""

        normalized_text = request.description.lower()
        category = self._classify_category(normalized_text)
        infrastructure = self._classify_infrastructure(normalized_text)
        entities = self._extract_entities(normalized_text)
        missing_information = self._find_missing_information(request, normalized_text)
        confidence = self._calculate_confidence(request, category, infrastructure, entities)
        validation_status = "valid" if len(request.description) >= 10 else "needs_review"
        reasoning_summary = self._build_reasoning_summary(category, infrastructure, entities, missing_information)

        return UnderstandingOutput(
            normalized_issue=NormalizedIssue(
                title=self._build_issue_title(request.description),
                category=category,
                affected_infrastructure=infrastructure,
                description=request.description,
            ),
            extracted_entities=entities,
            confidence=confidence,
            reasoning_summary=reasoning_summary,
            validation_status=validation_status,
            missing_information=missing_information,
        )

    def _classify_category(self, text: str) -> str:
        """Classify the issue into a high-level operating category."""

        if any(keyword in text for keyword in ["traffic", "road", "lane", "signal", "parking", "vehicle"]):
            return "transport"
        if any(keyword in text for keyword in ["drain", "water", "flood", "sewer", "waste", "trash", "pollution"]):
            return "environment"
        if any(keyword in text for keyword in ["light", "streetlight", "unsafe", "danger", "fire", "injury"]):
            return "safety"
        if any(keyword in text for keyword in ["power", "utility", "electric", "gas", "pipe", "internet"]):
            return "infrastructure"
        return "public_service"

    def _classify_infrastructure(self, text: str) -> str:
        """Identify the infrastructure most likely affected by the issue."""

        if any(keyword in text for keyword in ["drain", "water", "flood", "sewer"]):
            return "drainage_system"
        if any(keyword in text for keyword in ["road", "traffic", "lane", "signal", "parking"]):
            return "transport_infrastructure"
        if any(keyword in text for keyword in ["light", "streetlight", "lamp"]):
            return "streetlighting"
        if any(keyword in text for keyword in ["power", "utility", "electric", "gas", "pipe"]):
            return "utility_network"
        return "public_service_assets"

    def _extract_entities(self, text: str) -> list[ExtractedEntity]:
        """Extract structured entities from the description."""

        entities: list[ExtractedEntity] = []
        if any(keyword in text for keyword in ["drain", "drainage", "outlet"]):
            entities.append(ExtractedEntity(entity_type="infrastructure_component", value="drainage_outlet", confidence=0.9))
        if any(keyword in text for keyword in ["road", "street", "lane"]):
            entities.append(ExtractedEntity(entity_type="location_reference", value="roadway", confidence=0.85))
        if any(keyword in text for keyword in ["water", "flood", "pool"]):
            entities.append(ExtractedEntity(entity_type="condition", value="water_accumulation", confidence=0.88))
        return entities

    def _find_missing_information(self, request: UnderstandingInput, text: str) -> list[str]:
        """Identify information gaps that may reduce the quality of downstream reasoning."""

        missing: list[str] = []
        if not request.location:
            missing.append("location")
        if len(text) < 15:
            missing.append("description_detail")
        if not request.timestamp:
            missing.append("timestamp")
        return missing

    def _calculate_confidence(
        self,
        request: UnderstandingInput,
        category: str,
        infrastructure: str,
        entities: list[ExtractedEntity],
    ) -> float:
        """Estimate confidence using signal clarity and available context."""

        confidence = 0.55
        if category != "public_service":
            confidence += 0.15
        if infrastructure != "public_service_assets":
            confidence += 0.1
        if entities:
            confidence += 0.1 * min(2, len(entities))
        if request.location:
            confidence += 0.05
        if request.image_metadata:
            confidence += 0.05
        return round(min(0.99, confidence), 3)

    def _build_issue_title(self, description: str) -> str:
        """Create a concise normalized issue title."""

        words = [word for word in description.split() if len(word) > 2]
        if not words:
            return "Civic issue"
        return " ".join(words[:6]).strip()

    def _build_reasoning_summary(
        self,
        category: str,
        infrastructure: str,
        entities: list[ExtractedEntity],
        missing_information: list[str],
    ) -> str:
        """Produce a concise reasoning summary for downstream agents and logs."""

        entity_summary = ", ".join(entity.value for entity in entities) if entities else "no specific entities extracted"
        missing_summary = ", ".join(missing_information) if missing_information else "no critical gaps"
        return (
            f"The signal was classified as a {category} issue affecting {infrastructure}. "
            f"Extracted entities: {entity_summary}. Missing information: {missing_summary}."
        )

    def _invoke_tool(self, request: UnderstandingInput, understanding: UnderstandingOutput) -> ToolResult:
        """Delegate enrichment to the tool layer without calling an AI provider directly."""

        prompt = (
            "You are a civic intelligence parser. Summarize the following issue in one sentence. "
            f"Issue: {request.description}. Category: {understanding.normalized_issue.category}. "
            f"Infrastructure: {understanding.normalized_issue.affected_infrastructure}."
        )
        tool_payload = {"prompt": prompt, "context": request.model_dump()}
        return self._tool.execute(tool_payload)
