"""Create a chronological CV copy from verified existing evidence."""

import hashlib
import re
import uuid

from app.core.exceptions import AppException
from app.matching.matcher import MatchingService
from app.schemas.job import JobApplication, TailoringCandidate, TailoringPlan
from app.schemas.library import LibrarySnippet
from app.schemas.resume import CertificationItem, ProjectItem, ResumeDocument

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


def tailoring_plan(
    document: ResumeDocument, job: JobApplication, snippets: list[LibrarySnippet] | None = None
) -> TailoringPlan:
    if not job.position.strip() or not (job.description.strip() or job.requirements):
        raise AppException(
            "JOB_CONTEXT_REQUIRED",
            "Add a job title and description or requirements before tailoring a CV.",
            422,
        )
    match = MatchingService.match(document, job.id, job.description, job.requirements or None)
    candidates = []
    for section, entries, visible in (
        ("experience", document.experience, document.visibility.showExperience),
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
    for section, entries, visible in (
        ("projects", document.projects, document.visibility.showProjects),
        ("certifications", document.certifications, document.visibility.showCertifications),
    ):
        if not visible:
            continue
        for entry in entries:
            relevant = [e for e in match.evidence if e.section == section and e.entryId == entry.id]
            terms = sorted({e.requirement for e in relevant})
            if terms:
                text = " · ".join(dict.fromkeys(e.text for e in relevant))
                identity = hashlib.sha256(
                    f"{section}:{entry.id}:entry:{text}".encode()
                ).hexdigest()[:24]
                candidates.append(
                    TailoringCandidate(
                        id=identity,
                        section=section,
                        entryId=entry.id,
                        bulletIndex=-1,
                        text=text,
                        requirements=terms,
                        entryTitle=entry.name,
                    )
                )
    for snippet in snippets or []:
        if snippet.type.value not in {"project", "certification"}:
            continue
        probe = document.model_copy(deep=True)
        probe.projects = (
            [
                snippet.project
                or ProjectItem(name=snippet.title, bullets=snippet.content.splitlines())
            ]
            if snippet.type.value == "project"
            else []
        )
        probe.certifications = (
            [snippet.certification or CertificationItem(name=snippet.title)]
            if snippet.type.value == "certification"
            else []
        )
        probe.visibility.showProjects = True
        probe.visibility.showCertifications = True
        section = "projects" if snippet.type.value == "project" else "certifications"
        matched = MatchingService.match(probe, job.id, job.description, job.requirements or None)
        evidence = [e for e in matched.evidence if e.section == section]
        terms = sorted({e.requirement for e in evidence})
        if not terms:
            continue
        text = " · ".join(dict.fromkeys(e.text for e in evidence))
        identity = hashlib.sha256(
            f"library:{snippet.model_dump_json()}:{text}".encode()
        ).hexdigest()[:24]
        candidates.append(
            TailoringCandidate(
                id=identity,
                section=section,
                entryId=snippet.id,
                entryTitle=snippet.title,
                bulletIndex=-1,
                text=text,
                requirements=terms,
                librarySnippetId=snippet.id,
            )
        )
    candidates.sort(key=lambda item: -len(item.requirements))
    return TailoringPlan(
        resumeId=document.metadata.id,
        revision=document.metadata.revision,
        jobId=job.id,
        jobUpdatedAt=job.updatedAt,
        candidates=candidates,
        missingRequirements=[
            term
            for term in match.missingSkills
            if not any(term in item.requirements for item in candidates)
        ],
    )


def tailored_document(
    document: ResumeDocument,
    job: JobApplication,
    selected: list[str],
    snippets: list[LibrarySnippet] | None = None,
) -> ResumeDocument:
    plan = tailoring_plan(document, job, snippets)
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
    selected_entries = {(known[key].section, known[key].entryId) for key in selected}
    result.projects = [
        entry for entry in result.projects if ("projects", entry.id) in selected_entries
    ]
    result.certifications = [
        entry for entry in result.certifications if ("certifications", entry.id) in selected_entries
    ]
    library = {snippet.id: snippet for snippet in snippets or []}
    for item in (known[key] for key in selected):
        if not item.librarySnippetId:
            continue
        snippet = library[item.librarySnippetId]
        if item.section == "projects":
            entry = (
                snippet.project
                or ProjectItem(name=snippet.title, bullets=snippet.content.splitlines())
            ).model_copy(deep=True)
            entry.id = str(uuid.uuid4())
            result.projects.append(entry)
        else:
            entry = (snippet.certification or CertificationItem(name=snippet.title)).model_copy(
                deep=True
            )
            entry.id = str(uuid.uuid4())
            result.certifications.append(entry)
    result.projects = reverse_chronological(result.projects)
    from app.schemas.resume import TargetJob

    result.metadata.targetJob = TargetJob(
        position=job.position,
        company=job.company,
        description=job.description or "\n".join(job.requirements),
    )
    result.metadata.targetRole = job.position
    result.education = reverse_chronological(result.education)
    return result
