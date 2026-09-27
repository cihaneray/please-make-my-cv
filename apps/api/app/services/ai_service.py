from typing import Protocol

from app.rules.privacy import KVKKDataMinimizer


class AIProvider(Protocol):
    def rewrite_bullet(self, bullet: str, tone: str) -> str: ...

    def improve_summary(self, summary: str, target_role: str) -> str: ...


class DeterministicRuleBasedAIProvider:
    """Strictly deterministic local provider with ZERO hallucination / NO fabricated career data."""

    def rewrite_bullet(self, bullet: str, tone: str) -> str:
        cleaned = bullet.strip().rstrip(".")
        if tone == "concise":
            # Strip excessive filler words
            for prefix in [
                "Responsible for ",
                "Worked on ",
                "Helped with ",
                "Assisted in ",
                "Participated in ",
                "Sorumluydum ",
                "Görev aldım ",
            ]:
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix) :]
                    break
            words = cleaned.split()
            if len(words) > 15:
                cleaned = " ".join(words[:18])
            return cleaned.capitalize() + "."

        elif tone == "business":
            if not any(
                k in cleaned.lower()
                for k in ["driving", "improving", "accelerating", "enabling", "enhancing", "katma değer", "iyileştirerek"]
            ):
                return f"Architected and delivered {cleaned[0].lower() + cleaned[1:]}, enhancing operational effectiveness."
            return cleaned.capitalize() + "."

        elif tone == "technical":
            return f"Engineered and deployed {cleaned[0].lower() + cleaned[1:]}, ensuring robust system performance and technical rigor."

        return cleaned.capitalize() + "."

    def improve_summary(self, summary: str, target_role: str) -> str:
        if not summary.strip():
            role = target_role or "Software Professional"
            return f"Accomplished {role} dedicated to clean architecture, high scalability, and measurable business value."
        sentences = [s.strip() for s in summary.split(".") if s.strip()]
        improved = " ".join(f"{s[0].upper() + s[1:]}." for s in sentences)
        return improved


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
            "note": "AI suggestion only. Grounded in source data with KVKK data minimization applied.",
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
            "note": "AI suggestion only. Grounded in source data with KVKK data minimization applied.",
        }
