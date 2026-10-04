#!/bin/sh
set -eu
cd /app
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run python scripts/generate_types.py --check
cd /web
npm run lint
npm test
