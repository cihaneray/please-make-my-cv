#!/bin/sh
set -eu
cd /app
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run python scripts/generate_types.py --check
uv run python -m unittest discover -s /extensions/tests -v
cd /web
npm run lint
npm test
