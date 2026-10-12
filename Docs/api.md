# API reference

The generated OpenAPI specification at `/openapi.json` and interactive `/docs` are authoritative. Routes below are relative to `/api` unless the prefix is shown explicitly. API requests default to a 5 MB limit, configurable with `MAX_UPLOAD_SIZE_BYTES`; `/api/health` reports `maxUploadSizeBytes`.

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
- `POST /resumes/{id}/export?format=pdf|docx` accepts a draft and returns PDF or editable Word bytes; PDF is the default. DOCX pagination can differ from PDF.
- `POST /resumes/{id}/pdf-check` accepts a draft and reports checks from its actual PDF output.
- `POST /resumes/{id}/page-fit` suggests layout changes for a draft; the UI requires explicit application.
- `POST /resumes/{id}/export/anonymous/preview` accepts a draft and returns the anonymized document; `POST /resumes/{id}/export/anonymous/pdf` exports it as PDF. Inspect remaining narrative text for identifying details.
- `POST /resumes/compare-drafts` accepts `{source, target}` and compares two complete drafts.
- `POST /resumes/{id}/compare/{other_id}` compares content, visibility and design. Entries are matched by stable ID.

## Source and conversion

- `GET /resumes/{id}/source?format=json|yaml` retrieves lossless source.
- `POST /resumes/{id}/source/validate` accepts `{format, content}` and returns errors, warnings and normalized data.
- `PUT /resumes/{id}/source` accepts `{format, content, revision}` and persists validated JSON/YAML. The browser uses validation followed by draft application, leaving Save explicit.
- `POST /import/validate` and `/import/preview` accept `{content, format?}`. Markdown is a lossy import with warnings. Unknown JSON/YAML fields and unsupported schema versions are rejected.
- `POST /import/apply` creates a new document. `overwriteExistingId` is explicitly rejected.
- `POST /import/pdf` accepts a PDF upload, extracts text and returns analysis plus an editable import candidate. It does not save a CV automatically or preserve arbitrary source layouts.
- `GET /resumes/{id}/export?format=pdf|docx|html|json|yaml|markdown&download=true` exports a saved document. PDF returns `application/pdf`; HTML is a distinct format. DOCX is export-only.

## Jobs, library and backups

- `/jobs` supports list/create; `/jobs/{id}` supports read/update/delete. Explicit null `linkedResumeId` unlinks a document.
- `POST /jobs/{id}/match/{resume_id}` accepts optional `{requirements: ["term", ...]}`. Without explicit terms, extraction covers technical vocabulary. No recognized requirements returns `matchScore: null`.
- `GET /jobs/{id}/snapshots` returns immutable submitted documents captured when a linked job transitions to Applied.
- `POST /jobs/{id}/tailoring/{resume_id}` suggests existing visible experience/project bullets and reports requirements missing from the saved CV. No LLM call or new claims are involved.
- `POST /jobs/{id}/tailoring/{resume_id}/apply` accepts `{revision, jobUpdatedAt, selected}` using suggestion IDs. It creates a new CV copy with selected bullets/entries promoted, preserving all text and the original. A stale CV revision or changed job returns 409; invalid selection returns 422. Job links are unchanged.
- `POST /jobs/{id}/cover-letter` accepts `{resumeId, language, useAI}` and generates a local or optional AI letter draft.
- `POST /jobs/{id}/package` downloads a ZIP with the linked saved CV PDF and saved cover letter. It does not submit the application.
- `/library` supports list/create; `/library/{id}` supports read/update/delete.
- `GET /workspace/backup` exports all workspace collections, saved history and application snapshots.
- `POST /workspace/restore` accepts backup versions 1 and 2 and restores additively in one transaction, with fresh identifiers. Exports use v2 with timestamps and timeline fields.
- `POST /workspace/backup/encrypted` accepts `{password}` (12-1024 characters) and returns an authenticated encrypted backup envelope. An envelope too large to restore under the configured request limit returns 413.
- `POST /workspace/restore/encrypted` accepts `{password, envelope}` and restores decrypted backup data through the same additive restore. Wrong passwords or damaged ciphertext return 422. Passwords are not persisted; AI settings/keys are excluded from both backup forms.

These routes are for a trusted local single-user installation. There is no multi-user ownership/authentication layer.


## Optional LLM review

