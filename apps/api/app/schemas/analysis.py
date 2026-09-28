from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class IssueSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    IMPORTANT = "important"
    CRITICAL = "critical"


class AnalysisIssue(BaseModel):
    ruleId: str
    severity: IssueSeverity
    section: str
    message: str
    suggestion: str | None = None
    targetId: str | None = None


class ResumeAnalysisReport(BaseModel):
    resumeId: str
    overallScore: int = 85
    atsCompatibilityScore: int = 90
    contentQualityScore: int = 80
    issues: list[AnalysisIssue] = Field(default_factory=list)
    wordCount: int = 0
    bulletCount: int = 0
    strengths: list[str] = Field(default_factory=list)
    atsBreakdown: dict[str, int | None] | None = None
    heuristicNotice: str | None = None
    calculatedAt: str = ""


class ComparisonChange(BaseModel):
    category: str  # "profile" | "experience" | "skills" | "education" | "design" etc.
    changeType: str  # "added" | "removed" | "modified"
    description: str
    details: dict[str, Any] = Field(default_factory=dict)


class ResumeComparisonReport(BaseModel):
    sourceResumeId: str
    targetResumeId: str
    sourceTitle: str
    targetTitle: str
    changes: list[ComparisonChange] = Field(default_factory=list)
    summary: str = ""
