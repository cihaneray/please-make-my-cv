# please-make-my-cv

A single-user, local CV workspace with a Next.js 16 / React 19 interface and a Python 3.12+ FastAPI API. SQLite is the default; Docker Compose uses PostgreSQL.

## Start locally

In `apps/api`:

```sh
uv sync --frozen
uv run playwright install chromium
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In `apps/web`:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The frontend proxies `/api` to the local API. Set `API_INTERNAL_URL` before building to change that destination. `NEXT_PUBLIC_API_URL` is an optional build-time override; ordinarily leave it unset.

Database migrations run at API startup. Existing databases are adopted without deleting records. Demo data is **off by default**; set `SEED_DEMO=true` explicitly to seed an empty workspace. The root Python project only contains repository metadata; install API dependencies from `apps/api`.

## Docker

Copy `.env.example` to `.env` and replace its password. Then run:

```sh
docker compose up --build --wait
```

All published services bind to `127.0.0.1`. This is a local, single-user application, **not an authenticated multi-user hosting service**. Do not expose these ports publicly without a separately configured authentication boundary. Compose includes health checks, the PostgreSQL driver, browser dependencies, and locked dependency installation.

## Editing and data safety

- Visual forms, JSON/YAML source, analysis, and exports use the current draft.
- Source **Apply to draft** does not save. Save Draft persists the document.
- Pending source edits block tab switching and saving until applied. Source format changes are disabled while edits are pending.
- Local recovery stores visual and source drafts on the current browser/device. It can fail if browser storage is unavailable. Keep backups.
- Concurrent writes use an atomic revision check. A conflict preserves the draft; export JSON before reloading and comparing.
- Previous saved versions are retained. **All fields, history, library and backups** provides revision loading, complete field editing, reordering, and library insertion. Saving a restored draft creates a new revision.
- Archived resumes can be restored from Resumes.

## Formats and printing

| Format | Status |
| --- | --- |
| JSON / YAML | Lossless document import/export and source editing; unknown fields and unsupported schema versions are rejected instead of silently discarded |
| Markdown | Human-readable export and **lossy import**; review all imported fields. Not supported as replacement source editing |
| HTML | Escaped, print-ready HTML with restricted styling and no script execution |
| PDF | Actual Chromium-generated PDF with selectable text and A4 pagination |

The editor's live content preview and PDF use the same backend HTML renderer. **Exact PDF pages** shows final pagination using the browser PDF viewer. The template gallery provides illustrative template previews. PDF generation requires the installed Playwright Chromium browser. Fonts use local system fallbacks; no remote font requests are required.

## Jobs and editorial assistance

Job matching is explicit keyword overlap, not a hiring prediction. Automatic extraction focuses on technology vocabulary. Unrecognized descriptions are **not assessed**. Use the job's editable requirements list to compare terms from any occupation. Transitioning a linked job to Applied stores a submitted resume snapshot; subsequent resume edits do not change it.

Editorial assistance normalizes whitespace and punctuation and redacts selected personal-data patterns. It does not add achievements, claim verified facts, or call an external model. Review suggestions before applying them. ATS/content results are internal heuristics, not external ATS certification, legal compliance certification, or language-proofreading guarantees.

## Backups

Settings provides workspace backup and additive restore, including resumes, jobs, library entries, saved revisions, and submitted snapshots. Restore creates new IDs and preserves existing records. Keep downloaded backups private: they contain personal data. HTTP requests are limited to 5 MB. For larger workspaces, stop the API and back up SQLite using its backup tools, or use PostgreSQL backup tooling; do not copy a live database without accounting for its transaction files.

## Verification

```sh
# apps/api
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run python scripts/generate_types.py --check

# apps/web
npm run lint
npm run build
npx playwright install chromium
npm test
```

Browser tests build production assets and run isolated services on ports 3101 and 8101, using `apps/api/e2e.db`, not the normal workspace database. Backend tests disable normal startup initialization and use isolated databases. Frontend response types are generated from Pydantic schemas: after schema changes run `uv run python scripts/generate_types.py` from `apps/api`.

GitHub Actions checks lint, generated contracts, tests, production-browser workflows, and Docker startup. See [implementation notes](Docs/remediation-report.md) for changes and remaining boundaries.


## LLM resume reviews

Open **Settings → LLM connection**. Choose **OpenAI-compatible** (base URL ending in `/v1`, model ID, and API key if required) or **Ollama** (`http://localhost:11434`, with an already downloaded model). Enable AI, save, then use **Test saved connection**. The test makes a small model request without resume content and may incur a provider charge.

Open a resume, select **Review**, and click **Review current draft with AI**. Optionally add a target job and choose English/Turkish feedback. The report explains clarity, evidence, completeness, and job relevance scores, gives prioritized recommendations and factual follow-up questions, and never edits the resume automatically. Scores are subjective editorial estimates, not ATS or hiring predictions. Without a job, relevance is excluded. Feedback is marked outdated after input changes.

The connection supports JSON-mode Chat Completions as documented by [OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs) and [Ollama](https://docs.ollama.com/api/openai-compatibility). The selected model must support JSON output. No real provider is enabled automatically. Basic summary/bullet cleanup remains local.

Credentials are stored only on the API host in `data/ai-settings.json` (override `AI_CONFIG_PATH`), excluded from backups and source control. Protect this file: it is not encrypted by the application. For Docker, settings persist in the `ai_settings` volume; host Ollama is reachable using `http://host.docker.internal:11434` if Ollama accepts the connection. Remote APIs require HTTPS. These settings endpoints are for the local single-user deployment only.

## PDF browser troubleshooting

From `apps/api`, run `uv run playwright install chromium`, then `uv run python scripts/check_pdf.py`. The diagnostic generates a real PDF. The renderer tries bundled Chromium, then installed Edge and Chrome. To choose a browser explicitly, set `PDF_BROWSER_CHANNEL=msedge` or `chrome`, or `PDF_BROWSER_EXECUTABLE` to its executable path in the API environment, and restart the API. Explicit overrides do not fall back silently. Linux deployments can install browser system dependencies with `uv run playwright install --with-deps chromium`.

Browser-start failures and document-rendering failures now have separate messages. No downloads happen during an export request.


## Appearance

Choose **Settings → Interface Aesthetic → Color theme** to use Light, Dark, or System. System follows the device appearance. The preference is saved in this browser and synchronized between open tabs. Resume previews, template paper, and exported PDFs retain a white print background.


## Apply coaching and create job-specific copies

In a resume's **Review** tab, run an AI review. Suggestions with a verified field target show **Before** and **After**, **Apply suggestion**, **Skip suggestion**, and **Undo this suggestion**. Applying updates only the draft; **Save Draft** persists it as a new revision. Summary text, experience summaries/bullets, and project bullets support direct replacement. Other advice stays manual. If a targeted field changed after review, Apply is disabled to preserve your edits. A changed draft also marks the score outdated. Model wording still requires your factual review.

Expand **Job-specific resume copy**, choose a saved job or enter its company/role and description, then click **Create job-specific copy**. This saves a new copy of the current draft without saving over the original, with parent lineage and a snapshot of the target job. Open the copy to get job-specific coaching and accept changes individually. Job tracker links stay unchanged; link the copy from Target Jobs when ready. Creating a copy does not need an LLM connection.
