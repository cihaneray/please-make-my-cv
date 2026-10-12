"""Create a chronological CV copy from verified existing evidence."""

import hashlib
import re

from app.core.exceptions import AppException
from app.matching.matcher import MatchingService
from app.schemas.job import JobApplication, TailoringCandidate, TailoringPlan
from app.schemas.resume import ResumeDocument

_DATE = re.compile(r"^(\d{4})(?:[-/](0?[1-9]|1[0-2]))?$")
_ONGOING = {"present", "current", "ongoing", "now", "devam", "devam ediyor", "günümüz"}


def _date_key(value: str) -> tuple[int, int] | None:
    """Compare explicit years/months without changing or inventing stored dates."""
    match = _DATE.fullmatch(value.strip())
    return (int(match[1]), int(match[2] or 0)) if match else None


def reverse_chronological(entries: list) -> list:
    """Keep unparseable/undated entries in source slots; sort known dates stably."""

    def key(entry):
        ongoing = getattr(entry, "current", False) or entry.endDate.strip().casefold() in _ONGOING
        start = _date_key(entry.startDate)
        end = _date_key(entry.endDate)
        if not ongoing and not (end or start):
            return None
        return (bool(ongoing), end or start or (0, 0), start or (0, 0))

    # Unknown text is not evidence of an earlier/later role. Preserve its placement.
    dated = iter(
        sorted((entry for entry in entries if key(entry) is not None), key=key, reverse=True)
    )
    return [next(dated) if key(entry) is not None else entry for entry in entries]


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
    for candidate_id in selected:
        item = known[candidate_id]
        priorities.setdefault((item.section, item.entryId), set()).add(item.bulletIndex)
    for section in ("experience", "projects"):
        entries = getattr(result, section)
        for entry in entries:
            chosen = priorities.get((section, entry.id), set())
            entry.bullets = [
                text for index, text in enumerate(entry.bullets) if index in chosen
            ] + [text for index, text in enumerate(entry.bullets) if index not in chosen]
        setattr(result, section, reverse_chronological(entries))
    result.education = reverse_chronological(result.education)
    return result
