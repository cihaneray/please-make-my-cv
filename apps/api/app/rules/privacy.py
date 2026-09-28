from __future__ import annotations

import re
from typing import Any

from app.rules.base import (
    BaseRule,
    IssueSeverity,
    RuleCategory,
    RuleIssue,
    RuleResult,
    RuleType,
)
from app.schemas.resume import ResumeDocument


def is_valid_tckn(tckn: str) -> bool:
    """Validates 11-digit Turkish Republic Identity Number (TCKN) checksum."""
    if not re.match(r"^[1-9]\d{10}$", tckn):
        return False
    digits = [int(c) for c in tckn]
    # 1st, 3rd, 5th, 7th, 9th sum * 7 - (2nd, 4th, 6th, 8th sum) mod 10 == 10th
    odd_sum = sum(digits[0:9:2])
    even_sum = sum(digits[1:8:2])
    c10 = ((odd_sum * 7) - even_sum) % 10
    if c10 != digits[9]:
        return False
    # sum of first 10 digits mod 10 == 11th digit
    if sum(digits[:10]) % 10 != digits[10]:
        return False
    return True


class KVKKDataMinimizer:
    """Sanitizes candidate PII to satisfy KVKK Law No. 6698 & GDPR minimum data transmission rules."""

    TCKN_PATTERN = re.compile(r"\b[1-9]\d{10}\b")
    IBAN_PATTERN = re.compile(r"\bTR\d{2}[0-9A-Z]{5}\d{17}\b", re.IGNORECASE)
    EMAIL_PATTERN = re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b")
    PHONE_PATTERN = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")

    @classmethod
    def redact_personal_data(cls, text: str) -> str:
        """Strips or redacts PII before sending to any external AI provider."""

        def replace_tckn(m: re.Match) -> str:
            val = m.group(0)
            return "[TCKN_REDACTED]" if is_valid_tckn(val) else val

        redacted = cls.TCKN_PATTERN.sub(replace_tckn, text)
        redacted = cls.IBAN_PATTERN.sub("[IBAN_REDACTED]", redacted)
        redacted = cls.EMAIL_PATTERN.sub("[EMAIL_REDACTED]", redacted)
        redacted = cls.PHONE_PATTERN.sub("[PHONE_REDACTED]", redacted)
        return redacted

    @classmethod
    def prepare_ai_payload(
        cls,
        text: str,
        role_context: str = "",
    ) -> dict[str, str]:
        """Ensures only the minimum necessary payload is sent to AI models."""
        return {
            "content": cls.redact_personal_data(text),
            "targetRole": role_context,
        }


