from __future__ import annotations

import re
from typing import Any

from app.matching.normalizer import extract_keywords_from_text
from app.rules.base import (
    BaseRule,
    IssueSeverity,
    RuleCategory,
    RuleIssue,
    RuleResult,
    RuleType,
)
from app.schemas.resume import ResumeDocument


class JobKeywordMatchRule(BaseRule):
    """Evidence-based job keyword matching with controlled skill synonyms."""

    id = "job-keyword-match"
    name = "Job Keyword and Evidence-Based Match Rule"
    version = "1.0.0"
    rule_type = RuleType.ATS_HEURISTIC
    category = RuleCategory.JOB_MATCH
    description = (
        "Matches target job requirements against candidate evidence with controlled "
        "synonym normalization and strict evidence attribution."
    )

    CANONICAL_SYNONYMS = {
        "postgres": "postgresql",
        "psql": "postgresql",
        "js": "javascript",
        "ts": "typescript",
        "ml": "machine learning",
        "gcp": "google cloud platform",
        "k8s": "kubernetes",
        "ai": "artificial intelligence",
        "ci/cd": "ci/cd",
        "cicd": "ci/cd",
        "react.js": "react",
        "reactjs": "react",
        "vue.js": "vue",
        "vuejs": "vue",
        "node.js": "node",
        "nodejs": "node",
    }

    @classmethod
    def canonicalize(cls, term: str) -> str:
        cleaned = term.strip().lower()
        return cls.CANONICAL_SYNONYMS.get(cleaned, cleaned)

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        context = context or {}
        job_keywords: list[str] = context.get("keywords", [])
        if not job_keywords and resume.metadata.targetRole:
            # A job title is not a list of skill requirements (e.g. "Engineer").
            job_keywords = sorted(extract_keywords_from_text(resume.metadata.targetRole))

        if not job_keywords:
            return RuleResult(
                rule_id=self.id,
                rule_type=self.rule_type,
                category=self.category,
                version=self.version,
                passed=True,
                metadata={"status": "no_keywords_to_evaluate"},
            )

        # Collect candidate evidence text corpus
        candidate_skills = {
            self.canonicalize(s): s for group in resume.skills for s in group.skills
        }

        evidence_found: dict[str, list[dict[str, str]]] = {}
        missing_keywords: list[str] = []

        for kw in job_keywords:
            canon_kw = self.canonicalize(kw)
            matched = False

            # Check direct skills
            if canon_kw in candidate_skills:
                evidence_found.setdefault(kw, []).append(
                    {
                        "section": "skills",
                        "item": candidate_skills[canon_kw],
                        "text": f"Listed in technical skills as '{candidate_skills[canon_kw]}'",
                    }
                )
                matched = True

            # Check experience bullets
            kw_regex = re.compile(rf"\b{re.escape(canon_kw)}\b", re.IGNORECASE)
            for exp_idx, exp in enumerate(resume.experience):
                for bullet in exp.bullets:
                    if kw_regex.search(self.canonicalize(bullet)):
                        evidence_found.setdefault(kw, []).append(
                            {
                                "section": "experience",
                                "item": exp.company or f"Experience #{exp_idx + 1}",
                                "text": bullet[:100] + ("..." if len(bullet) > 100 else ""),
                            }
                        )
                        matched = True
                        break

            if not matched:
                missing_keywords.append(kw)

        issues: list[RuleIssue] = []
        for missing in missing_keywords[:5]:
            issues.append(
                RuleIssue(
                    id=f"job-match-missing-{missing.lower()}",
                    rule_id=self.id,
                    severity=IssueSeverity.SUGGESTION,
                    category=RuleCategory.JOB_MATCH,
                    section="skills",
                    field_id=None,
                    message=f"Missing evidence for job keyword: '{missing}'.",
                    reason="Target role or posting mentions this requirement, but no supporting bullet or skill was found.",
                    proposed_change=None,
                    requires_user_fact=True,
                )
            )

        passed = len(missing_keywords) == 0
        match_rate = len(evidence_found) / max(1, len(job_keywords))

        return RuleResult(
            rule_id=self.id,
            rule_type=self.rule_type,
            category=self.category,
            version=self.version,
            passed=passed,
            score_impact=int((1.0 - match_rate) * 20),
            issues=issues,
            metadata={
                "total_keywords": len(job_keywords),
                "matched_count": len(evidence_found),
                "match_rate": round(match_rate, 2),
                "evidence": evidence_found,
                "missing": missing_keywords,
            },
        )
