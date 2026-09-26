import re
from collections import Counter
from typing import Protocol

from app.schemas.analysis import AnalysisIssue, IssueSeverity
from app.schemas.resume import ResumeDocument


class ResumeRule(Protocol):
    id: str
    category: str

    def analyze(self, resume: ResumeDocument) -> list[AnalysisIssue]: ...


class MissingContactRule:
    id = "missing-contact"
    category = "ATS"

    def analyze(self, resume: ResumeDocument) -> list[AnalysisIssue]:
        issues: list[AnalysisIssue] = []
        if not resume.profile.email:
            issues.append(
                AnalysisIssue(
                    ruleId="missing-email",
                    severity=IssueSeverity.CRITICAL,
                    section="profile",
                    message="Contact email address is missing.",
                    suggestion="Add a primary professional email address so recruiters and ATS can contact you.",
                )
            )
        elif not re.match(r"[^@]+@[^@]+\.[^@]+", resume.profile.email):
            issues.append(
                AnalysisIssue(
                    ruleId="invalid-email",
                    severity=IssueSeverity.IMPORTANT,
                    section="profile",
                    message="Contact email format appears invalid.",
                    suggestion="Verify that your email is formatted correctly (e.g. name@domain.com).",
                )
            )

        if not resume.profile.phone:
            issues.append(
                AnalysisIssue(
                    ruleId="missing-phone",
                    severity=IssueSeverity.WARNING,
                    section="profile",
                    message="Contact phone number is missing.",
                    suggestion="Provide a telephone number for initial phone screens and interview scheduling.",
                )
            )

        if not resume.profile.headline:
            issues.append(
                AnalysisIssue(
                    ruleId="missing-headline",
                    severity=IssueSeverity.IMPORTANT,
                    section="profile",
                    message="Professional headline / target role title is missing.",
                    suggestion="Add a clear headline (e.g. 'Senior Full-Stack Engineer') aligning with your target jobs.",
                )
            )

        if not resume.profile.location:
            issues.append(
                AnalysisIssue(
                    ruleId="missing-location",
                    severity=IssueSeverity.INFO,
                    section="profile",
                    message="Location is missing.",
                    suggestion="Specify City, Country or 'Remote' to satisfy ATS location filters.",
                )
            )

        return issues


