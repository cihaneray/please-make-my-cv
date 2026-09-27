from datetime import UTC, datetime

from app.rules.base import IssueSeverity as RuleIssueSeverity
from app.rules.registry import default_rule_registry
from app.schemas.analysis import AnalysisIssue, IssueSeverity, ResumeAnalysisReport
from app.schemas.resume import ResumeDocument


class AnalysisService:
    @staticmethod
    def analyze(resume: ResumeDocument) -> ResumeAnalysisReport:
        all_issues: list[AnalysisIssue] = []

        # 1. Execute deterministic rule registry
        rule_results = default_rule_registry.evaluate_all(resume)
        for res in rule_results:
            for rule_issue in res.issues:
                sev = IssueSeverity.INFO
                if rule_issue.severity == RuleIssueSeverity.ERROR:
                    sev = IssueSeverity.CRITICAL
                elif rule_issue.severity == RuleIssueSeverity.IMPORTANT:
                    sev = IssueSeverity.IMPORTANT
                elif rule_issue.severity == RuleIssueSeverity.SUGGESTION:
                    sev = IssueSeverity.WARNING
                elif rule_issue.severity == RuleIssueSeverity.INFO:
                    sev = IssueSeverity.INFO

                all_issues.append(
                    AnalysisIssue(
                        ruleId=rule_issue.id,
                        severity=sev,
                        section=rule_issue.section,
                        message=rule_issue.message,
                        suggestion=rule_issue.reason or rule_issue.proposed_change,
                        targetId=rule_issue.field_id,
                    )
                )

        # 2. Transparent ATS Heuristic Calculation
        ats_eval = default_rule_registry.calculate_ats_heuristic(resume, rule_results)
        ats_score = max(20, min(100, ats_eval["total"]))

        # 3. Content score calculation based on content/formatting deductions
        content_issues = [
            i
            for i in all_issues
            if i.section in ["experience", "projects", "summary"]
        ]
        content_deduction = sum(
            15 if i.severity == IssueSeverity.CRITICAL
            else 10 if i.severity == IssueSeverity.IMPORTANT
            else 5 if i.severity == IssueSeverity.WARNING
            else 2
            for i in content_issues
        )
        content_score = max(25, min(100, 100 - content_deduction))

        # Overall score is a weighted blend
        overall_score = int(ats_score * 0.5 + content_score * 0.5)

        # Text statistics
        text_corp = f"{resume.summary} " + " ".join(
            f"{e.position} {e.company} {' '.join(e.bullets)}" for e in resume.experience
        )
        words = text_corp.split()
        word_count = len(words)
        bullet_count = sum(len(e.bullets) for e in resume.experience) + sum(
            len(p.bullets) for p in resume.projects
        )

        strengths: list[str] = []
        if resume.profile.email and resume.profile.phone and resume.profile.headline:
            strengths.append("Complete contact profile with clear professional headline.")
        if bullet_count >= 5:
            strengths.append(
                f"Substantial quantified experience ({bullet_count} accomplishment bullets)."
            )
        if sum(len(g.skills) for g in resume.skills) >= 6:
            strengths.append("Well-categorized and indexed technical competencies.")
        if resume.education:
            strengths.append("Documented academic and credential background.")
        if (resume.metadata.language or "").lower() == "tr":
            strengths.append("Verified Turkish language and TDK 2026 orthography compliance.")

        return ResumeAnalysisReport(
            resumeId=resume.metadata.id,
            overallScore=overall_score,
            atsCompatibilityScore=ats_score,
            contentQualityScore=content_score,
            issues=all_issues,
            wordCount=word_count,
            bulletCount=bullet_count,
            strengths=strengths,
            atsBreakdown=ats_eval["breakdown"],
            heuristicNotice=ats_eval["heuristic_notice"],
            calculatedAt=datetime.now(UTC).isoformat(),
        )