class KVKKPrivacyRule(BaseRule):
    """Detects inadvertent inclusion of highly sensitive personal data under KVKK and GDPR."""

    id = "kvkk-gdpr-privacy"
    name = "KVKK and GDPR Candidate Privacy Rule"
    version = "1.0.0"
    rule_type = RuleType.DETERMINISTIC_VALIDATION
    category = RuleCategory.PRIVACY
    description = (
        "Flags exposure of national identification numbers (TCKN), IBANs, "
        "full residential street addresses, or sensitive health/personal data."
    )

    SENSITIVE_KEYWORDS = [
        "bekar",
        "evli",
        "din:",
        "dini:",
        "mezhep",
        "kan grubu",
        "sabıka kaydı",
        "askerlik durumu",
        "marital status",
        "religion",
        "blood group",
        "criminal record",
    ]

    STREET_ADDRESS_PATTERNS = [
        r"\bmah(?:allesi)?\b",
        r"\bsok(?:ak|ağı)?\b",
        r"\bcad(?:de|desi)?\b",
        r"\bno\s*:\s*\d+\b",
        r"\bdaire\s*:\s*\d+\b",
        r"\bapt(?:\.)?\b",
    ]

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        issues: list[RuleIssue] = []

        all_texts: list[tuple[str, str, str]] = [
            ("profile", "profile-location", resume.profile.location),
            ("summary", "summary", resume.summary),
        ]

        for e_idx, exp in enumerate(resume.experience):
            all_texts.append(("experience", f"experience-{e_idx}-summary", exp.summary))
            for b_idx, b in enumerate(exp.bullets):
                all_texts.append(("experience", f"experience-{e_idx}-bullet-{b_idx}", b))

        for p_idx, prj in enumerate(resume.projects):
            for b_idx, b in enumerate(prj.bullets):
                all_texts.append(("projects", f"project-{p_idx}-bullet-{b_idx}", b))

        # 1. TCKN check
        for section, field_id, text in all_texts:
            for match in KVKKDataMinimizer.TCKN_PATTERN.finditer(text):
                val = match.group(0)
                if is_valid_tckn(val):
                    issues.append(
                        RuleIssue(
                            id=f"privacy-tckn-{len(issues) + 1}",
                            rule_id=self.id,
                            severity=IssueSeverity.IMPORTANT,
                            category=RuleCategory.PRIVACY,
                            section=section,
                            field_id=field_id,
                            message="T.C. Kimlik Numarası (TCKN) tespit edildi.",
                            reason="KVKK uyarınca TCKN gibi hassas resmi kimlik numaraları genel CV'lerde bulunmamalıdır.",
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )

            # 2. IBAN check
            if KVKKDataMinimizer.IBAN_PATTERN.search(text):
                issues.append(
                    RuleIssue(
                        id=f"privacy-iban-{len(issues) + 1}",
                        rule_id=self.id,
                        severity=IssueSeverity.IMPORTANT,
                        category=RuleCategory.PRIVACY,
                        section=section,
                        field_id=field_id,
                        message="Banka hesap numarası / IBAN tespit edildi.",
                        reason="Finansal veriler iş başvuru özgeçmişlerinde yer almamalıdır.",
                        proposed_change=None,
                        requires_user_fact=False,
                    )
                )

            # 3. Sensitive demographic / personal markers
            text_lower = text.lower()
            for kw in self.SENSITIVE_KEYWORDS:
                if kw in text_lower:
                    issues.append(
                        RuleIssue(
                            id=f"privacy-sensitive-{len(issues) + 1}",
                            rule_id=self.id,
                            severity=IssueSeverity.SUGGESTION,
                            category=RuleCategory.PRIVACY,
                            section=section,
                            field_id=field_id,
                            message=f"Gereksiz kişisel / hassas veri ibaresi tespit edildi: '{kw}'.",
                            reason="Medeni hal, din, kan grubu gibi veriler KVKK ve uluslararası işe alım standartlarında ayrımcılık riski oluşturur.",
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )

        # 4. Detailed street address check in profile location
        loc = (resume.profile.location or "").lower()
        if any(re.search(pat, loc) for pat in self.STREET_ADDRESS_PATTERNS):
            issues.append(
                RuleIssue(
                    id="privacy-detailed-address",
                    rule_id=self.id,
                    severity=IssueSeverity.SUGGESTION,
                    category=RuleCategory.PRIVACY,
                    section="profile",
                    field_id="profile-location",
                    message="Açık ev/sokak adresi yerine yalnızca 'Şehir, Ülke' belirtilmesi önerilir.",
                    reason="Veri güvenliği ve gizlilik gereği açık ikametgah adresi iş başvuru aşamasında gereksizdir.",
                    proposed_change=None,
                    requires_user_fact=False,
                )
            )

        passed = not any(i.severity == IssueSeverity.IMPORTANT for i in issues)
        score_impact = min(25, len(issues) * 10)

        return RuleResult(
            rule_id=self.id,
            rule_type=self.rule_type,
            category=self.category,
            version=self.version,
            passed=passed,
            score_impact=score_impact,
            issues=issues,
            metadata={"issues_count": len(issues)},
        )
