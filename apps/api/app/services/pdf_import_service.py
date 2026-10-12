"""Bounded, local PDF extraction and transparent original-file checks."""

import multiprocessing
import re
import unicodedata
from io import BytesIO
from pathlib import PurePath
from threading import BoundedSemaphore

from pypdf import PdfReader

from app.core.config import settings
from app.core.exceptions import AppException
from app.schemas.analysis import PdfImportCheck, PdfImportReport
from app.schemas.resume import (
    CustomSection,
    CustomSectionItem,
    EducationItem,
    ExperienceItem,
    ProjectItem,
    ResumeDocument,
    SkillGroup,
)

HEADINGS = {
    "summary": {
        "summary",
        "professional summary",
        "technical summary",
        "ozet & odak alanlari",
        "profile",
        "about",
        "about me",
        "ozet",
        "hakkimda",
        "profil",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "work history",
        "is deneyimi & kariyer gecmisi",
        "is deneyimi",
        "deneyim",
        "deneyimler",
    },
    "education": {"education", "academic background", "egitim", "egitim bilgileri"},
    "skills": {
        "skills",
        "technical skills",
        "competencies",
        "skills & competencies",
        "yetkinlikler",
        "technologies",
        "beceriler",
        "yetenekler",
        "teknik beceriler",
        "teknik yetkinlikler",
    },
    "projects": {
        "projects",
        "selected projects",
        "projeler",
        "technical projects",
        "teknik projeler & acik kaynak",
    },
    "certifications": {
        "certifications",
        "certificates",
        "sertifikalar",
        "sertifikalar & lisanslar",
    },
    "languages": {"languages", "diller", "yabanci diller"},
    "contact": {"contact", "contact information", "iletisim", "iletisim bilgileri"},
}


def heading(line):
    value = unicodedata.normalize("NFKD", line.casefold().replace("ı", "i"))
    value = "".join(c for c in value if not unicodedata.combining(c)).strip(" :|-#")
    return next((key for key, names in HEADINGS.items() if value in names), None)


def draft_from_text(text, filename):
    doc = ResumeDocument()
    doc.metadata.title = PurePath(filename.replace("\\", "/")).stem[:200] or "Imported PDF"
    groups = {"header": []}
    current = "header"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        detected = heading(line)
        if detected:
            current = detected
            groups.setdefault(current, [])
        else:
            groups[current].append(line)
    email = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)
    phone = re.search(
        r"(?<!\w)(?:\+\d{1,3}[ .()-]*)?(?:\(?\d{3}\)?[ .-]*)\d{3}[ .-]*\d{2}[ .-]*\d{2}(?!\w)", text
    )
    if email:
        doc.profile.email = email[0]
    if phone:
        doc.profile.phone = phone[0].strip()
    header = groups["header"]
    if (
        header
        and re.fullmatch(r"[^\W\d_][^\d@|:]{1,79}", header[0], re.UNICODE)
        and 2 <= len(header[0].split()) <= 6
    ):
        parts = header.pop(0).split()
        doc.profile.firstName = " ".join(parts[:-1])
        doc.profile.lastName = parts[-1]

    # Keep ambiguous employer/title/date lines together; never invent missing fields.
    def bullets(lines):
        return [re.sub(r"^[•●▪*-]\s+", "", line) for line in lines]

    for section, lines in groups.items():
        if not lines:
            continue
        body = "\n".join(lines)
        if section == "summary":
            doc.summary = body
        elif section == "experience":
            doc.experience.append(ExperienceItem(summary=body))
        elif section == "education":
            doc.education.append(EducationItem(highlights=bullets(lines)))
        elif section == "projects":
            doc.projects.append(ProjectItem(bullets=bullets(lines)))
        elif section == "skills":
            for line in lines:
                category, sep, values = line.partition(":")
                doc.skills.append(
                    SkillGroup(
                        category=category if sep else "",
                        skills=[
                            v.strip()
                            for v in re.split(r"[,;•]", values if sep else line)
                            if v.strip()
                        ],
                    )
                )
        else:
            doc.customSections.append(
                CustomSection(title="PDF · " + section, items=[CustomSectionItem(description=body)])
            )
    return doc, [key for key in groups if key != "header"]


