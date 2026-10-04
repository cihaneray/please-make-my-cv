from app.matching.normalizer import extract_keywords_from_text, normalize_keyword
from app.schemas.job import JobMatchAnalysis, RequirementEvidence
from app.schemas.resume import ResumeDocument


class MatchingService:
    @staticmethod
    def match(
        resume: ResumeDocument,
        job_id: str,
        job_description: str,
        requirements: list[str] | None = None,
    ) -> JobMatchAnalysis:
        job_keywords = (
            {normalize_keyword(term) for term in requirements if term.strip()}
            if requirements is not None
            else extract_keywords_from_text(job_description)
        )

        # Attach the actual visible CV text supporting each matched requirement.
        import re

        candidates = [("profile", None, resume.profile.headline)]
        if resume.visibility.showSummary:
            candidates.append(("summary", None, resume.summary))
        for section, entries, visible in [
            ("skills", resume.skills, resume.visibility.showSkills),
            ("experience", resume.experience, resume.visibility.showExperience),
            ("projects", resume.projects, resume.visibility.showProjects),
        ]:
            if not visible:
                continue
            for entry in entries:
                texts = (
                    entry.skills
                    if section == "skills"
                    else [
                        *entry.technologies,
                        *entry.bullets,
                        *(
                            [entry.position, entry.summary]
                            if section == "experience"
                            else [entry.name]
                        ),
                    ]
                )
                candidates.extend((section, entry.id, text) for text in texts if text)
        evidence = []
        for term in sorted(job_keywords):
            for section, entry_id, text in candidates:
                terms = extract_keywords_from_text(text) | {normalize_keyword(text)}
                if term in terms or re.search(
                    r"(?<!\w)" + re.escape(term) + r"(?!\w)", text.lower()
                ):
                    evidence.append(
                        RequirementEvidence(
                            requirement=term, section=section, entryId=entry_id, text=text
                        )
                    )
        matched = sorted({item.requirement for item in evidence})
        missing = sorted(job_keywords - set(matched))
        score = round(len(matched) / len(job_keywords) * 100, 1) if job_keywords else None
        section_feedback: list[dict[str, str]] = []
        if missing:
            section_feedback.append(
                {
                    "section": "Skills & Experience",
                    "message": f"Job description emphasizes {len(missing)} requirements not explicitly mentioned in your CV: {', '.join(missing[:4])}.",
                    "recommendation": "If you have verifiable experience with these technologies, consider incorporating them into relevant role bullets.",
                }
            )
        if matched:
            section_feedback.append(
                {
                    "section": "Matched Strengths",
                    "message": f"Strong alignment on {len(matched)} core competencies: {', '.join(matched[:5])}.",
                    "recommendation": "Highlight quantified outcomes where you applied these competencies.",
                }
            )

        summary = (
            f"Compatibility rating is {score}%. "
            f"Found {len(matched)} matching requirements and {len(missing)} missing keywords."
        )

        if score is None:
            summary = "Insufficient recognized requirements. This matcher currently covers technology vocabulary; no compatibility score was calculated."
        return JobMatchAnalysis(
            jobId=job_id,
            resumeId=resume.metadata.id,
            matchScore=score,
            matchedSkills=matched,
            missingSkills=missing,
            recommendedKeywords=missing[:6],
            sectionFeedback=section_feedback,
            summary=summary,
            evidence=evidence,
        )
