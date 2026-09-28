from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeDocument


class IssueSeverity(str, Enum):
    ERROR = "error"
    IMPORTANT = "important"
    SUGGESTION = "suggestion"
    INFO = "info"


class RuleCategory(str, Enum):
    ATS = "ats"
    CONTENT = "content"
    LANGUAGE = "language"
    CONSISTENCY = "consistency"
    RELEVANCE = "relevance"
    FORMATTING = "formatting"
    PRIVACY = "privacy"
    JOB_MATCH = "job_match"


class RuleType(str, Enum):
    LANGUAGE_STANDARD = "language_standard"
    MARKET_CONVENTION = "market_convention"
    DETERMINISTIC_VALIDATION = "deterministic_validation"
    ATS_HEURISTIC = "ats_heuristic"
    PRODUCT_PREFERENCE = "product_preference"


class RuleIssue(BaseModel):
    id: str
    rule_id: str
    severity: IssueSeverity
    category: RuleCategory
    section: str
    field_id: str | None = None
    message: str
    reason: str
    proposed_change: str | None = None
    requires_user_fact: bool = False


class RuleResult(BaseModel):
    rule_id: str
    rule_type: RuleType
    category: RuleCategory
    version: str = "1.0.0"
    passed: bool = True
    score_impact: int = 0
    issues: list[RuleIssue] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BaseRule(ABC):
    id: str
    name: str
    version: str = "1.0.0"
    rule_type: RuleType
    category: RuleCategory
    description: str

    @abstractmethod
    def evaluate(self, resume: ResumeDocument, context: dict[str, Any] | None = None) -> RuleResult:
        """Execute deterministic evaluation against the canonical ResumeDocument."""
        ...
