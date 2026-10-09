import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.routes import (
    ai,
    communications,
    export,
    imports,
    jobs,
    library,
    resumes,
    source,
    workspace,
)
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.local_access import LocalOriginMiddleware
from app.core.logging import RequestLoggingMiddleware
from app.db.seed import seed_database
from app.db.session import SessionLocal, init_db
from app.rules.registry import default_rule_registry

logger = logging.getLogger("cv_workspace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas and seed demo data on startup
    if not getattr(app.state, "skip_database_startup", False):
        init_db()
        if settings.seed_demo:
            with SessionLocal() as db:
                seed_database(db)
    rules_count = len(default_rule_registry.list_rules())
    logger.info("Loaded %d deterministic rules into registry at startup.", rules_count)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(BodyLimitMiddleware, limit=settings.max_upload_size_bytes)
app.add_middleware(LocalOriginMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts, www_redirect=False)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Centralized exception handlers (Section 32)
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(ValidationError)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    details = [
        {"field": ".".join(str(loc) for loc in e["loc"]), "msg": e["msg"]} for e in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Schema validation failed.",
                "details": details,
            }
        },
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled request error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred.",
                "details": [],
            }
        },
    )


# Health check
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "rulesLoaded": len(default_rule_registry.list_rules()),
        "maxUploadSizeBytes": settings.max_upload_size_bytes,
    }


# Rule registry inspection
@app.get("/api/rules")
def get_rules():
    return {
        "rules": [
            {
                "id": r.id,
                "name": r.name,
                "version": r.version,
                "type": r.rule_type.value,
                "category": r.category.value,
                "description": r.description,
            }
            for r in default_rule_registry.list_rules()
        ]
    }


# Register routes
app.include_router(resumes.router, prefix=settings.api_prefix)
app.include_router(source.router, prefix=settings.api_prefix)
app.include_router(imports.router, prefix=settings.api_prefix)
app.include_router(export.router, prefix=settings.api_prefix)
app.include_router(jobs.router, prefix=settings.api_prefix)
app.include_router(communications.router, prefix=settings.api_prefix)
app.include_router(library.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
app.include_router(workspace.router, prefix=settings.api_prefix)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
