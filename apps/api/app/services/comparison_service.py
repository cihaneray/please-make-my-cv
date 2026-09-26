from app.schemas.analysis import ComparisonChange, ResumeComparisonReport
from app.schemas.resume import ResumeDocument


class ComparisonService:
    @staticmethod
    def compare(source: ResumeDocument, target: ResumeDocument) -> ResumeComparisonReport:
        changes: list[ComparisonChange] = []

        # Compare Profile
        for field in [
            "firstName",
            "lastName",
            "headline",
            "email",
            "phone",
            "location",
            "website",
            "linkedin",
            "github",
        ]:
            s_val = getattr(source.profile, field, "")
            t_val = getattr(target.profile, field, "")
            if s_val != t_val:
                changes.append(
                    ComparisonChange(
                        category="profile",
                        changeType="modified",
                        description=f"Profile '{field}' changed from '{s_val}' to '{t_val}'.",
                        details={"field": field, "from": s_val, "to": t_val},
                    )
                )

        # Compare Summary
        if source.summary != target.summary:
            changes.append(
                ComparisonChange(
                    category="summary",
                    changeType="modified",
                    description="Professional summary was modified.",
                    details={
                        "from": source.summary[:80] + "...",
                        "to": target.summary[:80] + "...",
                    },
                )
            )

        # Compare Experience items
        s_companies = {e.company: e for e in source.experience if e.company}
        t_companies = {e.company: e for e in target.experience if e.company}

        for comp in t_companies.keys() - s_companies.keys():
            changes.append(
                ComparisonChange(
                    category="experience",
                    changeType="added",
                    description=f"Added work experience entry for '{comp}'.",
                    details={"company": comp, "position": t_companies[comp].position},
                )
            )

        for comp in s_companies.keys() - t_companies.keys():
            changes.append(
                ComparisonChange(
                    category="experience",
                    changeType="removed",
                    description=f"Removed work experience entry for '{comp}'.",
                    details={"company": comp, "position": s_companies[comp].position},
                )
            )

        for comp in s_companies.keys() & t_companies.keys():
            s_exp = s_companies[comp]
            t_exp = t_companies[comp]
            if s_exp.position != t_exp.position:
                changes.append(
                    ComparisonChange(
                        category="experience",
                        changeType="modified",
                        description=f"Job title at '{comp}' changed from '{s_exp.position}' to '{t_exp.position}'.",
                    )
                )
            if s_exp.bullets != t_exp.bullets:
                diff_count = len(t_exp.bullets) - len(s_exp.bullets)
                changes.append(
                    ComparisonChange(
                        category="experience",
                        changeType="modified",
                        description=f"Achievements for '{comp}' updated ({diff_count:+d} bullets net difference).",
                    )
                )

        # Compare Skills
        s_skills = {s for group in source.skills for s in group.skills}
        t_skills = {s for group in target.skills for s in group.skills}

        added_skills = t_skills - s_skills
        removed_skills = s_skills - t_skills

        if added_skills:
            changes.append(
                ComparisonChange(
                    category="skills",
                    changeType="added",
                    description=f"Added skills: {', '.join(sorted(added_skills))}.",
                )
            )
        if removed_skills:
            changes.append(
                ComparisonChange(
                    category="skills",
                    changeType="removed",
                    description=f"Removed skills: {', '.join(sorted(removed_skills))}.",
                )
            )

        # Compare Template/Design
        if source.design.template != target.design.template:
            changes.append(
                ComparisonChange(
                    category="design",
                    changeType="modified",
                    description=f"Visual template switched from '{source.design.template}' to '{target.design.template}'.",
                )
            )

        summary = (
            f"Compared '{source.metadata.title}' with '{target.metadata.title}'. "
            f"Detected {len(changes)} semantic difference(s)."
        )

        return ResumeComparisonReport(
            sourceResumeId=source.metadata.id,
            targetResumeId=target.metadata.id,
            sourceTitle=source.metadata.title,
            targetTitle=target.metadata.title,
            changes=changes,
            summary=summary,
        )