def inspect_pdf(data, filename):
    if not data.startswith(b"%PDF-"):
        raise ValueError("Choose a valid PDF file.")
    reader = PdfReader(BytesIO(data), strict=False)
    if reader.is_encrypted:
        raise ValueError("Password-protected PDFs are not supported. Upload an unlocked copy.")
    count = len(reader.pages)
    if not 1 <= count <= 10:
        raise ValueError("Upload a CV with 1 to 10 pages.")
    texts = []
    for page in reader.pages:
        content = page.extract_text() or ""
        if sum(len(t) for t in texts) + len(content) > 120000:
            raise ValueError("The PDF contains too much text for a CV. Use a shorter file.")
        texts.append(content)
    text = "\n\n".join(texts).strip()
    words = len(text.split())
    warnings = [
        "PDF import is approximate. Check reading order, name, company, dates and all sections before saving. Photos and the original layout are not imported."
    ]
    usable = words >= 10 and sum(c.isalpha() for c in text) >= 40
    if not usable:
        return PdfImportReport(
            valid=False,
            filename=filename,
            pageCount=count,
            extractedText=text,
            wordCount=words,
            detectedSections=[],
            atsScore=None,
            checks=[],
            warnings=[
                "No usable text could be extracted. This may be a scanned PDF. OCR is not included; use a text-based PDF or import JSON, YAML or Markdown."
            ],
            previewDocument=None,
        )
    doc, sections = draft_from_text(text, filename)
    readable = sum(len(t.strip()) >= 80 for t in texts)
    if readable < count:
        warnings.append(
            "Some pages contain little selectable text. Image-only content may be missing from the import."
        )
    broken = text.count("\ufffd") + sum(ord(c) < 32 and c not in "\n\r\t" for c in text)
    core = sum(key in sections for key in ["summary", "experience", "education", "skills"])
    other = any(key in sections for key in ["projects", "certifications", "languages"])
    checks = [
        PdfImportCheck(
            code="text",
            points=round(40 * readable / count),
            maximum=40,
            message="Selectable text: pages with at least 80 extracted characters / total pages × 40.",
        ),
        PdfImportCheck(
            code="sections",
            points=core * 5 + (5 if other else 0),
            maximum=25,
            message="Recognized summary, experience, education and skills headings: 5 each; projects, certifications or languages: 5 more.",
        ),
        PdfImportCheck(
            code="contact",
            points=(10 if doc.profile.email else 0) + (5 if doc.profile.phone else 0),
            maximum=15,
            message="Readable email: 10 points; readable phone number: 5 points.",
        ),
        PdfImportCheck(
            code="integrity",
            points=10 if not broken else max(0, 10 - broken),
            maximum=10,
            message="Extracted text integrity: 10 points minus unreadable replacement or control characters.",
        ),
        PdfImportCheck(
            code="length",
            points=10 if count <= 2 else 5 if count == 3 else 0,
            maximum=10,
            message="Document length: 1-2 pages earns 10; 3 pages earns 5; longer files earn 0. This is a heuristic, not a universal limit.",
        ),
    ]
    if not sections:
        warnings.append(
            "No standard section headings were recognized. The text is preserved under custom sections for manual organization."
        )
    return PdfImportReport(
        valid=True,
        filename=filename,
        pageCount=count,
        extractedText=text,
        wordCount=words,
        detectedSections=sections,
        atsScore=sum(c.points for c in checks),
        checks=checks,
        warnings=warnings,
        previewDocument=doc,
    )


def _worker(data, filename, connection):
    try:
        try:
            import resource

            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_CPU, (12, 12))
        except ImportError:
            pass
        connection.send({"report": inspect_pdf(data, filename).model_dump(mode="json")})
    except Exception as exc:
        # Do not expose parser internals or include uploaded content in errors/logs.
        message = (
            str(exc)
            if isinstance(exc, ValueError)
            else "The PDF could not be read. Try exporting an unlocked PDF again."
        )
        connection.send({"error": message})
    finally:
        connection.close()


_slots = BoundedSemaphore(max(1, settings.pdf_import_workers))


def review_pdf(data, filename):
    if not _slots.acquire(blocking=False):
        raise AppException(
            "PDF_IMPORT_BUSY",
            "PDF import is busy. Wait for the current import to finish and try again.",
            429,
        )
    try:
        return _review_pdf(data, filename)
    finally:
        _slots.release()


def _review_pdf(data, filename):
    if len(data) > 4 * 1024 * 1024:
        raise AppException("PDF_TOO_LARGE", "Maximum PDF size is 4 MB.", 413)
    context = multiprocessing.get_context("spawn")
    parent, child = context.Pipe(duplex=False)
    process = context.Process(target=_worker, args=(data, filename, child), daemon=True)
    try:
        process.start()
        child.close()
        if not parent.poll(20):
            raise AppException(
                "PDF_READ_TIMEOUT",
                "The PDF could not be read within the time limit. Try a simpler PDF.",
                422,
            )
        try:
            result = parent.recv()
        except EOFError as exc:
            raise AppException(
                "PDF_READ_FAILED",
                "The PDF could not be read within resource limits. Try a simpler PDF.",
                422,
            ) from exc
        if "error" in result:
            raise AppException("PDF_READ_FAILED", result["error"], 422)
        return PdfImportReport.model_validate(result["report"])
    finally:
        if process.is_alive():
            process.terminate()
        if process.pid:
            process.join(timeout=2)
        parent.close()
        child.close()
