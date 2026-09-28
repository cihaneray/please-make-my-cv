import html
import re

from app.schemas.resume import ResumeDocument

TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _format_date(date_str: str | None, is_tr: bool) -> str:
    if not date_str or not date_str.strip():
        return ""
    val = date_str.strip()
    lower = val.lower()
    if lower in ["present", "current", "now", "devam ediyor", "günümüz", "gunumuz", "halen"]:
        return "Devam Ediyor" if is_tr else "Present"

    # YYYY-MM
    m = re.match(r"^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$", val)
    if m:
        year, month_idx = m.group(1), int(m.group(2)) - 1
        if 0 <= month_idx < 12:
            month_label = TR_MONTHS[month_idx] if is_tr else EN_MONTHS[month_idx]
            return f"{month_label} {year}"
        return year

    return val


def _format_date_range(start: str | None, end: str | None, current: bool, is_tr: bool) -> str:
    start_fmt = _format_date(start, is_tr)
    end_fmt = ("Devam Ediyor" if is_tr else "Present") if current else _format_date(end, is_tr)
    if start_fmt and end_fmt:
        return f"{start_fmt} — {end_fmt}"
    return start_fmt or end_fmt or ""


def _normalize_url(url: str | None) -> str:
    if not url:
        return ""
    u = url.strip()
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return f"https://{u}"


def _display_url(url: str | None) -> str:
    if not url:
        return ""
    return re.sub(r"^https?://(www\.)?", "", url.strip()).rstrip("/")


