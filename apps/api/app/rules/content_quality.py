from __future__ import annotations

import re
from typing import Any

from app.rules.base import BaseRule, IssueSeverity, RuleCategory, RuleIssue, RuleResult, RuleType
from app.schemas.resume import ResumeDocument


class ExperienceContentQualityRule(BaseRule):
    """Conservative, language-aware suggestions for experience bullet wording."""

    id = "experience-content-quality"
    name = "Experience Content Quality"
    version = "1.0.0"
    rule_type = RuleType.DETERMINISTIC_VALIDATION
    category = RuleCategory.RELEVANCE
    description = "Flags a small set of vague openings, clichés, and passive constructions."

    WEAK_OPENINGS = {
        "en": (
            "worked on",
            "helped with",
            "responsible for",
            "assisted with",
            "assisted in",
            "participated in",
        ),
        "tr": ("görev aldım", "çalıştım", "yardımcı oldum", "sorumluydum", "katılım sağladım"),
    }
    CLICHES = {
        "en": ("team player", "results-driven", "think outside the box", "synergy", "self-starter"),
        "tr": (
            "takım çalışmasına yatkın",
            "yenilikçi çözümler sunarak değer yarattım",
            "dinamik süreçlerde aktif rol aldım",
            "katma değer sağlayan projeler geliştirdim",
        ),
    }
    PASSIVE = {
        "en": (
            "was responsible for",
            "were responsible for",
            "was involved in",
            "were involved in",
            "was tasked with",
            "were tasked with",
        ),
        "tr": ("tarafımdan gerçekleştirildi", "tarafımdan yürütüldü", "tarafımdan geliştirildi"),
    }

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        lang = "tr" if (resume.metadata.language or "").lower().startswith("tr") else "en"
        issues: list[RuleIssue] = []
        for exp_idx, exp in enumerate(resume.experience):
            for bullet_idx, bullet in enumerate(exp.bullets):
                text = bullet.strip()
                lowered = text.casefold()
                field = f"experience-{exp_idx}-bullet-{bullet_idx}"
                matches = (
                    (
                        "weak-opening",
                        self.WEAK_OPENINGS[lang],
                        lambda phrase: lowered.startswith(phrase),
                    ),
                    ("cliche", self.CLICHES[lang], lambda phrase: phrase in lowered),
                    ("passive-voice", self.PASSIVE[lang], lambda phrase: phrase in lowered),
                )
                for suffix, phrases, predicate in matches:
                    phrase = next(
                        (candidate for candidate in phrases if predicate(candidate)), None
                    )
                    if phrase is None:
                        continue
                    issues.append(
                        RuleIssue(
                            id=f"content-{suffix}-{exp_idx}-{bullet_idx}",
                            rule_id=self.id,
                            severity=IssueSeverity.INFO,
                            category=RuleCategory.RELEVANCE,
                            section="experience",
                            field_id=field,
                            message={
                                "en": "This bullet may read more clearly with a specific action and contribution.",
                                "tr": "Bu madde, belirli bir eylem ve katkı belirtilerek daha açık yazılabilir.",
                            }[lang],
                            reason={
                                "en": f"The phrase “{phrase}” can sound vague or indirect. Describe what you personally did, if useful.",
                                "tr": f"“{phrase}” ifadesi belirsiz veya dolaylı kalabilir. Uygunsa, yaptığınız işi doğrudan belirtin.",
                            }[lang],
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )
        return RuleResult(
            rule_id=self.id,
            rule_type=self.rule_type,
            category=self.category,
            version=self.version,
            passed=True,
            score_impact=0,
            issues=issues,
            metadata={"issues_count": len(issues)},
        )


class OutcomeDetailRule(BaseRule):
    """Advises that a bullet could include a supported outcome; never requires numbers."""

    id = "experience-outcome-detail"
    name = "Experience Outcome Detail"
    version = "1.0.0"
    rule_type = RuleType.PRODUCT_PREFERENCE
    category = RuleCategory.RELEVANCE
    description = "Offers an optional prompt to add a concrete outcome when one is known."
    NUMBER = re.compile(r"\d")

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        issues: list[RuleIssue] = []
        lang = "tr" if (resume.metadata.language or "").lower().startswith("tr") else "en"
        for exp_idx, exp in enumerate(resume.experience):
            for bullet_idx, bullet in enumerate(exp.bullets):
                if not bullet.strip() or self.NUMBER.search(bullet):
                    continue
                issues.append(
                    RuleIssue(
                        id=f"outcome-detail-{exp_idx}-{bullet_idx}",
                        rule_id=self.id,
                        severity=IssueSeverity.INFO,
                        category=RuleCategory.RELEVANCE,
                        section="experience",
                        field_id=f"experience-{exp_idx}-bullet-{bullet_idx}",
                        message=(
                            "If you know the outcome, consider adding it to this bullet."
                            if lang == "en"
                            else "Sonucu biliyorsanız bu maddeye eklemeyi düşünebilirsiniz."
                        ),
                        reason=(
                            "A concrete outcome can add useful context; a number is optional and should only be included if accurate."
                            if lang == "en"
                            else "Somut bir sonuç yararlı bağlam sağlayabilir; sayı kullanmak isteğe bağlıdır ve yalnızca doğruysa eklenmelidir."
                        ),
                        proposed_change=None,
                        requires_user_fact=True,
                    )
                )
        return RuleResult(
            rule_id=self.id,
            rule_type=self.rule_type,
            category=self.category,
            version=self.version,
            passed=True,
            score_impact=0,
            issues=issues,
            metadata={"issues_count": len(issues)},
        )
