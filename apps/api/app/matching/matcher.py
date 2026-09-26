from app.matching.normalizer import extract_keywords_from_text, normalize_keyword
from app.schemas.job import JobMatchAnalysis
from app.schemas.resume import ResumeDocument


class MatchingService:
    @staticmethod
    def match(resume: ResumeDocument, job_id: str, job_description: str) -> JobMatchAnalysis:
        job_keywords = extract_keywords_from_text(job_description)

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

        # Intersect
        if not job_keywords:
            matched: list[str] = list(resume_terms)[:5]
            missing: list[str] = []
            score = 75.0
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
