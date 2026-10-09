"""Editable mail drafts only; this module never sends email."""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.job_service import JobService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/jobs", tags=["Application communications"])


class EmailDraftRequest(BaseModel):
    kind: Literal["follow-up", "thank-you", "negotiation"]
    language: Literal["en", "tr"] = "en"
    recipientName: str = Field(default="", max_length=200)
    requestedTerms: str = Field(default="", max_length=1000)


class EmailDraftResult(BaseModel):
    subject: str
    body: str
    notice: str = "Editable template based on saved job details. Verify all placeholders before sending. No email is sent."


@router.post("/{job_id}/email-draft", response_model=EmailDraftResult)
def email_draft(job_id: str, request: EmailDraftRequest, db: Session = Depends(get_db)):
    job = JobService.get_job(db, job_id)
    tr = request.language == "tr"
    name = "[Ad Soyad]" if tr else "[Your name]"
    if job.linkedResumeId:
        resume = ResumeService.get_resume(db, job.linkedResumeId)
        full_name = f"{resume.profile.firstName} {resume.profile.lastName}".strip()
        if full_name:
            name = full_name
    greeting = (
        f"Merhaba {request.recipientName.strip()},"
        if tr
        else f"Dear {request.recipientName.strip()},"
    )
    if not request.recipientName.strip():
        greeting = f"Merhaba {job.company} ekibi," if tr else f"Dear {job.company} team,"
    date_text = ""
    if job.interviewAt:
        interview = datetime.fromisoformat(job.interviewAt).date()
        date_text = interview.strftime("%d.%m.%Y") if tr else interview.isoformat()
    if request.kind == "follow-up":
        subject = (
            f"{job.position} başvurum hakkında"
            if tr
            else f"Following up: {job.position} application"
        )
        text = (
            f"{job.company} bünyesindeki {job.position} pozisyonu için başvurumun durumu hakkında bilgi almak isterim. Sürecin sonraki adımlarını paylaşabilir misiniz?\n\nEk bilgi veya belge gerekiyorsa iletebilirim."
            if tr
            else f"I would like to ask about the status of my application for the {job.position} position at {job.company}. Could you share the next steps in the process?\n\nPlease let me know if you need any additional information or documents."
        )
    elif request.kind == "thank-you":
        subject = (
            f"{job.position} görüşmesi için teşekkürler"
            if tr
            else f"Thank you: {job.position} interview"
        )
        when = (
            f"{date_text} tarihindeki "
            if date_text and tr
            else f" on {date_text}"
            if date_text
            else ""
        )
        text = (
            f"{when}görüşme için teşekkür ederim. {job.company} bünyesindeki {job.position} rolünü konuşmak benim için değerliydi.\n\n[Görüşmeden paylaşmak istediğiniz somut bir noktayı ekleyin.]\n\nSonraki adımları öğrenmekten memnuniyet duyarım."
            if tr
            else f"Thank you for the interview{when}. I appreciated the opportunity to discuss the {job.position} role at {job.company}.\n\n[Add a specific point from your conversation.]\n\nI look forward to hearing about the next steps."
        )
    else:
        subject = (
            f"{job.position} teklif koşulları" if tr else f"Discussing offer terms: {job.position}"
        )
        terms = request.requestedTerms.strip() or (
            "[Görüşmek istediğiniz ücret veya koşulları yazın.]"
            if tr
            else "[Enter the compensation or terms you would like to discuss.]"
        )
        text = (
            f"{job.company} bünyesindeki {job.position} rolünün teklif koşullarını görüşmek isterim.\n\n{terms}\n\nBu konuda görüşmek için uygun bir zaman paylaşabilir misiniz?"
            if tr
            else f"I would like to discuss the offer terms for the {job.position} role at {job.company}.\n\n{terms}\n\nCould you suggest a suitable time to discuss this?"
        )
    closing = "Saygılarımla," if tr else "Kind regards,"
    return EmailDraftResult(subject=subject, body=f"{greeting}\n\n{text}\n\n{closing}\n{name}")
