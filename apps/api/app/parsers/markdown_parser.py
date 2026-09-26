import re

from app.schemas.resume import (
    CustomSection,
    CustomSectionItem,
    EducationItem,
    ExperienceItem,
    LanguageItem,
    ProjectItem,
    ResumeDocument,
    SkillGroup,
)


class MarkdownParser:
    @staticmethod
    def parse(text: str) -> tuple[ResumeDocument, list[str], list[str]]:
        warnings: list[str] = []
        errors: list[str] = []

        doc = ResumeDocument()
        lines = [line.rstrip() for line in text.splitlines()]

        current_section = "header"
        current_custom_section: CustomSection | None = None
        current_custom_item: CustomSectionItem | None = None
        current_exp: ExperienceItem | None = None
        current_edu: EducationItem | None = None
        current_proj: ProjectItem | None = None

        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # Check for H1 Header: Person's Name
            if line.startswith("# ") and current_section == "header":
                name_parts = line[2:].strip().split(" ", 1)
                doc.profile.firstName = name_parts[0]
                if len(name_parts) > 1:
                    doc.profile.lastName = name_parts[1]
                i += 1
                # Next non-empty line might be professional title
                if i < len(lines) and not lines[i].startswith("#") and lines[i].strip():
                    doc.profile.headline = lines[i].strip()
                    doc.metadata.targetRole = lines[i].strip()
                    i += 1
                continue

            # Check for H2 Section Headings
            if line.startswith("## "):
                raw_heading = line[3:].strip()
                normalized = raw_heading.lower()

                # Flush any active items
                if current_exp:
                    doc.experience.append(current_exp)
                    current_exp = None
                if current_edu:
                    doc.education.append(current_edu)
                    current_edu = None
                if current_proj:
                    doc.projects.append(current_proj)
                    current_proj = None
                if current_custom_section and current_custom_item:
                    current_custom_section.items.append(current_custom_item)
                    current_custom_item = None
                if current_custom_section:
                    doc.customSections.append(current_custom_section)
                    current_custom_section = None

                if any(k in normalized for k in ["contact", "personal"]):
                    current_section = "contact"
                elif any(k in normalized for k in ["summary", "about", "profile", "overview"]):
                    current_section = "summary"
                elif any(
                    k in normalized for k in ["experience", "employment", "work history", "career"]
                ):
                    current_section = "experience"
                elif any(k in normalized for k in ["education", "academic", "university"]):
                    current_section = "education"
                elif any(k in normalized for k in ["project", "portfolio"]):
                    current_section = "projects"
                elif any(
                    k in normalized for k in ["skill", "competenc", "proficienc", "technolog"]
                ):
                    current_section = "skills"
                elif any(k in normalized for k in ["certificat", "license"]):
                    current_section = "certifications"
                elif any(k in normalized for k in ["language"]):
                    current_section = "languages"
                else:
                    current_section = "custom"
                    current_custom_section = CustomSection(title=raw_heading)
                    warnings.append(
                        f"Unrecognized heading '{raw_heading}' preserved as Custom Section."
                    )

                i += 1
                continue

            # Check for H3 Subsection Headings
            if line.startswith("### "):
                subheading = line[4:].strip()

                if current_section == "experience":
                    if current_exp:
                        doc.experience.append(current_exp)
                    # Example: "Staff Product Designer — Linear" or "Software Engineer at Google"
                    parts = re.split(r"\s+[—–\-|at]\s+", subheading, maxsplit=1)
                    pos = parts[0].strip()
                    comp = parts[1].strip() if len(parts) > 1 else ""
                    current_exp = ExperienceItem(position=pos, company=comp)
                    i += 1
                    continue

                elif current_section == "education":
                    if current_edu:
                        doc.education.append(current_edu)
                    parts = re.split(r"\s+[—–\-|at]\s+", subheading, maxsplit=1)
                    deg = parts[0].strip()
                    inst = parts[1].strip() if len(parts) > 1 else ""
                    current_edu = EducationItem(degree=deg, institution=inst)
                    i += 1
                    continue

                elif current_section == "projects":
                    if current_proj:
                        doc.projects.append(current_proj)
                    current_proj = ProjectItem(name=subheading)
                    i += 1
                    continue

                elif current_section == "custom" and current_custom_section:
                    if current_custom_item:
                        current_custom_section.items.append(current_custom_item)
                    current_custom_item = CustomSectionItem(title=subheading)
                    i += 1
                    continue

            # Parse lines based on current active section
            if current_section == "contact":
                # Detect emails, phones, URLs
                if "@" in line and not doc.profile.email:
                    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", line)
                    if email_match:
                        doc.profile.email = email_match.group(0)
                if re.search(r"\+?\d[\d\s\-\(\)]{7,}\d", line) and not doc.profile.phone:
                    phone_match = re.search(r"\+?\d[\d\s\-\(\)]{7,}\d", line)
                    if phone_match:
                        doc.profile.phone = phone_match.group(0).strip()
                if "linkedin.com" in line.lower():
                    doc.profile.linkedin = line.strip(" -•*")
                elif "github.com" in line.lower():
                    doc.profile.github = line.strip(" -•*")
                elif any(
                    loc_hint in line.lower()
                    for loc_hint in [
                        ", ca",
                        ", ny",
                        ", tx",
                        "remote",
                        "san francisco",
                        "london",
                        "berlin",
                        "turkey",
                    ]
                ):
                    doc.profile.location = line.strip(" -•*")

            elif current_section == "summary":
                if doc.summary:
                    doc.summary += " " + line
                else:
                    doc.summary = line

            elif current_section == "experience":
                if current_exp is None:
                    current_exp = ExperienceItem(position=line)
                elif line.startswith(("- ", "* ", "• ")):
                    bullet = line[2:].strip()
                    current_exp.bullets.append(bullet)
                elif re.search(r"\d{4}", line) and not current_exp.startDate:
                    # Date line, e.g. "2022 — Present" or "Jan 2020 - Dec 2022"
                    date_parts = re.split(r"\s+[—–\-to]+\s+", line, maxsplit=1)
                    current_exp.startDate = date_parts[0].strip()
                    if len(date_parts) > 1:
                        current_exp.endDate = date_parts[1].strip()
                        if "present" in date_parts[1].lower():
                            current_exp.current = True
                else:
                    if current_exp.summary:
                        current_exp.summary += " " + line
                    else:
                        current_exp.summary = line

            elif current_section == "education":
                if current_edu is None:
                    current_edu = EducationItem(institution=line)
                elif line.startswith(("- ", "* ", "• ")):
                    current_edu.highlights.append(line[2:].strip())
                elif re.search(r"\d{4}", line) and not current_edu.startDate:
                    date_parts = re.split(r"\s+[—–\-to]+\s+", line, maxsplit=1)
                    current_edu.startDate = date_parts[0].strip()
                    if len(date_parts) > 1:
                        current_edu.endDate = date_parts[1].strip()

            elif current_section == "projects":
                if current_proj is None:
                    current_proj = ProjectItem(name=line)
                elif line.startswith(("- ", "* ", "• ")):
                    current_proj.bullets.append(line[2:].strip())
                elif line.startswith("http") or "github.com" in line:
                    current_proj.url = line

            elif current_section == "skills":
                # Can be comma-separated list or bullet points or "Category: skill1, skill2"
                if ":" in line and not line.startswith(("-", "*", "•")):
                    cat, items = line.split(":", 1)
                    skills_list = [s.strip() for s in items.split(",") if s.strip()]
                    doc.skills.append(SkillGroup(category=cat.strip(), skills=skills_list))
                elif line.startswith(("- ", "* ", "• ")):
                    item = line[2:].strip()
                    if ":" in item:
                        cat, items = item.split(":", 1)
                        skills_list = [s.strip() for s in items.split(",") if s.strip()]
                        doc.skills.append(SkillGroup(category=cat.strip(), skills=skills_list))
                    else:
                        if not doc.skills:
                            doc.skills.append(SkillGroup(category="General Skills", skills=[]))
                        doc.skills[0].skills.append(item)
                else:
                    skills_list = [s.strip() for s in line.split(",") if s.strip()]
                    if skills_list:
                        if not doc.skills:
                            doc.skills.append(SkillGroup(category="General Skills", skills=[]))
                        doc.skills[0].skills.extend(skills_list)

            elif current_section == "languages":
                if line.startswith(("- ", "* ", "• ")):
                    line = line[2:].strip()
                parts = line.split("—") if "—" in line else line.split("-")
                lang = parts[0].strip()
                prof = parts[1].strip() if len(parts) > 1 else "Proficient"
                doc.languages.append(LanguageItem(language=lang, proficiency=prof))

            elif current_section == "custom" and current_custom_section:
                if current_custom_item:
                    if line.startswith(("- ", "* ", "• ")):
                        current_custom_item.bullets.append(line[2:].strip())
                    else:
                        current_custom_item.description += (
                            (" " + line) if current_custom_item.description else line
                        )
                else:
                    current_custom_item = CustomSectionItem(title=line)

            i += 1

        # Flush final items
        if current_exp:
            doc.experience.append(current_exp)
        if current_edu:
            doc.education.append(current_edu)
        if current_proj:
            doc.projects.append(current_proj)
        if current_custom_section and current_custom_item:
            current_custom_section.items.append(current_custom_item)
        if current_custom_section:
            doc.customSections.append(current_custom_section)

        # Set title if empty
        if not doc.metadata.title or doc.metadata.title == "Untitled Resume":
            full_name = f"{doc.profile.firstName} {doc.profile.lastName}".strip()
            if full_name:
                doc.metadata.title = f"{full_name} Resume"

        return doc, warnings, errors
