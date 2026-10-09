import io

from fastapi import APIRouter, Depends, Query, Response
from pypdf import PdfReader, PdfWriter
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.import_export import DataFormat
from app.schemas.resume import ResumeDocument
from app.services.anonymization_service import anonymize_document
from app.services.conversion_service import ConversionService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resumes/{resume_id}/export", tags=["Export"])


@router.post("/anonymous/preview", response_model=ResumeDocument)
def preview_anonymous_draft(resume_id: str, document: ResumeDocument):
    return anonymize_document(document)


@router.post("/anonymous/pdf")
def export_anonymous_draft(resume_id: str, document: ResumeDocument):
    # Apply the transformation again server-side even when a caller posts a preview.
    anonymous = anonymize_document(document)
    content, _, _ = ConversionService.export(anonymous, DataFormat.PDF)
    writer = PdfWriter()
    for page in PdfReader(io.BytesIO(content)).pages:
        writer.add_page(page)
    writer.add_metadata(
        {
            "/Title": anonymous.metadata.title,
            "/Author": "",
            "/Subject": "",
            "/Keywords": "",
            "/Creator": "",
        }
    )
    output = io.BytesIO()
    writer.write(output)
    filename = "aday-cv.pdf" if anonymous.metadata.language.lower() == "tr" else "candidate-cv.pdf"
    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("")
def export_resume(
    resume_id: str,
    format: DataFormat = Query(default=DataFormat.PDF),
    download: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    doc = ResumeService.get_resume(db, resume_id)
    content, mime_type, filename = ConversionService.export(doc, format)

    headers = {
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
    }
    if format == DataFormat.PDF:
        headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'self'; base-uri 'none'"
        )
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    else:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'

    return Response(
        content=content,
        media_type=mime_type,
        headers=headers,
    )
