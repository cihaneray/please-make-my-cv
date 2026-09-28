from app.matching.normalizer import extract_keywords_from_text, normalize_keyword
from app.schemas.job import JobMatchAnalysis
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

        # Extract all resume terms
        resume_terms: set[str] = set()

        # From skills
        for group in resume.skills:
            for s in group.skills:
                resume_terms.add(normalize_keyword(s))

        # From experience technologies and bullets
        for exp in resume.experience:
            for t in exp.technologies:
                resume_terms.add(normalize_keyword(t))
            for b in exp.bullets:
                resume_terms.update(extract_keywords_from_text(b))

        # From projects
        for p in resume.projects:
            for t in p.technologies:
                resume_terms.add(normalize_keyword(t))
            for b in p.bullets:
                resume_terms.update(extract_keywords_from_text(b))

        # From summary & headline
        if resume.summary:
            resume_terms.update(extract_keywords_from_text(resume.summary))
        if resume.profile.headline:
            resume_terms.update(extract_keywords_from_text(resume.profile.headline))

        if requirements is not None:
            import re

            content = " ".join(
                [resume.summary, resume.profile.headline]
                + [
                    f"{entry.position} {entry.summary} {' '.join(entry.bullets)}"
                    for entry in resume.experience
                ]
                + [" ".join(entry.bullets) for entry in resume.projects]
            ).lower()
            for term in job_keywords:
                if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", content):
                    resume_terms.add(term)
        # Intersect
        if not job_keywords:
            matched: list[str] = []
            missing: list[str] = []
            score = None
        else:
            matched_set = job_keywords.intersection(resume_terms)
            missing_set = job_keywords.difference(resume_terms)

            matched = sorted(list(matched_set))
            missing = sorted(list(missing_set))
            score = round((len(matched_set) / max(1, len(job_keywords))) * 100, 1)

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
        )
