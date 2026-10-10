# Architecture

The FastAPI Pydantic `ResumeDocument` is the storage and API contract. `apps/api/scripts/generate_types.py` generates the frontend's TypeScript response models. API routes delegate to services and parsers. SQLite is the local default; PostgreSQL is supported by Compose.

The Studio owns the working draft. Forms update it; JSON/YAML source is serialized from it and applied back after server validation. Draft analysis and export accept that draft directly. The save response updates the revision without overwriting edits typed while saving. Local storage offers explicitly recoverable drafts; it is neither encryption nor a backup guarantee.

Repeatable experience, education, project and skill entries share a foldable editor component. Version comparison groups saved revisions and other CVs in a dialog and compares against the current draft. The optional reading map uses measured preview section positions and text density; it is excluded from exports.

Deterministic document analysis uses `app.rules.registry` through `AnalysisService`. The same registered rules power API analysis and regression tests; there is no separate legacy analyzer rule set.

Persistence uses atomic `UPDATE ... WHERE id = ... AND revision = ...`. The same transaction captures the previous revision. Metadata patches require an expected revision. Soft deletion advances revisions. Saved history can be loaded into the draft or restored through the API as a new revision.

Alembic adopts existing databases and creates versioned history/snapshot tables. Demo seeding is opt-in. Tests bypass production startup and override request sessions. Job submission snapshots retain the submitted document independently of later edits.

One escaped HTML renderer powers live content preview and Chromium PDF generation. The renderer restricts fonts, colors, language attributes and network access. Preview HTML uses a sandboxed iframe. Exact PDF preview uses actual generated PDF bytes and browser pagination controls.

DOCX export maps the same visible sections, ordering and template styling into
native editable Word content. Word pagination can differ from the print renderer.
Chromium's headless shell remains inside the API container; there is no separate
PDF service.

JSON/YAML are lossless within supported schema version 1. Unknown structured fields are rejected. Markdown is a best-effort import/export format and cannot replace a document through source editing. Request bodies are bounded before parsing.

The application is designed for a localhost, single-user trust boundary. Compose binds ports to loopback; it does not supply internet-hosting authentication. Assets no longer fetch Google Fonts. Workspace backups contain personal data and restore additively in one transaction.

Web/API run as non-root UID 10001 with dropped Linux capabilities. The one-shot
`db-init` configures the restricted `cv_app` PostgreSQL role and existing table
ownership; `volume-init` repairs persistent-volume permissions before startup.
Both setup services exit successfully, leaving web/API/database running.

AI settings encrypt credentials with Fernet using a separate local key, stored
in Docker's `ai_secrets` volume. This protects copied settings without the key,
not against an administrator able to read both. Optional password-protected
workspace backups derive keys with Argon2id and use authenticated encryption;
neither AI credentials nor the local encryption key is included.

Job tailoring uses existing matching evidence to promote selected visible
experience/project bullets and their entries in a new CV copy. Candidate IDs
and CV/job revision checks prevent stale or forged selections. No new facts
are generated, and the original CV and submitted snapshots are preserved.
