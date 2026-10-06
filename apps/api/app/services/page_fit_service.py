from app.schemas.resume import PageFitOption, PageFitReport, PageFitRequest
from app.services.pdf_check_service import check_pdf


def suggest_page_fit(request: PageFitRequest) -> PageFitReport:
    document = request.document
    current = check_pdf(document).pageCount
    report = PageFitReport(targetPages=request.targetPages, currentPages=current)
    if current <= request.targetPages:
        return report
    candidates = [
        ("spacing", "Compact spacing", {"spacing": "compact"}),
        ("margins", "Compact spacing and margins", {"spacing": "compact", "margins": "compact"}),
    ]
    try:
        font_size = float(document.design.fontSize.removesuffix("pt"))
    except ValueError:
        font_size = 10
    if font_size > 9.5:
        candidates.append(
            (
                "font",
                "Compact layout with 9.5 pt text",
                {"spacing": "compact", "margins": "compact", "fontSize": "9.5pt"},
            )
        )
    seen = {document.design.model_dump_json()}
    for key, label, changes in candidates:
        design = document.design.model_copy(update=changes)
        if design.model_dump_json() in seen:
            continue
        seen.add(design.model_dump_json())
        candidate = document.model_copy(update={"design": design})
        report.options.append(
            PageFitOption(
                id=key, label=label, design=design, pageCount=check_pdf(candidate).pageCount
            )
        )
    report.suggestions = [
        "Review long bullets and repeated details before removing content.",
        "Keep the most relevant experiences and projects for this application.",
    ]
    return report
