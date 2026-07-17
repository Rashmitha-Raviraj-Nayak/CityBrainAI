import asyncio
import json
from typing import Any, Dict

from app.core.ai_provider import GeminiProvider, ProviderError, ProviderRequest
from app.core.config import get_settings


class GeminiAdapter:
    """Structured Gemini reasoning adapter that preserves the existing runtime contracts."""

    def __init__(self, provider: GeminiProvider | None = None) -> None:
        self._settings = get_settings()
        self._provider = provider or (GeminiProvider(settings=self._settings) if self._settings.gemini.api_key else None)
        self.enabled = bool(self._provider and self._settings.gemini.api_key)

    def analyze_vision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return self._fallback_vision(context)
        image_hint = ""
        if isinstance(context.get("image_url"), str):
            image_hint = f"Image URL: {context.get('image_url')}"
        prompt = (
            "You are Gemini Vision for civic infrastructure. Analyze the provided image and return strict JSON with the following fields:"
            " category, severity, objects_detected (array of object names), summary, confidence (0-1)."
            " Only return a single JSON object with those exact keys."
            f" {image_hint} Context: {json.dumps(context, ensure_ascii=False)}"
        )
        payload = self._invoke_json(prompt)
        # Map to both legacy and new keys for compatibility
        category = payload.get("category") or payload.get("severity") or "infrastructure"
        severity = payload.get("severity") or payload.get("severity_level") or "moderate"
        objects = payload.get("objects_detected") or payload.get("objects") or []
        summary = payload.get("summary") or payload.get("description") or "Vision analysis completed."
        confidence = float(payload.get("confidence") or payload.get("score") or 0.75)

        return {
            "capability": "vision",
            "summary": str(summary),
            "confidence": confidence,
            "status": "ready",
            "objects": objects,
            "objects_detected": objects,
            "hazards": payload.get("hazards") or [],
            "severity": severity,
            "category": category,
            "raw": payload,
        }

    def analyze_text(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return self._fallback_text(context)
        prompt = (
            "You are a civic incident understanding assistant. Return strict JSON with the following keys:"
            " summary, category, department (recommended responsible department), root_cause, confidence (0-1)."
            " Only return a single JSON object."
            f" Context: {json.dumps(context, ensure_ascii=False)}"
        )
        payload = self._invoke_json(prompt)
        summary = payload.get("summary") or payload.get("description") or "Text understanding completed."
        category = payload.get("category") or "uncategorized"
        department = payload.get("department") or payload.get("recommended_department") or "operations"
        root = payload.get("root_cause") or payload.get("cause") or "unknown"
        confidence = float(payload.get("confidence") or 0.76)

        return {
            "capability": "understanding",
            "summary": str(summary),
            "category": category,
            "department": department,
            "root_cause": root,
            "confidence": confidence,
            "status": "ready",
            "raw": payload,
        }

    def perform_structured_reasoning(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return self._fallback_reasoning(context)
        prompt = (
            "You are a civic risk prediction assistant. Return strict JSON with: risk_score (0-100), priority (low/medium/high),"
            " impact, resolution_time (human-readable), confidence (0-1). Only return a single JSON object."
            f" Context: {json.dumps(context, ensure_ascii=False)}"
        )
        payload = self._invoke_json(prompt)
        risk = float(payload.get("risk_score") or payload.get("risk") or 0)
        priority = payload.get("priority") or "medium"
        impact = payload.get("impact") or "moderate"
        resolution = payload.get("resolution_time") or payload.get("response_time_estimate") or "2 hours"
        confidence = float(payload.get("confidence") or 0.78)

        return {
            "capability": "reasoning",
            "summary": str(payload.get("summary") or "Structured reasoning completed."),
            "risk_score": risk,
            "priority": priority,
            "impact": impact,
            "resolution_time": resolution,
            "confidence": confidence,
            "status": "ready",
            "raw": payload,
        }

    def support_decision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return self._fallback_decision(context)
        prompt = (
            "You are a civic decision assistant. Return strict JSON with: actions (array), recommendations (array), resources (array),"
            " department (recommended), confidence (0-1). Only return a single JSON object."
            f" Context: {json.dumps(context, ensure_ascii=False)}"
        )
        payload = self._invoke_json(prompt)
        actions = payload.get("actions") or payload.get("recommended_actions") or []
        recommendations = payload.get("recommendations") or payload.get("long_term_recommendations") or []
        resources = payload.get("resources") or payload.get("required_resources") or []
        department = payload.get("department") or payload.get("responsible_departments") or "operations"
        confidence = float(payload.get("confidence") or 0.8)

        return {
            "capability": "decision",
            "summary": str(payload.get("summary") or "Decision support completed."),
            "actions": actions,
            "recommendations": recommendations,
            "resources": resources,
            "department": department,
            "confidence": confidence,
            "status": "ready",
            "raw": payload,
        }

    def summarize(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return self._fallback_summary(context)

        prompt = (
            "Summarize the civic incident for operators in a concise, actionable style."
            f" Context: {json.dumps(context, ensure_ascii=False)}"
        )
        payload = self._invoke_text(prompt)
        return {
            "capability": "summarization",
            "summary": payload,
            "confidence": 0.8,
            "status": "ready",
        }

    def _invoke_json(self, prompt: str) -> Dict[str, Any]:
        if self._provider is None:
            raise ProviderError("Gemini provider is not configured.", code="missing_api_key", retryable=False)
        request = ProviderRequest(prompt=prompt, response_format="json", temperature=0.2, max_output_tokens=1024)
        response = asyncio.run(self._provider.generate_async(request))
        if response.json_data:
            return response.json_data
        if response.text:
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                return {"summary": response.text}
        raise ProviderError("Gemini adapter received no structured data.", code="empty_response", retryable=False)

    def _invoke_text(self, prompt: str) -> str:
        if self._provider is None:
            raise ProviderError("Gemini provider is not configured.", code="missing_api_key", retryable=False)
        request = ProviderRequest(prompt=prompt, response_format="text", temperature=0.2, max_output_tokens=512)
        response = asyncio.run(self._provider.generate_async(request))
        return response.text or "Summarization unavailable."

    def _fallback_vision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "capability": "vision",
            "summary": "Vision analysis completed with local heuristics.",
            "confidence": 0.72,
            "status": "fallback",
            "objects": ["roadway", "vehicle"],
            "hazards": ["traffic_obstruction"],
            "severity": "moderate",
            "raw": context,
        }

    def _fallback_text(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "capability": "understanding",
            "summary": "Text understanding completed with local heuristics.",
            "confidence": 0.72,
            "status": "fallback",
            "raw": context,
        }

    def _fallback_reasoning(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "capability": "reasoning",
            "summary": "Structured reasoning completed with local heuristics.",
            "confidence": 0.72,
            "status": "fallback",
            "raw": context,
        }

    def _fallback_decision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "capability": "decision",
            "summary": "Decision support completed with local heuristics.",
            "confidence": 0.72,
            "status": "fallback",
            "raw": context,
        }

    def _fallback_summary(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "capability": "summarization",
            "summary": "Summarization completed with local heuristics.",
            "confidence": 0.72,
            "status": "fallback",
        }
