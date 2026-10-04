FROM python:3.12-slim AS base

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.12.23 /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --link-mode=copy
RUN .venv/bin/playwright install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/*

# Copy application source code
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY alembic.ini ./

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS development
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --link-mode=copy
COPY scripts/ ./scripts/
COPY tests/ ./tests/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]

FROM base AS production
