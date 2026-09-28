import logging

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from app.core.config import settings
from app.core.exceptions import AppException
from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.schemas.resume import ResumeDocument

logger = logging.getLogger(__name__)


def launch_browser(playwright):
    if settings.pdf_browser_executable:
        candidates = [{"executable_path": settings.pdf_browser_executable}]
    elif settings.pdf_browser_channel:
        candidates = [{"channel": settings.pdf_browser_channel}]
    else:
        # Installed stable browsers also work when Playwright's cache is unavailable.
        candidates = [{}, {"channel": "msedge"}, {"channel": "chrome"}]
    for options in candidates:
        try:
            return playwright.chromium.launch(**options, timeout=15000)
        except PlaywrightError:
            continue
    raise AppException(
        "PDF_BROWSER_UNAVAILABLE",
        "No PDF browser could start. From apps/api run: uv run playwright install chromium. "
        "Alternatively set PDF_BROWSER_CHANNEL=msedge or chrome, or PDF_BROWSER_EXECUTABLE to an installed browser. "
        "Restart the API after changing configuration. Linux may need: uv run playwright install --with-deps chromium.",
        503,
    )


def render_pdf(doc: ResumeDocument) -> bytes:
    try:
        with sync_playwright() as playwright:
            browser = launch_browser(playwright)
            try:
                page = browser.new_page(java_script_enabled=False)
                page.set_default_timeout(15000)
                page.route("**/*", lambda route: route.abort())
                page.set_content(HtmlPdfExporter.render_html(doc), wait_until="load")
                return page.pdf(format="A4", print_background=True, prefer_css_page_size=True)
            finally:
                browser.close()
    except AppException:
        raise
    except PlaywrightError as exc:
        logger.warning("PDF rendering failed (%s)", type(exc).__name__)
        raise AppException(
            "PDF_RENDER_FAILED",
            "The browser started but PDF rendering failed. Retry the export and check the API logs.",
            503,
        ) from exc
