from __future__ import annotations

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


class FactIntegrityRule(BaseRule):
    """Verifies that all entries contain valid entities, non-empty roles, and diverse action verbs."""

    id = "fact-integrity"
    name = "Career Fact Integrity and Bullet Strength Rule"
    version = "1.0.0"
    rule_type = RuleType.DETERMINISTIC_VALIDATION
    category = RuleCategory.CONTENT
    description = (
        "Ensures career entries contain bona fide organizations and titles, "
        "and identifies vague bullet openers and repetitive action verbs."
    )

    WEAK_VERBS_EN = [
        "worked on",
        "helped with",
        "responsible for",
        "assisted with",
        "assisted in",
        "participated in",
    ]

    WEAK_VERBS_TR = [
        "görev aldım",
        "çalıştım",
        "yardımcı oldum",
        "sorumluydum",
        "katılım sağladım",
    ]

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        issues: list[RuleIssue] = []

        # 1. Experience structural integrity
        for idx, exp in enumerate(resume.experience):
            field_prefix = f"experience-{idx}"
            if not exp.company or not exp.company.strip():
                issues.append(
                    RuleIssue(
                        id=f"fact-missing-company-{idx}",
                        rule_id=self.id,
                        severity=IssueSeverity.IMPORTANT,
                        category=RuleCategory.CONTENT,
                        section="experience",
                        field_id=f"{field_prefix}-company",
                        message="Company / employer name is missing.",
                        reason="Every experience record must identify the employing entity.",
                        proposed_change=None,
                        requires_user_fact=True,
                    )
                )

            if not exp.position or not exp.position.strip():
                issues.append(
                    RuleIssue(
                        id=f"fact-missing-position-{idx}",
                        rule_id=self.id,
                        severity=IssueSeverity.IMPORTANT,
                        category=RuleCategory.CONTENT,
                        section="experience",
                        field_id=f"{field_prefix}-position",
                        message="Job position / title is missing.",
                        reason="ATS and recruiters require an explicit professional title.",
                        proposed_change=None,
                        requires_user_fact=True,
                    )
                )

            # Check consecutive repeated verbs
            bullet_verbs: list[str] = []
            for b_idx, bullet in enumerate(exp.bullets):
                words = bullet.strip().split()
                if words:
                    first_word = words[0].rstrip(".,:;").lower()
                    bullet_verbs.append(first_word)
                else:
                    issues.append(
                        RuleIssue(
                            id=f"fact-empty-bullet-{idx}-{b_idx}",
                            rule_id=self.id,
                            severity=IssueSeverity.IMPORTANT,
                            category=RuleCategory.FORMATTING,
                            section="experience",
                            field_id=f"{field_prefix}-bullet-{b_idx}",
                            message="Empty bullet point detected.",
                            reason="Blank bullet points create formatting artifacts.",
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )

            # Check for 3+ consecutive identical verbs
            consecutive_count = 1
            for v_idx in range(1, len(bullet_verbs)):
                if bullet_verbs[v_idx] == bullet_verbs[v_idx - 1] and len(bullet_verbs[v_idx]) > 3:
                    consecutive_count += 1
                    if consecutive_count >= 3:
                        issues.append(
                            RuleIssue(
                                id=f"fact-repeated-verb-{idx}-{v_idx}",
                                rule_id=self.id,
                                severity=IssueSeverity.SUGGESTION,
                                category=RuleCategory.CONTENT,
                                section="experience",
                                field_id=f"{field_prefix}-bullet-{v_idx}",
                                message=f"Consecutive bullets start with the identical verb ('{bullet_verbs[v_idx]}').",
                                reason="Varying your action verbs highlights multiple facets of your accomplishments.",
                                proposed_change=None,
                                requires_user_fact=False,
                            )
                        )
                else:
                    consecutive_count = 1

            # Check weak openings
            weak_verbs = (
                self.WEAK_VERBS_TR if resume.metadata.language == "tr" else self.WEAK_VERBS_EN
            )
            for b_idx, bullet in enumerate(exp.bullets):
                b_lower = bullet.lower()
                for weak in weak_verbs:
                    if b_lower.startswith(weak) or f" {weak} " in b_lower:
                        issues.append(
                            RuleIssue(
                                id=f"fact-weak-verb-{idx}-{b_idx}",
                                rule_id=self.id,
                                severity=IssueSeverity.SUGGESTION,
                                category=RuleCategory.CONTENT,
                                section="experience",
                                field_id=f"{field_prefix}-bullet-{b_idx}",
                                message=f"Vague opening detected: '{weak}'",
                                reason="Replace passive participation phrasing with concrete active verbs (e.g. Developed, Designed, Automated).",
                                proposed_change=None,
                                requires_user_fact=False,
                            )
                        )
                        break

        # 2. Education structural integrity
        for idx, edu in enumerate(resume.education):
            field_prefix = f"education-{idx}"
            if not edu.institution or not edu.institution.strip():
                issues.append(
                    RuleIssue(
                        id=f"fact-missing-institution-{idx}",
                        rule_id=self.id,
                        severity=IssueSeverity.IMPORTANT,
                        category=RuleCategory.CONTENT,
                        section="education",
                        field_id=f"{field_prefix}-institution",
                        message="Educational institution name is missing.",
                        reason="ATS parsers require an institution name to credit educational credentials.",
                        proposed_change=None,
                        requires_user_fact=True,
                    )
                )

        passed = not any(i.severity == IssueSeverity.IMPORTANT for i in issues)
        score_impact = min(25, len(issues) * 5)

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
