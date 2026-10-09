from __future__ import annotations

import re
from datetime import date
from typing import Any

from app.rules.base import BaseRule, IssueSeverity, RuleCategory, RuleIssue, RuleResult, RuleType
from app.schemas.resume import ResumeDocument

_DATE = re.compile(
    r"^(?:(?P<year>19\d{2}|20\d{2})(?:[-/](?P<month>0?[1-9]|1[0-2]))?|(?P<month_first>0?[1-9]|1[0-2])/(?P<year_first>19\d{2}|20\d{2}))$"
)


def _month(value: str) -> tuple[int, int, bool] | None:
    """Return year, month, and whether the month was specified; ignore ambiguous values."""
    match = _DATE.fullmatch((value or "").strip())
    if not match:
        return None
    year = match["year"] or match["year_first"]
    month = match["month"] or match["month_first"]
    return int(year), int(month or "1"), month is not None


class CareerTimelineRule(BaseRule):
    """Report overlapping jobs and sizeable gaps in dated employment history."""

    id = "career-timeline"
    name = "Career Timeline"
    version = "1.0.0"
    rule_type = RuleType.DETERMINISTIC_VALIDATION
    category = RuleCategory.RELEVANCE
    description = "Reports dated employment overlaps and gaps of at least six months."
    GAP_MONTHS = 6

    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        lang = "tr" if (resume.metadata.language or "").lower().startswith("tr") else "en"
        today = (context or {}).get("as_of")
        if isinstance(today, str):
            parsed_today = _month(today)
            today = date(parsed_today[0], parsed_today[1], 1) if parsed_today else None
        if not isinstance(today, date):
            today = date.today()
        now = today.year * 12 + today.month - 1

        # Use broad bounds for year-only dates. This makes overlap/gap claims conservative.
        records: list[dict[str, Any]] = []
        for idx, exp in enumerate(resume.experience):
            start = _month(exp.startDate)
            end = _month(exp.endDate)
            if not start:
                continue
            start_value = start[0] * 12 + (start[1] - 1 if start[2] else 0)
            if exp.current:
                end_value = now
                end_max = now
            elif end:
                end_value = end[0] * 12 + (end[1] - 1 if end[2] else 11)
                end_max = end[0] * 12 + (end[1] - 1 if end[2] else 11)
            else:
                continue
            # For year-only start, latest possible start is December; for month precision exact.
            start_max = start[0] * 12 + (start[1] - 1 if start[2] else 11)
            records.append(
                {
                    "idx": idx,
                    "start_min": start_value,
                    "start_max": start_max,
                    "end_min": end_value,
                    "end_max": end_max,
                }
            )

        issues: list[RuleIssue] = []
        for pos, left in enumerate(records):
            for right in records[pos + 1 :]:
                # Only report overlap when it is certain despite year-only date uncertainty.
                if max(left["start_max"], right["start_max"]) <= min(
                    left["end_min"], right["end_min"]
                ):
                    issues.append(
                        RuleIssue(
                            id=f"career-overlap-{left['idx']}-{right['idx']}",
                            rule_id=self.id,
                            severity=IssueSeverity.INFO,
                            category=RuleCategory.RELEVANCE,
                            section="experience",
                            field_id=f"experience-{right['idx']}",
                            message=(
                                "These experience dates overlap; concurrent roles can be valid."
                                if lang == "en"
                                else "Bu deneyimlerin tarihleri çakışıyor; eş zamanlı roller geçerli olabilir."
                            ),
                            reason=(
                                "Review the dates if they were not concurrent."
                                if lang == "en"
                                else "Eş zamanlı değilse tarihleri gözden geçirin."
                            ),
                            proposed_change=None,
                            requires_user_fact=False,
                        )
                    )

        # Career gaps are measured across the union of broad employment intervals.
        # Require month-precision boundaries so year-only records cannot imply a gap.
        dated_employment_count = sum(
            1
            for exp in resume.experience
            if exp.company.strip()
            or exp.position.strip()
            or exp.bullets
            or exp.startDate.strip()
            or exp.endDate.strip()
            or exp.current
        )
        all_dates_precise = len(records) == dated_employment_count and all(
            resume.experience[r["idx"]].current
            or (
                _month(resume.experience[r["idx"]].startDate)[2]
                and _month(resume.experience[r["idx"]].endDate)[2]
            )
            for r in records
        )
        precise = (
            [
                r
                for r in records
                if resume.experience[r["idx"]].current
                or (
                    _month(resume.experience[r["idx"]].startDate)[2]
                    and _month(resume.experience[r["idx"]].endDate)[2]
                )
            ]
            if all_dates_precise
            else []
        )
        precise.sort(key=lambda record: record["start_min"])
        merged: list[list[int]] = []
        for record in precise:
            start, end = record["start_min"], record["end_max"]
            if merged and start <= merged[-1][1] + 1:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        for previous, following in zip(merged, merged[1:]):
            gap = following[0] - previous[1] - 1
            if gap < self.GAP_MONTHS:
                continue
            issues.append(
                RuleIssue(
                    id=f"career-gap-{previous[1]}-{following[0]}",
                    rule_id=self.id,
                    severity=IssueSeverity.INFO,
                    category=RuleCategory.RELEVANCE,
                    section="experience",
                    field_id="experience",
                    message=(
                        "There is a gap of at least six months between dated roles."
                        if lang == "en"
                        else "Tarihli roller arasında en az altı aylık bir boşluk görünüyor."
                    ),
                    reason=(
                        "If you want to, you can add any relevant activity for this period. No explanation is required."
                        if lang == "en"
                        else "İsterseniz bu döneme ait ilgili bir etkinlik ekleyebilirsiniz. Açıklama zorunlu değildir."
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
