from typing import Protocol

from app.rules.privacy import KVKKDataMinimizer


class AIProvider(Protocol):
    def rewrite_bullet(self, bullet: str, tone: str) -> str: ...

    def improve_summary(self, summary: str, target_role: str) -> str: ...


class DeterministicRuleBasedAIProvider:
    """Strictly deterministic local provider with ZERO hallucination / NO fabricated career data."""

    def rewrite_bullet(self, bullet: str, tone: str) -> str:
        cleaned = " ".join(bullet.split()).strip()
        if not cleaned:
            return ""
        # Deterministic editorial assistance must not invent actions or outcomes.
        return cleaned if cleaned.endswith((".", "!", "?")) else cleaned + "."

    def improve_summary(self, summary: str, target_role: str) -> str:
        return " ".join(summary.split()).strip()


class AIService:
    @staticmethod
    def get_provider() -> AIProvider:
        # Default to high-integrity deterministic provider to maintain privacy and data authenticity
        return DeterministicRuleBasedAIProvider()

    @staticmethod
    def rewrite_bullet(bullet: str, tone: str = "technical") -> dict[str, str]:
        # Enforce KVKK Law No. 6698 / GDPR Data Minimization: Redact any PII before processing
        safe_bullet = KVKKDataMinimizer.redact_personal_data(bullet)

        provider = AIService.get_provider()
        suggestion = provider.rewrite_bullet(safe_bullet, tone)
        return {
            "original": bullet,
            "tone": tone,
            "suggestion": suggestion,
            "note": "Editorial suggestion only. Check accuracy before applying. Personal-data patterns were redacted.",
        }

    @staticmethod
    def improve_summary(summary: str, target_role: str = "") -> dict[str, str]:
        # Enforce KVKK Law No. 6698 / GDPR Data Minimization: Redact any PII before processing
        safe_summary = KVKKDataMinimizer.redact_personal_data(summary)

        provider = AIService.get_provider()
        suggestion = provider.improve_summary(safe_summary, target_role)
        return {
            "original": summary,
            "suggestion": suggestion,
            "note": "Editorial suggestion only. Check accuracy before applying. Personal-data patterns were redacted.",
        }