class HtmlPdfExporter:
    @staticmethod
    def render_html(doc: ResumeDocument) -> str:
        """Renders an A4 print-optimized HTML document with CSS styling matching the chosen template."""
        template_id = (doc.design.template or doc.metadata.templateId or "minimal").lower().strip()
        if template_id not in ["minimal", "technical", "professional"]:
            template_id = "minimal"

        is_tr = (doc.metadata.language or "en").lower() == "tr"
        font_family = doc.design.fontFamily or (
            "Georgia, serif"
            if template_id == "professional"
            else "Inter, -apple-system, sans-serif"
        )
        accent_color = doc.design.accentColor or (
            "#1E293B"
            if template_id == "professional"
            else ("#131B2E" if template_id == "technical" else "#0F172A")
        )

        fonts = {
            "Inter": "Arial, sans-serif",
            "Arial": "Arial, sans-serif",
            "Helvetica Neue": "Arial, sans-serif",
            "Georgia": "Georgia, serif",
            "Menlo": "monospace",
        }
        font_family = fonts.get(font_family, "Arial, sans-serif")
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", accent_color):
            accent_color = "#0F172A"
        font_size = (
            doc.design.fontSize
            if re.fullmatch(r"(?:[8-9]|1[0-4])(?:\.5)?pt", doc.design.fontSize)
            else "10pt"
        )
        font_scale = float(font_size.removesuffix("pt")) / 10
        page_margin = {"compact": "10mm", "normal": "15mm 18mm", "spacious": "20mm"}.get(
            doc.design.margins, "15mm 18mm"
        )
        section_gap = {"compact": "10px", "normal": "14px", "relaxed": "18px"}.get(
            doc.design.spacing, "14px"
        )
        full_name = html.escape(
            f"{doc.profile.firstName} {doc.profile.lastName}".strip()
            or ("Ad Soyad" if is_tr else "Curriculum Vitae")
        )
        headline = html.escape(doc.profile.headline)

        # Titles
        titles = {
            "summary": "ÖZET & ODAK ALANLARI"
            if (is_tr and template_id == "technical")
            else (
                "ÖZET"
                if is_tr
                else ("TECHNICAL SUMMARY" if template_id == "technical" else "SUMMARY")
            ),
            "experience": "İŞ DENEYİMİ & KARİYER GEÇMİŞİ"
            if (is_tr and template_id == "professional")
            else (
                "İŞ DENEYİMİ"
                if is_tr
                else ("PROFESSIONAL EXPERIENCE" if template_id == "professional" else "EXPERIENCE")
            ),
            "education": "EĞİTİM" if is_tr else "EDUCATION",
            "projects": "TEKNİK PROJELER & AÇIK KAYNAK"
            if (is_tr and template_id == "technical")
            else (
                "PROJELER"
                if is_tr
                else ("TECHNICAL PROJECTS" if template_id == "technical" else "PROJECTS")
            ),
            "skills": "TEKNİK YETKİNLİKLER"
            if (is_tr and template_id == "technical")
            else (
                "YETKİNLİKLER"
                if is_tr
                else ("TECHNICAL SKILLS" if template_id == "technical" else "SKILLS & COMPETENCIES")
            ),
            "certifications": "SERTİFİKALAR & LİSANSLAR" if is_tr else "CERTIFICATIONS",
            "languages": "YABANCI DİLLER" if is_tr else "LANGUAGES",
            "technologies": "Teknolojiler" if is_tr else "Technologies",
        }

        # Contact items
        contacts: list[str] = []
        if doc.profile.email:
            e = html.escape(doc.profile.email)
            contacts.append(f'<a href="mailto:{e}">{e}</a>')
        if doc.profile.phone:
            p = html.escape(doc.profile.phone)
            contacts.append(f'<a href="tel:{p}">{p}</a>')
        if doc.profile.location:
            contacts.append(f"<span>{html.escape(doc.profile.location)}</span>")
        if doc.profile.website:
            w_disp = html.escape(_display_url(doc.profile.website))
            w_url = html.escape(_normalize_url(doc.profile.website))
            contacts.append(f'<a href="{w_url}" target="_blank">{w_disp}</a>')
        if doc.profile.linkedin:
            li_disp = html.escape(_display_url(doc.profile.linkedin))
            li_url = html.escape(_normalize_url(doc.profile.linkedin))
            contacts.append(f'<a href="{li_url}" target="_blank">{li_disp}</a>')
        if doc.profile.github:
            gh_disp = html.escape(_display_url(doc.profile.github))
            gh_url = html.escape(_normalize_url(doc.profile.github))
            contacts.append(f'<a href="{gh_url}" target="_blank">{gh_disp}</a>')
        if doc.profile.links:
            for link_item in doc.profile.links:
                if link_item.url:
                    l_lbl = html.escape(link_item.label or _display_url(link_item.url))
                    l_url = html.escape(_normalize_url(link_item.url))
                    contacts.append(f'<a href="{l_url}" target="_blank">{l_lbl}</a>')

        separator = (
            " &nbsp;|&nbsp; " if template_id in ["technical", "professional"] else " &nbsp;·&nbsp; "
        )
        contacts_html = separator.join(contacts)

        # Summary
        summary_html = ""
        if doc.summary and doc.visibility.showSummary:
            summary_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["summary"]}</h2>
                <p class="summary-text">{html.escape(doc.summary)}</p>
            </section>
            """

        # Experience
        exp_html = ""
        if doc.experience and doc.visibility.showExperience:
            exp_items: list[str] = []
            for exp in doc.experience:
                pos = html.escape(exp.position)
                comp = html.escape(exp.company)
                dates = html.escape(
                    _format_date_range(exp.startDate, exp.endDate, exp.current, is_tr)
                )
                loc = html.escape(exp.location)
                bullets = "".join(f"<li>{html.escape(b)}</li>" for b in exp.bullets)
                techs = (
                    f'<div class="technologies"><strong>{titles["technologies"]}:</strong> {html.escape(", ".join(exp.technologies))}</div>'
                    if exp.technologies
                    else ""
                )

                if template_id == "professional":
                    header_line = f"""
                    <div class="entry-header">
                        <span class="entry-title">{comp}{f" — {loc}" if loc else ""}</span>
                        <span class="entry-dates">{dates}</span>
                    </div>
                    <div class="entry-subtitle italic">{pos}</div>
                    """
                else:
                    header_line = f"""
                    <div class="entry-header">
                        <span class="entry-title">{pos}{f" — {comp}" if comp else ""}</span>
                        <span class="entry-dates">{dates}{f" · {loc}" if loc else ""}</span>
                    </div>
                    """

                exp_items.append(f"""
                <div class="entry">
                    {header_line}
                    {f'<p class="entry-desc">{html.escape(exp.summary)}</p>' if exp.summary else ""}
                    {f'<ul class="bullets">{bullets}</ul>' if bullets else ""}
                    {techs}
                </div>
                """)
            exp_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["experience"]}</h2>
                {"".join(exp_items)}
            </section>
            """

        # Education
        edu_html = ""
        if doc.education and doc.visibility.showEducation:
            edu_items = []
            for edu in doc.education:
                deg = html.escape(
                    f"{edu.degree}{' in ' + edu.fieldOfStudy if edu.fieldOfStudy else ''}"
                )
                inst = html.escape(edu.institution)
                dates = html.escape(
                    _format_date_range(edu.startDate, edu.endDate, edu.current, is_tr)
                )
                loc = html.escape(edu.location)
                if edu.grade:
                    deg += f" ({html.escape(edu.grade)})"
                highlights = "".join(f"<li>{html.escape(h)}</li>" for h in edu.highlights)

                if template_id == "professional":
                    edu_items.append(f"""
                    <div class="entry">
                        <div class="entry-header">
                            <span class="entry-title">{inst}{f" — {loc}" if loc else ""}</span>
                            <span class="entry-dates">{dates}</span>
                        </div>
                        <div class="entry-subtitle italic">{deg}</div>
                        {f'<ul class="bullets">{highlights}</ul>' if highlights else ""}
                    </div>
                    """)
                else:
                    edu_items.append(f"""
                    <div class="entry">
                        <div class="entry-header">
                            <span class="entry-title">{deg}{f" — {inst}" if inst else ""}</span>
                            <span class="entry-dates">{dates}{f" · {loc}" if loc else ""}</span>
                        </div>
                        {f'<ul class="bullets">{highlights}</ul>' if highlights else ""}
                    </div>
                    """)
            edu_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["education"]}</h2>
                {"".join(edu_items)}
            </section>
            """

        # Projects
        proj_html = ""
        if doc.projects and doc.visibility.showProjects:
            proj_items = []
            for p in doc.projects:
                name = html.escape(p.name)
                role = html.escape(p.role)
                url_str = (
                    f'<a href="{html.escape(_normalize_url(p.url))}" target="_blank" class="entry-url">{html.escape(_display_url(p.url))}</a>'
                    if p.url
                    else ""
                )
                bullets = "".join(f"<li>{html.escape(b)}</li>" for b in p.bullets)
                techs = (
                    f'<div class="technologies"><strong>{titles["technologies"]}:</strong> {html.escape(", ".join(p.technologies))}</div>'
                    if p.technologies
                    else ""
                )

                proj_items.append(f"""
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">{name}{f" ({role})" if role else ""}</span>
                        {url_str}
                        <span class="entry-dates">{html.escape(_format_date_range(p.startDate, p.endDate, False, is_tr))}</span>
                    </div>
                    {f'<ul class="bullets">{bullets}</ul>' if bullets else ""}
                    {techs}
                </div>
                """)
            proj_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["projects"]}</h2>
                {"".join(proj_items)}
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
                    f'<div class="skill-row"><span class="skill-category">{cat}:</span> <span class="skill-items">{sk}</span></div>'
                )
            skills_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["skills"]}</h2>
                <div class="skills-container">{"".join(skill_badges)}</div>
            </section>
            """

        # Certifications
        certs_html = ""
        if doc.certifications and doc.visibility.showCertifications:
            c_items = []
            for c in doc.certifications:
                date_fmt = html.escape(_format_date(c.issueDate, is_tr))
                c_items.append(f"""
                <div class="entry-header cert-row">
                    <span><strong>{html.escape(c.name)}</strong>{f" — {html.escape(c.issuer)}" if c.issuer else ""}</span>
                    <span class="entry-dates">{date_fmt}{(" - " + html.escape(_format_date(c.expiryDate, is_tr))) if c.expiryDate else ""}</span>
                    <span>{html.escape(c.credentialId)}</span>
                    {f'<a href="{html.escape(_normalize_url(c.credentialUrl))}">{html.escape(_display_url(c.credentialUrl))}</a>' if c.credentialUrl else ""}
                </div>
                """)
            certs_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["certifications"]}</h2>
                {"".join(c_items)}
            </section>
            """

        # Languages
        lang_html = ""
        if doc.languages and doc.visibility.showLanguages:
            l_items = [
                f"<span><strong>{html.escape(link_item.language)}</strong>{f' ({html.escape(link_item.proficiency)})' if link_item.proficiency else ''}</span>"
                for link_item in doc.languages
            ]
            lang_html = f"""
            <section class="section">
                <h2 class="section-title">{titles["languages"]}</h2>
                <div class="languages-row">{" &nbsp;·&nbsp; ".join(l_items)}</div>
            </section>
            """

        # Section Ordering based on template:
        # Technical puts skills before experience; minimal and professional put experience before skills
        if template_id == "technical":
            body_content = (
                f"{summary_html}{skills_html}{exp_html}{proj_html}{edu_html}{certs_html}{lang_html}"
            )
        else:
            body_content = (
                f"{summary_html}{exp_html}{edu_html}{proj_html}{skills_html}{certs_html}{lang_html}"
            )

        for section in doc.customSections:
            items = []
            for item in section.items:
                bullets = "".join(f"<li>{html.escape(b)}</li>" for b in item.bullets)
                items.append(
                    f'<div class="entry"><strong>{html.escape(item.title)}</strong><div>{html.escape(item.subtitle)} {html.escape(item.date)}</div><p>{html.escape(item.description)}</p><ul class="bullets">{bullets}</ul></div>'
                )
            body_content += f'<section class="section"><h2 class="section-title">{html.escape(section.title)}</h2>{"".join(items)}</section>'

        # CSS template variations
        header_align = "center" if template_id == "professional" else "left"
        header_border = (
            f"border-bottom: 2px solid {accent_color};"
            if template_id in ["technical", "professional"]
            else "border-bottom: 1px solid #E5E7EB;"
        )
        title_border = (
            f"border-bottom: 1.5px solid {accent_color};"
            if template_id == "professional"
            else (
                "border-bottom: 1.5px solid #CBD5E1;"
                if template_id == "technical"
                else "border-bottom: 1px solid #F3F4F6;"
            )
        )
        name_transform = "uppercase" if template_id in ["technical", "professional"] else "none"

        return f"""<!DOCTYPE html>
