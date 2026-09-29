# Remediation report

Date: 2026-09-28

The review has been addressed through implementation, regression coverage, and explicit product boundaries below. The remediation was committed in separate API, PDF, AI, editor, build, and documentation commits. Later feature work is recorded in Git and the changelog; no deployment was performed.

## Data integrity and editor

- Unified visual and structured editing around one draft. JSON/YAML validation and Apply are explicit; uncommitted source blocks conflicting actions.
- Added draft recovery, unsaved navigation protection, undo, revision history, and restore into a reviewable draft.
- Saves retain typing that occurs during an in-flight request. Conditional database updates enforce revision conflicts, including metadata edits and archive actions.
- Strict structured imports reject unsupported versions, unknown fields, duplicate entry IDs, malformed containers, YAML aliases, and oversized bodies. Imported locale and market are preserved.
- Markdown imports recover contact, certification, language, and date fields more accurately. Markdown remains explicitly lossy and is not offered as a full-document source replacement.
- Delete errors remain visible; stale import previews cannot be applied. Archived resumes can be restored.

## Exports and security

- PDF downloads now contain actual Chromium-rendered PDF bytes. Live HTML and exact PDF preview share the backend renderer.
- All templates render custom sections and previously omitted details. Design spacing, margins, typography, and safe colors are honored.
- Escaping, safe URL handling, font/color allowlists, CSP, and a sandboxed preview address HTML injection paths. PDF rendering disables JavaScript and external network requests.
- Removed remote font requests. API request size is bounded at 5 MB, including streamed bodies.
- Local-only defaults and Docker port bindings reflect the single-user trust model. Authentication and public multi-user hosting are outside this implementation; do not expose it directly to the internet.

## Features and truthful feedback

- Added editing for all schema sections, ordering and visibility, reusable library insertion, archive restoration, and workspace backup/additive restore.
- Job details and nullable resume links are editable. Submission transitions capture immutable resume snapshots with downloadable PDFs.
- Comparisons use stable entry IDs and include all document fields rather than grouping by company.
- Matching accepts explicit requirements for any occupation. Unrecognized requirements return an unassessed score instead of an invented percentage.
- Deterministic writing assistance preserves facts and casing, handles empty content, and avoids invented achievements. Analysis no longer claims verification of language, legal compliance, or ATS outcomes.
- Added global resume search, responsive navigation, accessible labels/focus states, visible errors, and English/Turkish copy for new controls. Some legacy/backend diagnostics remain English.

## Engineering and deployment

- Added Alembic migrations with adoption of existing databases, isolated test database fixtures, generated TypeScript contracts, real ESLint checks, formatting, and regression workflows.
- Added PostgreSQL driver, valid CORS configuration, reproducible dependency locks, container health checks, and corrected Docker build inputs.
- Removed unused frontend dependencies and corrected ignore rules that hid source and documentation files.
- Updated README, API documentation, architecture, security policy, and changelog to match actual behavior.

## Validation

- Backend: 51 tests pass; Ruff lint and formatting pass; generated contracts match.
- Frontend: ESLint and all 9 production-build browser workflows pass, including save races, source locking, recovery, PDF download, failed deletion, stale imports, mobile navigation, nested skills, and history restore.
- Six template/language PDF combinations were rendered and visually inspected. Multi-page PDF content is covered by regression tests.
- Docker Compose configuration validates. Full container startup could not be verified because the local Docker engine is stopped; CI includes container smoke checks.

## Remaining boundaries

- This remains a local single-user application, not an authenticated hosted service.
- Markdown round trips cannot preserve the full schema; JSON/YAML and workspace backups are the preservation formats.
- Browser PDF preview depends on the browser PDF viewer. Chromium must be installed for backend exports; missing installation returns a useful error.
- Existing local Python environment is 3.14; CI is configured for the declared Python 3.12 baseline. CI execution itself was not observed here.
- A legacy test fixture previously bypassed database isolation and may have inserted test records into the normal database during early validation. It is now fixed; no potentially user-owned rows were deleted.
- Backups restore additively with new IDs and do not replace existing records. Migration downgrades are intentionally unsupported.


## Follow-up: PDF browser and configurable LLM reviews

- Verified bundled Chromium launches and generates PDF bytes. Added automatic installed Edge/Chrome fallback, explicit browser overrides, a diagnostic script, and separate start/render errors.
- Added Settings controls for OpenAI-compatible and Ollama endpoints, model, backend-only API key, enable/disable, and a saved-connection test. Settings persist across restarts and in a dedicated Docker volume.
- Added on-demand AI reviews of the current draft: explained scores, prioritized recommendations, strengths, missing information, suggested wording, and optional target-job relevance. English and Turkish feedback are supported. Stale results are flagged; suggestions are not automatically applied.
- Added provider timeouts, safe error messages, response validation, direct-contact omission, key clearing on endpoint changes, and isolated tests. Basic bullet/summary cleanup remains local.
- Backend suite now has 64 passing tests and all 11 browser workflows pass against a production build. PDF diagnostic, lint, and generated contract checks pass. Real LLM responses require a user-configured model/server and have not been exercised with paid credentials; provider protocol and failure paths use mocked transports.


## Follow-up: actionable suggestions and job-specific copies

The Review tab now supports before/after comparisons, individual Apply/Skip controls, and per-suggestion Undo. Changes remain in the draft until saved. Backend-generated targets and current-value checks protect unrelated fields and edits made since the review. Job-specific copies preserve the original and capture target role/company/description for later reviews. Current validation: 68 backend tests and 18 browser/interaction checks pass, including stale suggestions, stable entry IDs, undo/save, and reopening copies with job context. Model responses are mocked in automated tests; live quality depends on the configured provider.
