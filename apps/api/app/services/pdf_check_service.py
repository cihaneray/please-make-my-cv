import html
import io
import re

from pypdf import PdfReader

from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.pdf_exporter import render_pdf
from app.schemas.analysis import PdfCheckIssue, PdfCheckReport
from app.schemas.resume import ResumeDocument


def check_pdf(document: ResumeDocument) -> PdfCheckReport:
    """Check the actual rendered PDF, rather than estimating page counts from text."""
    layout_checks = []
    reader = PdfReader(io.BytesIO(render_pdf(document, layout_checks)))
    issues = []
    headings = {
        html.unescape(re.sub("<[^>]+>", "", value)).strip().casefold()
        for value in re.findall(r"<h2[^>]*>(.*?)</h2>", HtmlPdfExporter.render_html(document), re.S)
    }
    for number, page in enumerate(reader.pages, 1):
        lines = [line.strip() for line in (page.extract_text() or "").splitlines() if line.strip()]
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
        if lines and lines[-1].casefold() in headings:
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
    font = re.search(r"[\d.]+", document.design.fontSize)
    if layout_checks:
        issues.append(
            PdfCheckIssue(
                code="horizontal-overflow",
                message="Content extends beyond the A4 layout. Inspect the exact PDF pages.",
            )
        )
    if font and float(font.group()) < 9:
        issues.append(
            PdfCheckIssue(
                code="small-font", message="Body font is below 9 pt and may be difficult to read."
            )
        )
    return PdfCheckReport(pageCount=len(reader.pages), issues=issues)
