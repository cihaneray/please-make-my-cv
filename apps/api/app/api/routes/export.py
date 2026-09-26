from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.import_export import DataFormat
from app.services.conversion_service import ConversionService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resumes/{resume_id}/export", tags=["Export"])


@router.get("")
def export_resume(
    resume_id: str,
    format: DataFormat = Query(default=DataFormat.PDF),
    download: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    doc = ResumeService.get_resume(db, resume_id)
    content, mime_type, filename = ConversionService.export(doc, format)

    headers = {}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    else:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'

    return Response(
        content=content,
        media_type=mime_type,
        headers=headers,
    )
