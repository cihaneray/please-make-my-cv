from typing import Any

from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: list[Any] | dict[str, Any] | None = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "details": details or [],
            },
        )
        self.code = code
        self.message = message
        self.details = details or []


class EntityNotFoundException(AppException):
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(
            code=f"{entity_name.upper()}_NOT_FOUND",
            message=f"{entity_name} with id '{entity_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ConcurrencyConflictException(AppException):
    def __init__(self, current_revision: int, attempted_revision: int):
        super().__init__(
            code="CONCURRENCY_CONFLICT",
            message=f"Conflict detected. Document revision is {current_revision}, but update requested for revision {attempted_revision}.",
            status_code=status.HTTP_409_CONFLICT,
            details=[
                {"currentRevision": current_revision, "attemptedRevision": attempted_revision}
            ],
        )


class ValidationException(AppException):
    def __init__(self, message: str, details: list[Any] | None = None):
        super().__init__(
            code="RESUME_VALIDATION_FAILED",
            message=message,
            status_code=422,
            details=details,
        )