- `POST /api/ai/translate`: `{document, targetLanguage: "en" | "tr"}`. Returns a translation preview with individual changes; the original stays unchanged. Review before applying to the draft or creating a copy.
- `GET /api/ai/settings`: public connection details and `hasApiKey`; never returns the secret.
- `PUT /api/ai/settings`: `enabled`, `provider` (`openai-compatible`, `ollama`, or `gemini`), `baseUrl`, `model`, optional `apiKey`, optional `clearApiKey`. A missing key preserves the current one only when endpoint and provider are unchanged.
- `POST /api/ai/test`: test saved connection using a small JSON generation, no resume payload.
- `POST /api/ai/review`: `{document, jobDescription?, language: "en" | "tr"}`. Returns explained 0-25 dimensions, normalized score, strengths, recommendations, questions, provider/model, and limitations. No persistence or document mutation.

- `POST /api/ai/missing-facts`: `{document, answers: [{question, answer}], jobDescription?, language}`. Explicitly generates suggestions from user-supplied answers, with allowlisted field targets and no automatic mutation.
- `POST /api/ai/reviews`: `{document, jobDescription?, language, result}`. Records a bounded snapshot of an existing CV and its review; the web records successful editor and quick reviews separately from the AI request.
- `GET /api/ai/reviews?resumeId=...&jobDescription=...&language=en` lists up to 30 reviews by default, newest first, scoped to the exact target text and feedback language. `GET /api/ai/reviews/{id}` reads a saved review. History is included in additive workspace backup/restore; permanent CV deletion removes associated history.

Saved AI credentials use authenticated encryption with a separate local key.
Docker keeps that key in `ai_secrets`, separate from the `ai_settings` volume.
Legacy plaintext settings migrate on first read. An unavailable/invalid key or
undecryptable credential returns 503; restore the key or reconfigure the connection.

Gemini defaults to `https://generativelanguage.googleapis.com/v1beta` when `baseUrl` is omitted. Enabled Gemini requires an API key and a model ID (optionally prefixed with `models/`); invalid settings return 422. Requests use native `models/{model}:generateContent`, an `x-goog-api-key` header, and JSON response mode. Blocked responses return `AI_RESPONSE_BLOCKED` (502); incomplete or malformed responses return `AI_INVALID_RESPONSE` (502).

Disabled or unconfigured AI returns 409. Provider/network/format errors return 502; timeouts return 504. Provider error bodies and credentials are not forwarded. Requests use a 90-second read timeout; the web proxy allows 120 seconds. Test and review calls can incur provider charges. Browser cancellation stops waiting but an already-running provider request may finish.


## Job-specific copies and actionable coaching

`POST /api/resumes/{id}/variants` accepts `{document, targetJob: {company?, position, description}}` and returns a new `ResumeDocument` (201). The document ID/revision must match the source (422/409 on mismatch). It copies the supplied draft, sets `metadata.parentResumeId`, `metadata.targetRole`, and `metadata.targetJob`, and leaves the source and job links unchanged. Target metadata is stored within document JSON, so existing databases need no additional table migration.

AI review recommendations can contain `edit: {documentId, target: {section, field, entryId, index}, before, after}` or null. Targets are resolved from a backend allowlist, never arbitrary model-provided object paths. Fields containing redacted personal-data patterns are excluded from actionable replacements. The UI compares current field text and stable entry IDs before applying. Non-actionable recommendations remain advice. Review job text accepts up to 21,000 characters, allowing a 20,000-character description plus role/company labels.


## CV family and variant propagation

- `GET /api/resumes/{id}/family` reads saved source/related CVs, returning explicit source changes and factual differences across shared entry IDs. Different-language titles are excluded from consistency findings.
- `POST /api/resumes/{id}/family/apply` accepts `{sourceRevision, choices: [{targetId, targetRevision, changeId}], overwriteCustomized?}`. Change IDs are recomputed server-side. Applying is atomic, preserves source/variant job settings and prior revisions, and returns 409 for changed revisions. Customized fields require explicit overwrite permission.
- Source snapshots from copy creation plus per-ancestor partial-sync baselines protect tailored wording across descendant CVs. Old copies use available historical source snapshots conservatively. Unknown provenance disables automatic propagation.
- Workspace backups include optional `parentBases` and `ancestorBases`. Restore remaps source IDs; old backups remain valid. Deleting a source detaches its children and clears its saved propagation baselines.
- Application-authored analysis findings and suggestions follow the web interface language; CV content and AI feedback retain their explicitly selected languages.
