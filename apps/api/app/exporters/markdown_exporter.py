from app.schemas.resume import ResumeDocument


class MarkdownExporter:
    @staticmethod
    def export(doc: ResumeDocument) -> str:
        lines: list[str] = []

        # Name & Title
        full_name = f"{doc.profile.firstName} {doc.profile.lastName}".strip()
        lines.append(f"# {full_name or 'Curriculum Vitae'}\n")

        if doc.profile.headline:
            lines.append(f"{doc.profile.headline}\n")

        # Contact Info
        contact_parts: list[str] = []
        if doc.profile.email:
            contact_parts.append(doc.profile.email)
        if doc.profile.phone:
            contact_parts.append(doc.profile.phone)
        if doc.profile.location:
            contact_parts.append(doc.profile.location)
        if doc.profile.website:
            contact_parts.append(doc.profile.website)
        if doc.profile.linkedin:
            contact_parts.append(doc.profile.linkedin)
        if doc.profile.github:
            contact_parts.append(doc.profile.github)

        if contact_parts:
            lines.append("## Contact\n")
            lines.append(" • ".join(contact_parts) + "\n")

        # Summary
        if doc.summary and doc.visibility.showSummary:
            lines.append("## Professional Summary\n")
            lines.append(f"{doc.summary}\n")

        # Experience
        if doc.experience and doc.visibility.showExperience:
            lines.append("## Experience\n")
            for exp in doc.experience:
                company_str = f" — {exp.company}" if exp.company else ""
                lines.append(f"### {exp.position}{company_str}")

                date_parts: list[str] = []
                if exp.startDate:
                    date_parts.append(exp.startDate)
                if exp.current:
                    date_parts.append("Present")
                elif exp.endDate:
                    date_parts.append(exp.endDate)

                meta_line = " — ".join(filter(None, [" - ".join(date_parts), exp.location]))
                if meta_line:
                    lines.append(f"*{meta_line}*\n")

                if exp.summary:
                    lines.append(f"{exp.summary}\n")

                for bullet in exp.bullets:
                    lines.append(f"- {bullet}")

                if exp.technologies:
                    lines.append(f"\n*Technologies:* {', '.join(exp.technologies)}")
                lines.append("")

        # Projects
        if doc.projects and doc.visibility.showProjects:
            lines.append("## Projects\n")
            for proj in doc.projects:
                lines.append(f"### {proj.name}")
                if proj.role or proj.url:
                    meta = " — ".join(filter(None, [proj.role, proj.url]))
                    lines.append(f"*{meta}*\n")
                for bullet in proj.bullets:
                    lines.append(f"- {bullet}")
                if proj.technologies:
                    lines.append(f"*Technologies:* {', '.join(proj.technologies)}")
                lines.append("")

        # Education
        if doc.education and doc.visibility.showEducation:
            lines.append("## Education\n")
            for edu in doc.education:
                lines.append(f"### {edu.degree or 'Degree'} — {edu.institution}")
                date_str = f"{edu.startDate} — {edu.endDate or 'Present'}" if edu.startDate else ""
                if date_str or edu.location:
                    lines.append(f"*{' — '.join(filter(None, [date_str, edu.location]))}*\n")
                for h in edu.highlights:
                    lines.append(f"- {h}")
                lines.append("")

        # Skills
        if doc.skills and doc.visibility.showSkills:
            lines.append("## Core Skills\n")
            for group in doc.skills:
                lines.append(f"- **{group.category}:** {', '.join(group.skills)}")
            lines.append("")

        # Certifications
        if doc.certifications and doc.visibility.showCertifications:
            lines.append("## Certifications\n")
            for cert in doc.certifications:
                issuer = f" ({cert.issuer})" if cert.issuer else ""
                lines.append(f"- **{cert.name}**{issuer} — {cert.issueDate}")
            lines.append("")

        # Languages
        if doc.languages and doc.visibility.showLanguages:
            lines.append("## Languages\n")
            for lang in doc.languages:
                lines.append(f"- {lang.language}: {lang.proficiency}")
            lines.append("")

        # Custom sections
        for custom in doc.customSections:
            lines.append(f"## {custom.title}\n")
            for item in custom.items:
                if item.title:
                    lines.append(f"### {item.title}")
                if item.subtitle or item.date:
                    lines.append(f"*{' — '.join(filter(None, [item.subtitle, item.date]))}*\n")
                if item.description:
                    lines.append(f"{item.description}\n")
                for bullet in item.bullets:
                    lines.append(f"- {bullet}")
                lines.append("")

        return "\n".join(lines).strip() + "\n"
