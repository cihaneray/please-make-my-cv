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


class TurkishLanguageRule(BaseRule):
    """Enforces TDK 2026 orthography, punctuation, and Turkish CV conventions."""

    id = "turkish-language-tdk"
    name = "Turkish Language & TDK 2026 Orthography Rule"
    version = "1.0.0"
    rule_type = RuleType.LANGUAGE_STANDARD
    category = RuleCategory.LANGUAGE
    description = (
        "Validates TDK 2026 percentage formatting (%25), natural bullet openers, "
        "and flags empty corporate AI-slop phrases in Turkish resumes."
    )

    TURKISH_AI_SLOP_PATTERNS = [
        "yenilikçi çözümler sunarak değer yarattım",
        "dinamik süreçlerde aktif rol aldım",
        "katma değer sağlayan projeler geliştirdim",
        "uçtan uca süreçlerde görev aldım",
        "yüksek motivasyonla çalışmalar yürüttüm",
        "kendini geliştirmeye açık",
        "takım çalışmasına yatkın",
    ]

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        issues: list[RuleIssue] = []

        is_turkish = (resume.metadata.language or "").lower() == "tr"
        if not is_turkish:
            return RuleResult(
                rule_id=self.id,
                rule_type=self.rule_type,
                category=self.category,
                version=self.version,
                passed=True,
                metadata={"skipped": True, "reason": "Resume language is not Turkish."},
            )

        # 1. TDK 2026 Percentage check: % should precede number (%25, not 25% or 25 %)
        percent_pattern = re.compile(r"(?<!%)\b(\d+(?:[.,]\d+)?)\s*%(?![\w])")

        def check_percentages(text: str, section: str, field_id: str):
            for match in percent_pattern.finditer(text):
                num = match.group(1)
                full_matched = match.group(0)
                proposed = f"%{num}"
                issues.append(
                    RuleIssue(
                        id=f"tdk-percent-{len(issues) + 1}",
                        rule_id=self.id,
                        severity=IssueSeverity.SUGGESTION,
                        category=RuleCategory.LANGUAGE,
                        section=section,
                        field_id=field_id,
                        message=f"TDK 2026 kuralı: Yüzde işareti sayıdan önce yazılmalıdır ('{proposed}').",
                        reason=f"Türkçe metinlerde '{full_matched}' yerine '{proposed}' yazımı TDK standardıdır.",
                        proposed_change=proposed,
                        requires_user_fact=False,
                    )
                )

        # Check summary
        if resume.summary:
            check_percentages(resume.summary, "summary", "summary")

        # Check experience bullets & summary
        for exp_idx, exp in enumerate(resume.experience):
            if exp.summary:
                check_percentages(exp.summary, "experience", f"experience-{exp_idx}-summary")

            for b_idx, bullet in enumerate(exp.bullets):
                field_id = f"experience-{exp_idx}-bullet-{b_idx}"
                check_percentages(bullet, "experience", field_id)

                # 2. Check for unnecessary first-person pronoun 'ben'
                if re.match(r"^\s*ben\s+", bullet, re.IGNORECASE):
                    issues.append(
                        RuleIssue(
                            id=f"tr-pronoun-ben-{len(issues) + 1}",
                            rule_id=self.id,
                            severity=IssueSeverity.SUGGESTION,
                            category=RuleCategory.LANGUAGE,
                            section="experience",
                            field_id=field_id,
                            message="Özgeçmiş maddelerinde 'Ben' zamiri kullanımından kaçının.",
                            reason="Türkçede eylemler kişi ekleriyle çekimlendiğinden cümle başında 'Ben' kullanımı gereksizdir.",
                            proposed_change=re.sub(r"^\s*ben\s+", "", bullet, flags=re.IGNORECASE),
                            requires_user_fact=False,
                        )
                    )

                # 3. Check Turkish AI-slop phrases
                bullet_lower = bullet.lower()
                for slop in self.TURKISH_AI_SLOP_PATTERNS:
                    if slop in bullet_lower:
                        issues.append(
                            RuleIssue(
                                id=f"tr-ai-slop-{len(issues) + 1}",
                                rule_id=self.id,
                                severity=IssueSeverity.SUGGESTION,
                                category=RuleCategory.CONTENT,
                                section="experience",
                                field_id=field_id,
                                message=f"Kalıplaşmış yapay ifade tespit edildi: '{slop}'",
                                reason="Soyut kurumsal klişeler yerine adayın yaptığı somut teknik veya operasyonel katkıyı net ifade edin.",
                                proposed_change=None,
                                requires_user_fact=True,
                            )
                        )

        # Check project bullets
        for p_idx, project in enumerate(resume.projects):
            for b_idx, bullet in enumerate(project.bullets):
                field_id = f"project-{p_idx}-bullet-{b_idx}"
                check_percentages(bullet, "projects", field_id)

        passed = len(issues) == 0
        score_impact = min(20, len(issues) * 3)

        return RuleResult(
            rule_id=self.id,
            rule_type=self.rule_type,
            category=self.category,
            version=self.version,
            passed=passed,
            score_impact=score_impact,
            issues=issues,
            metadata={"checked_language": "tr", "issues_count": len(issues)},
        )
