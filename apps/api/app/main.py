from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.routes import ai, export, imports, jobs, library, resumes, source
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import RequestLoggingMiddleware
from app.db.seed import seed_database
from app.db.session import SessionLocal, init_db
from app.rules.registry import default_rule_registry

logger = logging.getLogger("cv_workspace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas and seed demo data on startup
    init_db()
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


# Health check
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "rulesLoaded": len(default_rule_registry.list_rules()),
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
app.include_router(library.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
