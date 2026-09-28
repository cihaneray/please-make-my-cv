# Architecture

The FastAPI Pydantic `ResumeDocument` is the storage and API contract. `apps/api/scripts/generate_types.py` generates the frontend's TypeScript response models. API routes delegate to services and parsers. SQLite is the local default; PostgreSQL is supported by Compose.

The Studio owns the working draft. Forms update it; JSON/YAML source is serialized from it and applied back after server validation. Draft analysis and export accept that draft directly. The save response updates the revision without overwriting edits typed while saving. Local storage offers explicitly recoverable drafts; it is neither encryption nor a backup guarantee.

Persistence uses atomic `UPDATE ... WHERE id = ... AND revision = ...`. The same transaction captures the previous revision. Metadata patches require an expected revision. Soft deletion advances revisions. Saved history can be loaded into the draft or restored through the API as a new revision.

Alembic adopts existing databases and creates versioned history/snapshot tables. Demo seeding is opt-in. Tests bypass production startup and override request sessions. Job submission snapshots retain the submitted document independently of later edits.

One escaped HTML renderer powers live content preview and Chromium PDF generation. The renderer restricts fonts, colors, language attributes and network access. Preview HTML uses a sandboxed iframe. Exact PDF preview uses actual generated PDF bytes and browser pagination controls.

JSON/YAML are lossless within supported schema version 1. Unknown structured fields are rejected. Markdown is a best-effort import/export format and cannot replace a document through source editing. Request bodies are bounded before parsing.

The application is designed for a localhost, single-user trust boundary. Compose binds ports to loopback; it does not supply internet-hosting authentication. Assets no longer fetch Google Fonts. Workspace backups contain personal data and restore additively in one transaction.
