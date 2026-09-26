from datetime import UTC, datetime

from app.analyzers.rules import ALL_RULES
from app.schemas.analysis import AnalysisIssue, IssueSeverity, ResumeAnalysisReport
from app.schemas.resume import ResumeDocument


class AnalysisService:
    @staticmethod
    def analyze(resume: ResumeDocument) -> ResumeAnalysisReport:
        all_issues: list[AnalysisIssue] = []

        for rule in ALL_RULES:
            issues = rule.analyze(resume)
            all_issues.extend(issues)

        # Calculate scores
        # Deductions based on severity
        deduction_weights = {
            IssueSeverity.CRITICAL: 20,
            IssueSeverity.IMPORTANT: 10,
            IssueSeverity.WARNING: 5,
            IssueSeverity.INFO: 2,
        }

        total_deduction = sum(deduction_weights.get(issue.severity, 0) for issue in all_issues)
        overall_score = max(20, min(100, 100 - total_deduction))

        ats_issues = [i for i in all_issues if i.section in ["profile", "skills", "experience"]]
        ats_deduction = sum(deduction_weights.get(issue.severity, 0) for issue in ats_issues)
        ats_score = max(25, min(100, 100 - ats_deduction))

        content_issues = [
            i
            for i in all_issues
            if i.ruleId
            in ["weak-action-verb", "repeated-action-verbs", "bullet-too-long", "summary-too-long"]
        ]
        content_deduction = sum(
            deduction_weights.get(issue.severity, 0) for issue in content_issues
        )
        content_score = max(30, min(100, 100 - content_deduction))

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

        return ResumeAnalysisReport(
            resumeId=resume.metadata.id,
            overallScore=overall_score,
            atsCompatibilityScore=ats_score,
            contentQualityScore=content_score,
            issues=all_issues,
            wordCount=word_count,
            bulletCount=bullet_count,
            strengths=strengths,
            calculatedAt=datetime.now(UTC).isoformat(),
        )
