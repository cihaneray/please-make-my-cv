# API reference

The generated OpenAPI specification at `/openapi.json` and interactive `/docs` are authoritative. The usual API prefix is `/api`. API requests are limited to 5 MB.

## Resume lifecycle

- `GET /resumes?include_archived=true` includes archived records.
- `POST /resumes` creates a document. Explicit creation options override imported defaults; language and market otherwise remain intact.
- `GET /resumes/{id}` reads a canonical document.
- `PUT /resumes/{id}` accepts `{revision, document}` and atomically compares the expected revision. Stale writes return 409.
- `PATCH /resumes/{id}/metadata` requires `revision` plus changed metadata. It also advances the revision and captures history.
- `POST /resumes/{id}/duplicate` creates a variant.
- `DELETE /resumes/{id}` archives; `?permanent=true` removes the document and its history.
- `GET /resumes/{id}/history` returns previous saved documents.
- `POST /resumes/{id}/restore/{revision}?expected_revision=N` restores a historical document as a new revision.

## Draft operations

- `GET /resumes/{id}/analysis` analyzes saved content.
- `POST /resumes/{id}/analysis` accepts a complete draft document.
- `POST /resumes/{id}/preview` accepts a draft and returns safe print-ready HTML.
- `POST /resumes/{id}/export` accepts a draft and returns actual PDF bytes.
- `POST /resumes/{id}/compare/{other_id}` compares content, visibility and design. Entries are matched by stable ID.

## Source and conversion

- `GET /resumes/{id}/source?format=json|yaml` retrieves lossless source.
- `POST /resumes/{id}/source/validate` accepts `{format, content}` and returns errors, warnings and normalized data.
- `PUT /resumes/{id}/source` accepts `{format, content, revision}` and persists validated JSON/YAML. The browser uses validation followed by draft application, leaving Save explicit.
- `POST /import/validate` and `/import/preview` accept `{content, format?}`. Markdown is a lossy import with warnings. Unknown JSON/YAML fields and unsupported schema versions are rejected.
- `POST /import/apply` creates a new document. `overwriteExistingId` is explicitly rejected.
- `GET /resumes/{id}/export?format=pdf|html|json|yaml|markdown&download=true` exports a saved document. PDF returns `application/pdf`; HTML is a distinct format.

## Jobs, library and backups

- `/jobs` supports list/create; `/jobs/{id}` supports read/update/delete. Explicit null `linkedResumeId` unlinks a document.
- `POST /jobs/{id}/match/{resume_id}` accepts optional `{requirements: ["term", ...]}`. Without explicit terms, extraction covers technical vocabulary. No recognized requirements returns `matchScore: null`.
- `GET /jobs/{id}/snapshots` returns immutable submitted documents captured when a linked job transitions to Applied.
- `/library` supports list/create; `/library/{id}` supports read/update/delete.
- `GET /workspace/backup` exports all workspace collections, saved history and application snapshots.
- `POST /workspace/restore` validates a version-1 backup and restores it additively in one transaction, with fresh identifiers.

These routes are for a trusted local single-user installation. There is no multi-user ownership/authentication layer.


## Optional LLM review

- `GET /api/ai/settings`: public connection details and `hasApiKey`; never returns the secret.
- `PUT /api/ai/settings`: `enabled`, `provider` (`openai-compatible`, `ollama`, or `gemini`), `baseUrl`, `model`, optional `apiKey`, optional `clearApiKey`. A missing key preserves the current one only when endpoint and provider are unchanged.
- `POST /api/ai/test`: test saved connection using a small JSON generation, no resume payload.
- `POST /api/ai/review`: `{document, jobDescription?, language: "en" | "tr"}`. Returns explained 0–25 dimensions, normalized score, strengths, recommendations, questions, provider/model, and limitations. No persistence or document mutation.

Gemini defaults to `https://generativelanguage.googleapis.com/v1beta` when `baseUrl` is omitted. Enabled Gemini requires an API key and a model ID (optionally prefixed with `models/`); invalid settings return 422. Requests use native `models/{model}:generateContent`, an `x-goog-api-key` header, and JSON response mode. Blocked responses return `AI_RESPONSE_BLOCKED` (502); incomplete or malformed responses return `AI_INVALID_RESPONSE` (502).

Disabled or unconfigured AI returns 409. Provider/network/format errors return 502; timeouts return 504. Provider error bodies and credentials are not forwarded. Requests use a 90-second read timeout; the web proxy allows 120 seconds. Test and review calls can incur provider charges. Browser cancellation stops waiting but an already-running provider request may finish.


## Job-specific copies and actionable coaching

`POST /api/resumes/{id}/variants` accepts `{document, targetJob: {company?, position, description}}` and returns a new `ResumeDocument` (201). The document ID/revision must match the source (422/409 on mismatch). It copies the supplied draft, sets `metadata.parentResumeId`, `metadata.targetRole`, and `metadata.targetJob`, and leaves the source and job links unchanged. Target metadata is stored within document JSON, so existing databases need no additional table migration.

AI review recommendations can contain `edit: {documentId, target: {section, field, entryId, index}, before, after}` or null. Targets are resolved from a backend allowlist, never arbitrary model-provided object paths. Fields containing redacted personal-data patterns are excluded from actionable replacements. The UI compares current field text and stable entry IDs before applying. Non-actionable recommendations remain advice. Review job text accepts up to 21,000 characters, allowing a 20,000-character description plus role/company labels.
