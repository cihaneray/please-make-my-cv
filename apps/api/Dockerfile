FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258 AS dependencies
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e44e249f2e4b526b6c7ddcecce245946826e608e11c93ad4f5bba55b21 /uv /bin/uv
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --link-mode=copy
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN .venv/bin/playwright install --only-shell chromium

FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258 AS runtime
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH" \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PYTHONDONTWRITEBYTECODE=1
COPY --from=dependencies --chown=10001:10001 /app/.venv /app/.venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libexpat1 libgbm1 libglib2.0-0 libnspr4 libnss3 libudev1 \
    libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxkbcommon0 libxrandr2 libxrender1 fontconfig \
    fonts-dejavu-core fonts-liberation fonts-freefont-ttf fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* /root/.cache \
    && useradd --uid 10001 --create-home app \
    && mkdir -p /app/data /app/secrets \
    && chown app:app /app /app/data /app/secrets /home/app
COPY --from=dependencies --chown=app:app /ms-playwright /ms-playwright
COPY --chown=app:app app/ ./app/
COPY --chown=app:app migrations/ ./migrations/
COPY --chown=app:app alembic.ini prepare-volumes.py ./
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM runtime AS development
COPY --from=ghcr.io/astral-sh/uv:0.12.23@sha256:61d393e44e249f2e4b526b6c7ddcecce245946826e608e11c93ad4f5bba55b21 /uv /bin/uv
COPY --chown=app:app pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/home/app/.cache/uv,uid=10001,gid=10001 uv sync --frozen --link-mode=copy
COPY --chown=app:app scripts/ ./scripts/
COPY --chown=app:app tests/ ./tests/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]

FROM runtime AS production
