from __future__ import annotations

import logging
from typing import Any

from app.rules.ats import ATSParseabilityRule
from app.rules.base import BaseRule, IssueSeverity, RuleCategory, RuleResult
from app.rules.facts import FactIntegrityRule
from app.rules.job_match import JobKeywordMatchRule
from app.rules.privacy import KVKKPrivacyRule
from app.rules.turkish import TurkishLanguageRule
from app.schemas.resume import ResumeDocument

logger = logging.getLogger("cv_workspace.rules")


class RuleRegistry:
    """Central registry for deterministic career validation rules loaded at startup."""

    def __init__(self) -> None:
        self._rules: dict[str, BaseRule] = {}
        self._register_default_rules()

    def register(self, rule: BaseRule) -> None:
        self._rules[rule.id] = rule
        logger.info(
            "Registered rule: %s (v%s, type: %s)", rule.id, rule.version, rule.rule_type.value
        )

    def get_rule(self, rule_id: str) -> BaseRule | None:
        return self._rules.get(rule_id)

    def list_rules(self) -> list[BaseRule]:
        return list(self._rules.values())

    def _register_default_rules(self) -> None:
        self.register(TurkishLanguageRule())
        self.register(ATSParseabilityRule())
        self.register(KVKKPrivacyRule())
        self.register(FactIntegrityRule())
        self.register(JobKeywordMatchRule())

    def evaluate_all(
        self, resume: ResumeDocument, context: dict[str, Any] | None = None
    ) -> list[RuleResult]:
        results: list[RuleResult] = []
        for rule in self._rules.values():
            try:
                res = rule.evaluate(resume, context)
                results.append(res)
            except Exception as e:
                logger.error("Error executing rule %s: %s", rule.id, e, exc_info=True)
        return results

    def calculate_ats_heuristic(
        self, resume: ResumeDocument, results: list[RuleResult]
    ) -> dict[str, Any]:
        """Calculates a transparent heuristic breakdown out of 100 points as specified in rule 26."""
        # Initial maximum values
        scores = {
            "structure": 20,
            "readability": 20,
            "contact": 15,
            "consistency": 15,
            "job_relevance": None,
            "parseability": 10,
        }

        all_issues = [issue for r in results for issue in r.issues]

        for issue in all_issues:
            deduction = 5 if issue.severity == IssueSeverity.IMPORTANT else 2
            if issue.category == RuleCategory.ATS:
                scores["parseability"] = max(0, scores["parseability"] - deduction)
            elif issue.category == RuleCategory.CONTENT:
                scores["readability"] = max(0, scores["readability"] - deduction)
            elif issue.category == RuleCategory.CONSISTENCY:
                scores["consistency"] = max(0, scores["consistency"] - deduction)
            elif issue.category == RuleCategory.PRIVACY:
                scores["structure"] = max(0, scores["structure"] - deduction)
            elif issue.category == RuleCategory.JOB_MATCH:
                pass  # Job-specific scoring is provided by the matching endpoint.
            elif issue.category == RuleCategory.LANGUAGE:
                scores["readability"] = max(0, scores["readability"] - deduction)

        if not resume.profile.email:
            scores["contact"] = max(0, scores["contact"] - 10)
        if not resume.profile.phone:
            scores["contact"] = max(0, scores["contact"] - 5)

        total = round(sum(value for value in scores.values() if value is not None) / 80 * 100)

        return {
            "breakdown": scores,
            "total": total,
            "total_issues": len(all_issues),
            "critical_count": sum(1 for i in all_issues if i.severity == IssueSeverity.ERROR),
            "important_count": sum(1 for i in all_issues if i.severity == IssueSeverity.IMPORTANT),
            "suggestion_count": sum(
                1 for i in all_issues if i.severity == IssueSeverity.SUGGESTION
            ),
            "heuristic_notice": "Internal document heuristic. Job relevance is not assessed here; use Jobs to compare a specific description. Not an external ATS endorsement.",
        }


# Global singleton loaded on startup
default_rule_registry = RuleRegistry()