<html lang="{"tr" if is_tr else "en"}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<title>{full_name} — CV</title>
<style>
  @page {{
    size: A4;
    margin: {page_margin};
  }}
  * {{
    overflow-wrap: anywhere;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: {font_family};
    font-size: {font_size};
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
  @media screen {{
    html, body {{ width: 210mm; }}
    .cv-page {{
      width: 210mm;
      min-height: 297mm;
      padding: {page_margin};
    }}
  }}
  @media print {{
    .cv-page {{ max-width: none; padding: 0; }}
  }}
  header {{
    text-align: {header_align};
    {header_border}
    padding-bottom: 10px;
    margin-bottom: 14px;
  }}
  h1.name {{
    font-size: calc(20pt * {font_scale});
    font-weight: 700;
    color: {accent_color};
    text-transform: {name_transform};
    letter-spacing: -0.01em;
    line-height: 1.2;
    margin-bottom: 3px;
  }}
  .headline {{
    font-size: calc(10.5pt * {font_scale});
    font-weight: 500;
    color: #4B5563;
    margin-bottom: 6px;
  }}
  .contacts {{
    font-size: calc(8.5pt * {font_scale});
    color: #6B7280;
  }}
  .contacts a {{
    color: #4B5563;
    text-decoration: none;
  }}
  .contacts a:hover {{
    text-decoration: underline;
  }}
  .section {{
    margin-bottom: {section_gap};
  }}
  .section-title {{
    font-size: calc(8.5pt * {font_scale});
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: {accent_color};
    {title_border}
    padding-bottom: 3px;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
  }}
  .summary-text {{
    font-size: calc(9pt * {font_scale});
    line-height: 1.5;
    color: #374151;
  }}
  .entry {{
    margin-bottom: 9px;
    page-break-inside: avoid;
    break-inside: avoid;
  }}
  .entry-header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }}
  .entry-title {{
    font-size: {font_size};
    font-weight: 600;
    color: #111827;
  }}
  .entry-dates {{
    font-size: calc(8pt * {font_scale});
    color: #6B7280;
    font-weight: 500;
    white-space: normal;
  }}
  .entry-subtitle {{
    font-size: calc(8.5pt * {font_scale});
    color: #4B5563;
    margin-bottom: 2px;
  }}
  .entry-subtitle.italic {{
    font-style: italic;
  }}
  .entry-desc {{
    font-size: calc(8.5pt * {font_scale});
    color: #4B5563;
    margin-bottom: 3px;
  }}
  .entry-url {{
    font-size: calc(8pt * {font_scale});
    color: #6B7280;
    text-decoration: none;
  }}
  .entry-url:hover {{
    text-decoration: underline;
  }}
  ul.bullets {{
    margin-top: 3px;
    padding-left: 14px;
    list-style-type: disc;
  }}
  ul.bullets li {{
    font-size: calc(8.8pt * {font_scale});
    line-height: 1.4;
    color: #27272A;
    margin-bottom: 2px;
  }}
  .technologies {{
    font-size: calc(8pt * {font_scale});
    color: #4B5563;
    margin-top: 3px;
  }}
  .skill-row {{
    font-size: calc(8.5pt * {font_scale});
    margin-bottom: 3px;
  }}
  .skill-category {{
    font-weight: 600;
    color: #111827;
  }}
  .cert-row {{
    font-size: calc(8.5pt * {font_scale});
    margin-bottom: 3px;
  }}
  .languages-row {{
    font-size: calc(8.5pt * {font_scale});
    color: #374151;
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
    {body_content}
  </div>
</body>
</html>
"""