class ExperienceQualityRule:
    id = "experience-quality"
    category = "content"

    WEAK_OPENINGS = [
        "worked on",
        "responsible for",
        "helped with",
        "assisted in",
        "participated in",
        "handled",
        "supported",
        "contributed to",
    ]

    def analyze(self, resume: ResumeDocument) -> list[AnalysisIssue]:
        issues: list[AnalysisIssue] = []

        if not resume.experience:
            issues.append(
                AnalysisIssue(
                    ruleId="empty-experience",
                    severity=IssueSeverity.CRITICAL,
                    section="experience",
                    message="Work experience section is completely empty.",
                    suggestion="List relevant professional positions, internships, or key freelance engagements.",
                )
            )
            return issues

        verbs_used: list[str] = []

        for exp in resume.experience:
            if not exp.position:
                issues.append(
                    AnalysisIssue(
                        ruleId="missing-position-title",
                        severity=IssueSeverity.IMPORTANT,
                        section="experience",
                        message=f"Experience entry for '{exp.company or 'Unknown Company'}' is missing a job title.",
                        suggestion="Provide an official or accurate job title for each role.",
                        targetId=exp.id,
                    )
                )

            if not exp.bullets:
                issues.append(
                    AnalysisIssue(
                        ruleId="empty-role-bullets",
                        severity=IssueSeverity.WARNING,
                        section="experience",
                        message=f"No bullet achievements specified for {exp.position or 'role'} at {exp.company}.",
                        suggestion="Add 2-4 quantified achievement bullets demonstrating business and technical impact.",
                        targetId=exp.id,
                    )
                )

            for bullet in exp.bullets:
                cleaned = bullet.strip().lower()
                # Check for weak openings
                for weak in self.WEAK_OPENINGS:
                    if cleaned.startswith(weak):
                        issues.append(
                            AnalysisIssue(
                                ruleId="weak-action-verb",
                                severity=IssueSeverity.WARNING,
                                section="experience",
                                message=f"Passive phrasing '{weak.capitalize()}' in: '{bullet[:40]}...'",
                                suggestion="Start bullets with strong action verbs (e.g. 'Architected', 'Spearheaded', 'Optimized', 'Delivered').",
                                targetId=exp.id,
                            )
                        )
                        break

                # Extract first word as verb candidate
                first_word = cleaned.split()[0] if cleaned.split() else ""
                if first_word:
                    verbs_used.append(first_word)

                # Check bullet length
                if len(bullet) > 280:
                    issues.append(
                        AnalysisIssue(
                            ruleId="bullet-too-long",
                            severity=IssueSeverity.INFO,
                            section="experience",
                            message=f"Lengthy bullet point ({len(bullet)} characters).",
                            suggestion="Consider tightening this bullet under 200 characters for optimal readability.",
                            targetId=exp.id,
                        )
                    )
                elif len(bullet) < 25:
                    issues.append(
                        AnalysisIssue(
                            ruleId="bullet-too-short",
                            severity=IssueSeverity.INFO,
                            section="experience",
                            message=f"Very brief bullet point: '{bullet}'.",
                            suggestion="Elaborate with specific technologies and context.",
                            targetId=exp.id,
                        )
                    )

        # Check verb repetitions
        verb_counts = Counter(verbs_used)
        for verb, count in verb_counts.items():
            if count >= 3 and len(verb) > 3:
                issues.append(
                    AnalysisIssue(
                        ruleId="repeated-action-verbs",
                        severity=IssueSeverity.INFO,
                        section="experience",
                        message=f"The verb '{verb.capitalize()}' is repeated {count} times across roles.",
                        suggestion="Vary your vocabulary using distinct action verbs to highlight breadth of responsibility.",
                    )
                )

        return issues


class SkillsCompletenessRule:
    id = "skills-completeness"
    category = "completeness"

    def analyze(self, resume: ResumeDocument) -> list[AnalysisIssue]:
        issues: list[AnalysisIssue] = []

        total_skills = sum(len(group.skills) for group in resume.skills)

        if total_skills == 0:
            issues.append(
                AnalysisIssue(
                    ruleId="missing-skills-section",
                    severity=IssueSeverity.IMPORTANT,
                    section="skills",
                    message="No technical or professional skills are listed.",
                    suggestion="Add a categorized list of tools, languages, and technical competencies.",
                )
            )
        elif total_skills < 4:
            issues.append(
                AnalysisIssue(
                    ruleId="few-skills",
                    severity=IssueSeverity.WARNING,
                    section="skills",
                    message=f"Only {total_skills} skills listed. Most ATS models look for key core proficiencies.",
                    suggestion="Include your key technologies, tools, and domain specializations.",
                )
            )

        return issues


class SummaryQualityRule:
    id = "summary-quality"
    category = "content"

    def analyze(self, resume: ResumeDocument) -> list[AnalysisIssue]:
        issues: list[AnalysisIssue] = []

        if not resume.summary.strip():
            issues.append(
                AnalysisIssue(
                    ruleId="missing-summary",
                    severity=IssueSeverity.INFO,
                    section="summary",
                    message="Professional summary is empty.",
                    suggestion="A concise 2-3 sentence overview establishes executive presence and helps recruiter scanning.",
                )
            )
        else:
            word_count = len(resume.summary.split())
            if word_count > 150:
                issues.append(
                    AnalysisIssue(
                        ruleId="summary-too-long",
                        severity=IssueSeverity.INFO,
                        section="summary",
                        message=f"Professional summary is lengthy ({word_count} words).",
                        suggestion="Keep summary between 40-90 impactful words.",
                    )
                )

        return issues


ALL_RULES: list[ResumeRule] = [
    MissingContactRule(),
    ExperienceQualityRule(),
    SkillsCompletenessRule(),
    SummaryQualityRule(),
]
