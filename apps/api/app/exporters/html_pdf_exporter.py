import html

from app.schemas.resume import ResumeDocument


class HtmlPdfExporter:
    @staticmethod
    def render_html(doc: ResumeDocument) -> str:
        """Renders an A4 print-optimized HTML document with full CSS styling matching the Calm Editorial design system."""
        full_name = html.escape(
            f"{doc.profile.firstName} {doc.profile.lastName}".strip() or "Curriculum Vitae"
        )
        headline = html.escape(doc.profile.headline)
        location = html.escape(doc.profile.location)

        # Contact items
        contacts: list[str] = []
        if doc.profile.email:
            e = html.escape(doc.profile.email)
            contacts.append(f'<a href="mailto:{e}">{e}</a>')
        if doc.profile.phone:
            p = html.escape(doc.profile.phone)
            contacts.append(f"<span>{p}</span>")
        if doc.profile.location:
            contacts.append(f"<span>{location}</span>")
        if doc.profile.website:
            w = html.escape(doc.profile.website)
            contacts.append(f'<a href="https://{w}" target="_blank">{w}</a>')
        if doc.profile.linkedin:
            li = html.escape(doc.profile.linkedin)
            contacts.append(f'<a href="https://{li}" target="_blank">{li}</a>')
        if doc.profile.github:
            gh = html.escape(doc.profile.github)
            contacts.append(f'<a href="https://{gh}" target="_blank">{gh}</a>')

        contacts_html = " &nbsp;/&nbsp; ".join(contacts)

        # Summary
        summary_html = ""
        if doc.summary and doc.visibility.showSummary:
            summary_html = f"""
            <section class="section">
                <h2 class="section-title">Summary</h2>
                <p class="summary-text">{html.escape(doc.summary)}</p>
            </section>
            """

        # Experience
        exp_html = ""
        if doc.experience and doc.visibility.showExperience:
            items_list: list[str] = []
            for exp in doc.experience:
                pos = html.escape(exp.position)
                comp = html.escape(exp.company)
                dates = html.escape(
                    f"{exp.startDate} — {'Present' if exp.current else exp.endDate}"
                )
                loc = html.escape(exp.location)
                bullets = "".join(f"<li>{html.escape(b)}</li>" for b in exp.bullets)
                techs = (
                    f'<div class="technologies"><strong>Technologies:</strong> {html.escape(", ".join(exp.technologies))}</div>'
                    if exp.technologies
                    else ""
                )

                items_list.append(f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{pos}</span>
                        <span class="entry-dates">{dates}</span>
                    </div>
                    <div class="entry-subtitle">{comp}{f" • {loc}" if loc else ""}</div>
                    {f'<ul class="bullets">{bullets}</ul>' if bullets else ""}
                    {techs}
                </div>
                """)
            exp_html = f"""
            <section class="section">
                <h2 class="section-title">Experience</h2>
                {"".join(items_list)}
            </section>
            """

        # Education
        edu_html = ""
        if doc.education and doc.visibility.showEducation:
            items_list = []
            for edu in doc.education:
                deg = html.escape(
                    f"{edu.degree}{' in ' + edu.fieldOfStudy if edu.fieldOfStudy else ''}"
                )
                inst = html.escape(edu.institution)
                dates = html.escape(
                    f"{edu.startDate} — {'Present' if edu.current else edu.endDate}"
                )
                highlights = "".join(f"<li>{html.escape(h)}</li>" for h in edu.highlights)

                items_list.append(f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{deg}</span>
                        <span class="entry-dates">{dates}</span>
                    </div>
                    <div class="entry-subtitle">{inst}</div>
                    {f'<ul class="bullets">{highlights}</ul>' if highlights else ""}
                </div>
                """)
            edu_html = f"""
            <section class="section">
                <h2 class="section-title">Education</h2>
                {"".join(items_list)}
            </section>
            """

        # Projects
        proj_html = ""
        if doc.projects and doc.visibility.showProjects:
            items_list = []
            for p in doc.projects:
                name = html.escape(p.name)
                role = html.escape(p.role)
                url_str = (
                    f'<a href="{html.escape(p.url)}" target="_blank" class="entry-url">{html.escape(p.url)}</a>'
                    if p.url
                    else ""
                )
                bullets = "".join(f"<li>{html.escape(b)}</li>" for b in p.bullets)
                techs = (
                    f'<div class="technologies"><strong>Technologies:</strong> {html.escape(", ".join(p.technologies))}</div>'
                    if p.technologies
                    else ""
                )

                items_list.append(f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{name}</span>
                        {f'<span class="entry-role">{role}</span>' if role else ""}
                    </div>
                    {url_str}
                    {f'<ul class="bullets">{bullets}</ul>' if bullets else ""}
                    {techs}
                </div>
                """)
            proj_html = f"""
            <section class="section">
                <h2 class="section-title">Projects</h2>
                {"".join(items_list)}
            </section>
            """

        # Skills
        skills_html = ""
        if doc.skills and doc.visibility.showSkills:
            skill_badges: list[str] = []
            for g in doc.skills:
                cat = html.escape(g.category)
                sk = ", ".join(html.escape(s) for s in g.skills)
                skill_badges.append(
                    f'<div class="skill-row"><span class="skill-category">{cat}:</span> <span>{sk}</span></div>'
                )
            skills_html = f"""
            <section class="section">
                <h2 class="section-title">Skills &amp; Competencies</h2>
                <div class="skills-container">{"".join(skill_badges)}</div>
            </section>
            """

        # Template theme styling
        font_family = doc.design.fontFamily or "Inter, system-ui, -apple-system, sans-serif"
        accent_color = doc.design.accentColor or "#0F172A"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{full_name} — CV</title>
<style>
  @page {{
    size: A4;
    margin: 16mm 18mm 16mm 18mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: {font_family};
    font-size: 9.5pt;
    line-height: 1.45;
    color: #18181B;
    background-color: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .cv-page {{
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }}
  header {{
    border-bottom: 1.5px solid #E4E5E9;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }}
  h1.name {{
    font-size: 18pt;
    font-weight: 700;
    color: {accent_color};
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 3px;
  }}
  .headline {{
    font-size: 11pt;
    font-weight: 500;
    color: #45464D;
    margin-bottom: 6px;
  }}
  .contacts {{
    font-size: 8.5pt;
    color: #71717A;
  }}
  .contacts a {{
    color: #71717A;
    text-decoration: none;
  }}
  .section {{
    margin-bottom: 13px;
  }}
  .section-title {{
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: {accent_color};
    border-bottom: 1px solid #EEEEF2;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }}
  .summary-text {{
    font-size: 9pt;
    line-height: 1.5;
    color: #27272A;
  }}
  .entry {{
    margin-bottom: 9px;
    page-break-inside: avoid;
  }}
  .entry-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }}
  .entry-title {{
    font-size: 9.5pt;
    font-weight: 600;
    color: #18181B;
  }}
  .entry-dates {{
    font-size: 8pt;
    color: #71717A;
    font-weight: 500;
  }}
  .entry-subtitle {{
    font-size: 8.5pt;
    color: #52525B;
    margin-bottom: 3px;
  }}
  .entry-url {{
    display: inline-block;
    font-size: 8pt;
    color: #52525B;
    margin-bottom: 2px;
  }}
  ul.bullets {{
    margin-top: 3px;
    padding-left: 14px;
    list-style-type: disc;
  }}
  ul.bullets li {{
    font-size: 8.8pt;
    line-height: 1.4;
    color: #27272A;
    margin-bottom: 2.5px;
  }}
  .technologies {{
    font-size: 8pt;
    color: #52525B;
    margin-top: 3px;
  }}
  .skill-row {{
    font-size: 8.5pt;
    margin-bottom: 3px;
  }}
  .skill-category {{
    font-weight: 600;
    color: #18181B;
  }}
</style>
</head>
<body>
  <div class="cv-page">
    <header>
      <h1 class="name">{full_name}</h1>
      {f'<div class="headline">{headline}</div>' if headline else ""}
      <div class="contacts">{contacts_html}</div>
    </header>
    {summary_html}
    {exp_html}
    {edu_html}
    {proj_html}
    {skills_html}
  </div>
</body>
</html>
"""
