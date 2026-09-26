# CV Workspace API

FastAPI backend providing canonical ResumeDocument modeling, multi-format conversion (YAML, JSON, Markdown), ATS heuristic analysis, Job Description matching, and Career Content Library services.

## Development

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Running Tests

```bash
uv run pytest
```
