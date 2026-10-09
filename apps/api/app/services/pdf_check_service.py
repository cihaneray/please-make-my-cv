import html
import io
import re
import unicodedata
from urllib.parse import urlsplit

from pypdf import PdfReader

from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.pdf_exporter import render_pdf
from app.schemas.analysis import PdfCheckIssue, PdfCheckReport
from app.schemas.resume import ResumeDocument


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", html.unescape(value)).casefold()
    value = "".join(char for char in value if not unicodedata.combining(char))
    return " ".join(re.findall(r"\w+", value))


def _expected_text(document: ResumeDocument) -> list[tuple[str, str]]:
    """Visible content to verify in the bytes of the rendered PDF."""
    expected: list[tuple[str, str]] = []

    def add(kind: str, value: str) -> None:
        if value and len(_normalize(value)) >= 3:
            expected.append((kind, value))

    profile = document.profile
    add("contact", f"{profile.firstName} {profile.lastName}".strip())
    for value in (profile.email, profile.phone, profile.location):
        add("contact", value)
    for value in (profile.website, profile.linkedin, profile.github):
        if value:
            parsed = urlsplit(value if "://" in value else f"https://{value}")
            add("contact", f"{parsed.netloc}{parsed.path}".removeprefix("www.").rstrip("/"))
    for link in profile.links:
        if link.label:
            add("contact", link.label)
        elif link.url:
            parsed = urlsplit(link.url if "://" in link.url else f"https://{link.url}")
            add("contact", f"{parsed.netloc}{parsed.path}".removeprefix("www.").rstrip("/"))
    add("content", profile.headline)
    if document.visibility.showSummary:
        add("content", document.summary)
    if document.visibility.showExperience:
        for item in document.experience:
            for value in (
                item.company,
                item.position,
                item.location,
                item.summary,
                *item.bullets,
                *item.technologies,
            ):
                add("content", value)
    if document.visibility.showEducation:
        for item in document.education:
            for value in (
                item.institution,
                item.degree,
                item.fieldOfStudy,
                item.location,
                item.grade,
                *item.highlights,
            ):
                add("content", value)
    if document.visibility.showProjects:
        for item in document.projects:
            for value in (item.name, item.role, *item.bullets, *item.technologies):
                add("content", value)
    if document.visibility.showSkills:
        for group in document.skills:
            for value in (group.category, *group.skills):
                add("content", value)
    if document.visibility.showCertifications:
        for item in document.certifications:
            for value in (item.name, item.issuer, item.credentialId):
                add("content", value)
    if document.visibility.showLanguages:
        for item in document.languages:
            for value in (item.language, item.proficiency):
                add("content", value)
    for section in document.customSections:
        add("content", section.title)
        for item in section.items:
            for value in (item.title, item.subtitle, item.description, *item.bullets):
                add("content", value)
    return expected


def _is_present(value: str, extracted: str) -> bool:
    normalized = _normalize(value)
    if normalized in extracted:
        return True
    # Browser line wrapping can interrupt long prose in extraction.
    words = normalized.split()
    return (
        len(words) >= 10 and " ".join(words[:5]) in extracted and " ".join(words[-5:]) in extracted
    )


def check_pdf(document: ResumeDocument) -> PdfCheckReport:
    """Inspect PDF bytes and compare visible source content to extracted text."""
    layout_checks: list[str] = []
    reader = PdfReader(io.BytesIO(render_pdf(document, layout_checks)))
    issues: list[PdfCheckIssue] = []
    page_texts = [page.extract_text() or "" for page in reader.pages]
    extracted = _normalize("\n".join(page_texts))
    headings = [
        html.unescape(re.sub("<[^>]+>", "", value)).strip()
        for value in re.findall(r"<h2[^>]*>(.*?)</h2>", HtmlPdfExporter.render_html(document), re.S)
    ]
    normalized_headings = {_normalize(heading) for heading in headings}
    for number, text in enumerate(page_texts, 1):
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            issues.append(
                PdfCheckIssue(
                    code="empty-page", page=number, message="Page contains no extractable text."
                )
            )
        if number == len(reader.pages) and number > 1 and sum(map(len, lines)) < 120:
            issues.append(
                PdfCheckIssue(
                    code="sparse-last-page",
                    page=number,
                    message="Last page has very little content; consider spacing or margin changes.",
                )
            )
        if lines and _normalize(lines[-1]) in normalized_headings:
            issues.append(
                PdfCheckIssue(
                    code="orphan-heading",
                    page=number,
                    message="A section heading appears at the end of the page.",
                )
            )
    if len(reader.pages) > 2:
        issues.append(
            PdfCheckIssue(
                code="long-document",
                message="Document exceeds two pages. Check whether every section is needed.",
            )
        )
    if layout_checks:
        issues.append(
            PdfCheckIssue(
                code="horizontal-overflow",
                message="Content extends beyond the A4 layout. Inspect the exact PDF pages.",
            )
        )
    font = re.search(r"[\d.]+", document.design.fontSize)
    if font and float(font.group()) < 9:
        issues.append(
            PdfCheckIssue(
                code="small-font", message="Body font is below 9 pt and may be difficult to read."
            )
        )

    seen: set[str] = set()
    for kind, value in _expected_text(document):
        key = _normalize(value)
        if key in seen or _is_present(value, extracted):
            continue
        seen.add(key)
        label = "contact detail" if kind == "contact" else "content"
        issues.append(
            PdfCheckIssue(
                code=f"missing-{kind}",
                message=f"Expected {label} was not found in extracted PDF text: {value[:80]}",
            )
        )
        if len(seen) >= 20:
            break

    # Multi-column templates can change same-page text order. Only flag a
    # heading inversion if whole pages show the headings in reverse order.
    heading_pages: list[int] = []
    for heading in headings:
        found = next(
            (
                index
                for index, text in enumerate(page_texts)
                if _normalize(heading) in _normalize(text)
            ),
            None,
        )
        if found is not None:
            heading_pages.append(found)
    if any(later < earlier for earlier, later in zip(heading_pages, heading_pages[1:])):
        issues.append(
            PdfCheckIssue(
                code="text-order",
                message="Section headings appear out of order across PDF pages; inspect reading order.",
            )
        )
    return PdfCheckReport(pageCount=len(reader.pages), issues=issues)
