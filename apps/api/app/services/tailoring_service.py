"""Reorder verified existing bullets in an explicitly requested CV copy."""

import hashlib

from app.core.exceptions import AppException
from app.matching.matcher import MatchingService
from app.schemas.job import JobApplication, TailoringCandidate, TailoringPlan
from app.schemas.resume import ResumeDocument


def tailoring_plan(document: ResumeDocument, job: JobApplication) -> TailoringPlan:
    match = MatchingService.match(document, job.id, job.description, job.requirements or None)
    candidates = []
    for section, entries, visible in (
        ("experience", document.experience, document.visibility.showExperience),
        ("projects", document.projects, document.visibility.showProjects),
    ):
        if not visible:
            continue
        for entry in entries:
            for index, text in enumerate(entry.bullets):
                terms = sorted(
                    {
                        e.requirement
                        for e in match.evidence
                        if e.section == section and e.entryId == entry.id and e.text == text
                    }
                )
                if not terms:
                    continue
                identity = hashlib.sha256(
                    f"{section}:{entry.id}:{index}:{text}".encode()
                ).hexdigest()[:24]
                candidates.append(
                    TailoringCandidate(
                        id=identity,
                        section=section,
                        entryId=entry.id,
                        bulletIndex=index,
                        text=text,
                        requirements=terms,
                        entryTitle=entry.position if section == "experience" else entry.name,
                    )
                )
    candidates.sort(key=lambda item: -len(item.requirements))
    return TailoringPlan(
        resumeId=document.metadata.id,
        revision=document.metadata.revision,
        jobId=job.id,
        jobUpdatedAt=job.updatedAt,
        candidates=candidates,
        missingRequirements=match.missingSkills,
    )


def tailored_document(
    document: ResumeDocument, job: JobApplication, selected: list[str]
) -> ResumeDocument:
    plan = tailoring_plan(document, job)
    known = {item.id: item for item in plan.candidates}
    if (
        not selected
        or len(set(selected)) != len(selected)
        or any(key not in known for key in selected)
    ):
        raise AppException(
            "INVALID_TAILORING_SELECTION", "Select existing suggestions from the current plan.", 422
        )
    result = document.model_copy(deep=True)
    priorities = {}
    for key in selected:
        item = known[key]
        priorities.setdefault((item.section, item.entryId), {})[item.bulletIndex] = len(
            item.requirements
        )
    for section in ("experience", "projects"):
        entries = getattr(result, section)
        for entry in entries:
            ranks = priorities.get((section, entry.id), {})
            entry.bullets = [
                text
                for _, text in sorted(
                    enumerate(entry.bullets), key=lambda pair: (-ranks.get(pair[0], 0), pair[0])
                )
            ]
        entries.sort(key=lambda entry: -sum(priorities.get((section, entry.id), {}).values()))
    return result
