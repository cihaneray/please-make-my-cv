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


class ATSParseabilityRule(BaseRule):
    """Deterministic validation of contact integrity, heading parseability, and document structure."""

    id = "ats-parseability"
    name = "ATS Parseability and Layout Rule"
    version = "1.0.0"
    rule_type = RuleType.ATS_HEURISTIC
    category = RuleCategory.ATS
    description = (
        "Validates email, contact fields, link structures, duplicate bullets, "
        "and reverse-chronological ordering for clean ATS ingestion."
    )

    EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    PHONE_REGEX = re.compile(r"^[\d\s\+\(\)\-\.]{7,25}$")

    def evaluate(
        self, resume: ResumeDocument, context: dict[str, Any] | None = None
    ) -> RuleResult:
        issues: list[RuleIssue] = []

        # 1. Contact checks
        if not resume.profile.email or not resume.profile.email.strip():
            issues.append(
                RuleIssue(
                    id="ats-email-missing",
                    rule_id=self.id,
                    severity=IssueSeverity.IMPORTANT,
                    category=RuleCategory.ATS,
                    section="profile",
                    field_id="profile-email",
                    message="Primary contact email is missing.",
                    reason="ATS parsers and recruiters require a direct email address to initiate correspondence.",
                    proposed_change=None,
                    requires_user_fact=True,
                )
            )
        elif not self.EMAIL_REGEX.match(resume.profile.email.strip()):
            issues.append(
                RuleIssue(
                    id="ats-email-invalid",
                    rule_id=self.id,
                    severity=IssueSeverity.IMPORTANT,
                    category=RuleCategory.ATS,
                    section="profile",
                    field_id="profile-email",
                    message="Contact email format appears invalid.",
                    reason=f"'{resume.profile.email}' does not match standard email syntax.",
                    proposed_change=None,
                    requires_user_fact=True,
                )
            )

        if resume.profile.phone and not self.PHONE_REGEX.match(resume.profile.phone.strip()):
            issues.append(
                RuleIssue(
                    id="ats-phone-format",
                    rule_id=self.id,
                    severity=IssueSeverity.SUGGESTION,
                    category=RuleCategory.ATS,
                    section="profile",
                    field_id="profile-phone",
                    message="Phone number format is non-standard.",
                    reason="Use standard international or national format (e.g. +90 555 123 4567).",
                    proposed_change=None,
                    requires_user_fact=False,
                )
            )

        if not resume.profile.headline or not resume.profile.headline.strip():
            issues.append(
                RuleIssue(
                    id="ats-headline-missing",
                    rule_id=self.id,
                    severity=IssueSeverity.SUGGESTION,
                    category=RuleCategory.ATS,
                    section="profile",
                    field_id="profile-headline",
                    message="Professional headline / title is missing.",
                    reason="A targeted headline helps ATS index your profile against job titles.",
                    proposed_change=None,
                    requires_user_fact=True,
                )
            )

        # 2. Duplicate bullet check
        seen_bullets: dict[str, str] = {}
        for exp_idx, exp in enumerate(resume.experience):
            for b_idx, bullet in enumerate(exp.bullets):
                cleaned = " ".join(bullet.strip().split())
                if len(cleaned) < 15:
                    continue
                bullet_key = cleaned.lower()
                field_id = f"experience-{exp_idx}-bullet-{b_idx}"
                if bullet_key in seen_bullets:
                    prev_field = seen_bullets[bullet_key]
                    issues.append(
                        RuleIssue(
                            id=f"ats-dup-bullet-{len(issues)+1}",
                            rule_id=self.id,
                            severity=IssueSeverity.IMPORTANT,
                            category=RuleCategory.CONSISTENCY,
                            section="experience",
                            field_id=field_id,
                            message="Duplicate bullet text detected across experience records.",
                            reason=f"This bullet is identical to the one in {prev_field}.",
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )
                else:
                    seen_bullets[bullet_key] = field_id

        # 3. Excessively long bullets (>100 words)
        for exp_idx, exp in enumerate(resume.experience):
            for b_idx, bullet in enumerate(exp.bullets):
                words = bullet.strip().split()
                if len(words) > 100:
                    issues.append(
                        RuleIssue(
                            id=f"ats-bullet-length-{len(issues)+1}",
                            rule_id=self.id,
                            severity=IssueSeverity.SUGGESTION,
                            category=RuleCategory.FORMATTING,
                            section="experience",
                            field_id=f"experience-{exp_idx}-bullet-{b_idx}",
                            message=f"Bullet is excessively long ({len(words)} words).",
                            reason="Paragraph-length bullets reduce ATS scanning accuracy and recruiter readability. Split into 2 concise bullets.",
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )

        # 4. Chronology check: Ensure newest experience is listed first
        def extract_year(date_str: str) -> int | None:
            match = re.search(r"\b(19\d\d|20\d\d)\b", date_str or "")
            return int(match.group(1)) if match else None

        years = []
        for exp in resume.experience:
            if exp.current:
                years.append(9999)
            else:
                end_y = extract_year(exp.endDate)
                start_y = extract_year(exp.startDate)
                years.append(end_y or start_y or 0)

        for i in range(len(years) - 1):
            if years[i] > 0 and years[i + 1] > 0 and years[i] < years[i + 1]:
                issues.append(
                    RuleIssue(
                        id="ats-chronology-order",
                        rule_id=self.id,
                        severity=IssueSeverity.SUGGESTION,
                        category=RuleCategory.CONSISTENCY,
                        section="experience",
                        field_id="experience",
                        message="Experience entries appear out of reverse-chronological order.",
                        reason="Standard ATS parsers and human reviewers expect the most recent positions first.",
                        proposed_change=None,
                        requires_user_fact=False,
                    )
                )
                break

        passed = not any(
            i.severity in [IssueSeverity.ERROR, IssueSeverity.IMPORTANT] for i in issues
        )
        score_impact = min(30, sum(8 if i.severity == IssueSeverity.IMPORTANT else 4 for i in issues))

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
