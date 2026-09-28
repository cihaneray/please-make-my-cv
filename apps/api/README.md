# CV Workspace API

Run from this directory: `uv sync --frozen`, `uv run playwright install chromium`, then `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`.

Python 3.12+ is supported. Startup runs Alembic migrations. Set DATABASE_URL to choose storage and SEED_DEMO=true only when demo data is desired. `.env.example` documents local configuration. Docker installs Chromium and PostgreSQL support.

Run `uv run pytest -q` for isolated tests and `uv run ruff check .` for lint. Regenerate frontend models with `uv run python scripts/generate_types.py`; CI checks them with `--check`.

API docs are at `/docs`. This API is intended for a local single-user installation, not unauthenticated public hosting. See the root README for backup, restore, and format limitations.
