from app.schemas.analysis import ComparisonChange, ResumeComparisonReport
from app.schemas.resume import ResumeDocument


class ComparisonService:
    @staticmethod
    def compare(source: ResumeDocument, target: ResumeDocument) -> ResumeComparisonReport:
        changes = []
        for section in ResumeDocument.model_fields:
            if section == "metadata":
                continue
            before, after = getattr(source, section), getattr(target, section)
            if before == after:
                continue
            if isinstance(before, list) and isinstance(after, list):
                left = {item.id: item.model_dump() for item in before}
                right = {item.id: item.model_dump() for item in after}
                for key in sorted(left.keys() | right.keys()):
                    if left.get(key) != right.get(key):
                        kind = (
                            "added"
                            if key not in left
                            else "removed"
                            if key not in right
                            else "modified"
                        )
                        changes.append(
                            ComparisonChange(
                                category=section,
                                changeType=kind,
                                description=f"{section} entry {key} {kind}.",
                                details={"from": left.get(key), "to": right.get(key)},
                            )
                        )
                if list(left) != list(right) and left == right:
                    changes.append(
                        ComparisonChange(
                            category=section,
                            changeType="modified",
                            description="Entry order changed.",
                        )
                    )
            else:
                changes.append(
                    ComparisonChange(
                        category=section,
                        changeType="modified",
                        description=f"{section} changed.",
                        details={
                            "from": before.model_dump()
                            if hasattr(before, "model_dump")
                            else before,
                            "to": after.model_dump() if hasattr(after, "model_dump") else after,
                        },
                    )
                )
        return ResumeComparisonReport(
            sourceResumeId=source.metadata.id,
            targetResumeId=target.metadata.id,
            sourceTitle=source.metadata.title,
            targetTitle=target.metadata.title,
            changes=changes,
            summary=f"Detected {len(changes)} differences across content, visibility and design.",
        )
