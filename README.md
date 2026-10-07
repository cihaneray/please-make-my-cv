# please-make-my-cv

A single-user, local CV workspace with a Next.js 16 / React 19 interface and a Python 3.12+ FastAPI API. SQLite is the default; Docker Compose uses PostgreSQL.

Create and maintain English or Turkish CVs, reuse career content, tailor copies
for job applications, review changes, and export selectable-text PDFs or editable Word documents. The
workspace runs locally; external AI reviews are optional and require a saved
provider connection.

## Recommended setup

Use the [Docker Compose development setup](#docker-development).
It installs Python, Node.js, and PDF browser dependencies in containers and
persists workspace data across restarts.

## Typical workflow

1. Create a resume or import JSON/YAML; review Markdown imports because they
   cannot preserve every field.
2. Edit the current draft in the visual editor or source view. Choose its
   language, target market, and template, then **Save Draft** to create a revision.
   On mobile, switch between **Edit content** and **Preview**.
3. Add a target job and edit its requirements. Inspect matching CV evidence,
   create a job-specific copy, and compare it with the original or a saved revision.
4. Review local analysis or configure an optional AI connection for editorial
   feedback. Review and apply individual suggestions before saving.
5. Run **Check PDF output**, inspect **Exact PDF pages**, and export the CV.
6. Link the appropriate CV to a job and track application status. Moving the job
   to Applied preserves a submitted copy; later CV edits leave that copy intact.
7. Reuse content through the Career Library and download workspace backups
   from Settings.

## Editing and application tools

- The document-first studio uses a compact navigation rail, a desk with real
  CV covers, and a live document beside a collapsible editing panel. Select a
  section on the page (or use keyboard navigation) to open its fields.
- In **Design**, reorder sections with drag handles or up/down buttons; the live
  preview and exported PDF follow the saved order. Profile stays first. Reorder
  entries and bullet lists in their content editors with the same controls.
- Undo/redo tracks up to 100 draft changes and groups consecutive typing in a
  field. Use **Ctrl+Z**, **Ctrl+Shift+Z** or the toolbar; source view keeps its
  own text editing behavior. Deleted entries can be recovered before saving.
- **Ctrl+K** opens CV content search and quick actions. Search results open the
  matching section and focus the matching field when available.
- **Design → Page length assistant** measures the current draft and alternative
  layouts using real PDFs for a one-, two- or three-page target. Apply a proposal
  explicitly; stale proposals cannot replace newer edits. Text is preserved;
  manual content review may still be needed to reach the target.
- Certifications, languages and custom sections use the same visual entry cards
  as the rest of the editor, including nested item/bullet editing and ordering.
- **Ready to apply** checks the linked saved CV for missing name, email, headline
  and common draft placeholders, then checks its actual PDF layout. Findings
  link back to relevant editing areas. Checks are advisory and show the checked
  revision; rerun after CV edits.
- **Application package** downloads a company/position-named ZIP containing
  `cv.pdf` and UTF-8 `cover-letter.txt` from saved records. Link a CV and save a
  cover letter first. Unsaved job edits must be saved before checking or export.
  Downloading never submits an application or creates a submitted snapshot.
- **Target Jobs** uses an application dossier: select a job in the compact list,
  then move between **Overview**, **Job details** and **Documents** with the
  sliding tab indicator or keyboard arrows. Notes, requirements and letter drafts
  survive tab and job changes. Documents shows the linked CV's actual preview
  and dated submitted snapshots; the overview keeps matching evidence and dates
  together. Evidence cards preview relevant CV text, highlight matched terms,
  remember expanded sources for the browser session and link to exact CV entries.
- Job tools store interview dates, follow-up dates, notes and editable cover
  letters. The agenda shows the next 14 days and overdue dates until updated;
  it does not send notifications. Local letter drafts quote visible saved CV
  evidence. Optional AI uses the configured provider with contact fields removed;
  review generated wording and claims before sending. Letters can be downloaded
  as plain text and are saved with the job.
- **Focus on document** hides editing tools without discarding the draft.
  Mobile **Edit content / Preview** works across content, design, review, and
  source modes. Unapplied source changes block mode switches and exports.
- History, complete field editing, and revision comparisons open in dismissible
  panels. Use **Close panel** or Escape to return to the document.
- Content includes certifications, languages, and custom sections. Experience
  and education have separate start/end dates and a Present toggle.
- **Compare revisions and variants** shows field-level differences between a
  previous revision or another resume and the current draft, without saving it.
- **Check PDF output** renders the current draft and checks the actual page
  count, empty/sparse pages, orphan headings, small fonts, and horizontal layout
  overflow. Checks are advisory; inspect **Exact PDF pages** before sending.
- Job matches include supporting CV text with links to the relevant section.
  Hidden sections are excluded. Application status transitions appear in the
  job's timeline; older applications have no invented historical transitions.
- Unsaved job edits survive status changes and are stored in the current
  browser until saved. Saving edits does not revert the application status.
- The library's **ATS heuristic average** is computed from all active saved
  resumes, with the number of resumes shown. It is not an external ATS score
  or a job-specific match. Categories, tags and optional tone variants can be
  edited; variants are not fabricated automatically.
- Workspace backup v2 preserves timestamps and job timelines. Restore still
  accepts v1 backups; missing historical timestamps use document timestamps.
  Restores add new records, and submitted CV copies remain immutable.

## Start locally

For this alternative to Docker, run both services in the same environment
(for example, WSL) with Python 3.12+, uv, and Node.js/npm installed. On Linux,
install Chromium system dependencies with
`uv run playwright install --with-deps chromium` instead of the browser-only
installation below.

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

### Docker development

Use Docker with Linux containers and Docker Compose 2.17 or newer.
Python, Node.js, and npm are installed inside the containers.
Run these commands from the repository root:

```sh
# First setup only; preserve an existing .env.
cp .env.example .env
# Replace POSTGRES_PASSWORD with a long alphanumeric password.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --wait --wait-timeout 240
```

Open http://localhost:3000. Python and Node dependencies are installed inside
the images, Chromium and its Linux libraries are included, and database/AI
settings persist in named volumes. The development overlay mounts source
directories, enables polling for source file changes, and keeps Next.js cache
in a Linux volume. Web development uses Webpack for reliable polling.
Rebuild after dependency or Dockerfile changes; restart the API after migration
changes. Regular application source edits reload automatically.

Container images omit package download caches. The API installs only Chromium's
headless shell, which supports PDF exports and the headless browser tests.
Production web images use Next.js standalone output; development images retain
the tools needed for editing and rebuilding. Docker build caches can still grow
outside the images and can be removed when builds are not running.

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

`down` keeps saved data. Avoid `down --volumes` unless you intend to erase the
database and saved AI settings. Development and production Compose use the same
data volumes; stop one before starting the other. The password is embedded in
the database URL, so this setup expects an alphanumeric password. Changing the
file does not change a password already initialized in PostgreSQL.

Run the full isolated Python 3.12 and frontend browser suite through Docker:

```sh
docker compose -f docker-compose.test.yml run --build --rm test
```

This uses disposable SQLite databases inside the test container and does not
connect to the workspace PostgreSQL volume. It checks lint, migrations,
generated contracts, PDF generation, and production-build browser workflows.

### Moving an existing SQLite workspace

1. Start the updated API against your original SQLite file and download
   **Settings → workspace backup**. Use an absolute `DATABASE_URL` if the file
   is outside `apps/api`; relative database paths depend on the working directory.
2. Stop that instance, start Docker Compose, and restore the backup from Settings.
   Restore is additive and assigns new IDs. Import only once to avoid duplicates.
3. Check resumes, history, jobs, library, and submitted copies before retiring
   the old database. AI credentials are excluded: configure them again in Settings.

For Docker-only access to an old database, stop other processes using the file,
then run the updated API image on port 8001 with a separate SQLite mount:

```powershell
docker compose build api
docker compose run --rm --no-deps -p 127.0.0.1:8001:8000 -v "D:/path/to/old-api:/legacy" -e DATABASE_URL=sqlite:////legacy/cv_workspace.db -e AI_CONFIG_PATH=/tmp/legacy-ai-settings.json api
```

In another terminal, download the portable backup:

```powershell
Invoke-WebRequest http://127.0.0.1:8001/api/workspace/backup -OutFile workspace-backup.json
```

Use a copy made while the original API is stopped if you want to preserve the
original file untouched: API startup applies migrations. The backup can contain
personal data. Older orphan submitted copies are preserved in backups under
archived placeholder jobs. Permanently deleting a job now deletes its submitted
copies in the same transaction; archive the job to retain them.

### Production-style local run

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
- Permanently deleting a resume clears live job links and detaches its derived
  copies. Submitted snapshots remain available through their jobs. Permanently
  deleting a job also deletes its submitted copies; archive it to retain them.

## Formats and printing

| Format | Status |
| --- | --- |
| JSON / YAML | Lossless document import/export and source editing; unknown fields and unsupported schema versions are rejected instead of silently discarded |
| Markdown | Human-readable export and **lossy import**; review all imported fields. Not supported as replacement source editing |
| HTML | Escaped, print-ready HTML with restricted styling and no script execution |
| PDF | Actual Chromium-generated PDF with selectable text and A4 pagination |
| DOCX | Editable Word export of the current draft with visible sections, section order, links and native bullets; DOCX import is not supported |

The editor's live content preview and PDF use the same backend HTML renderer. **Exact PDF pages** shows final pagination using the browser PDF viewer. The template gallery provides illustrative template previews. PDF generation requires the installed Playwright Chromium browser. Fonts use local system fallbacks; no remote font requests are required.

## Jobs and editorial assistance

Job matching is explicit keyword overlap, not a hiring prediction. Automatic extraction focuses on technology vocabulary. Unrecognized descriptions are **not assessed**. Use the job's editable requirements list to compare terms from any occupation. Transitioning a linked job to Applied stores a submitted resume snapshot; subsequent resume edits do not change it.

Editorial assistance normalizes whitespace and punctuation and redacts selected personal-data patterns. It does not add achievements, claim verified facts, or call an external model. Review suggestions before applying them. ATS/content results are internal heuristics, not external ATS certification, legal compliance certification, or language-proofreading guarantees.

## Backups

Settings provides workspace backup and additive restore, including resumes, jobs, library entries, saved revisions, and submitted snapshots. Backup v2 also preserves timestamps and application timelines; v1 remains accepted. Restore creates new IDs and preserves existing records, so restoring the same backup twice creates duplicates. AI credentials and browser-local unsaved drafts are excluded; save drafts before downloading a backup. Keep downloaded backups private: they contain personal data. HTTP requests are limited to 5 MB. For larger workspaces, stop the API and back up SQLite using its backup tools, or use PostgreSQL backup tooling; do not copy a live database without accounting for its transaction files.

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

Include `[SKIP]` in the latest commit message to skip CI verification jobs on
push and pull request events. On pull requests, a lightweight job reads the
head commit message first. GitHub may still show a skipped workflow run;
use its native `[skip ci]` marker to prevent the workflow run entirely.


## LLM resume reviews

Open **Settings → LLM connection**. Choose **OpenAI-compatible** (base URL ending in `/v1`, model ID, and API key if required), **Google Gemini** (Gemini Developer API key and model ID from [Google AI Studio](https://aistudio.google.com/)), or **Ollama** (`http://localhost:11434`, with an already downloaded model). Enable AI, save, then use **Test saved connection**. The test makes a small model request without resume content and may incur a provider charge.

Open a resume, select **Review**, and click **Review current draft with AI**. Optionally add a target job and choose English/Turkish feedback. The report explains clarity, evidence, completeness, and job relevance scores, gives prioritized recommendations and factual follow-up questions, and never edits the resume automatically. Scores are subjective editorial estimates, not ATS or hiring predictions. Without a job, relevance is excluded. Feedback is marked outdated after input changes.

Gemini uses the native [generateContent API](https://ai.google.dev/api/generate-content), with the default base URL `https://generativelanguage.googleapis.com/v1beta`. Enter a model ID available to your account, optionally prefixed with `models/`. An API key is required when enabling Gemini. Blocked, incomplete, or invalid JSON responses display an error without applying suggestions.

OpenAI-compatible and Ollama connections support JSON-mode Chat Completions as documented by [OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs) and [Ollama](https://docs.ollama.com/api/openai-compatibility). The selected model must support JSON output. No real provider is enabled automatically. Basic summary/bullet cleanup remains local.

Credentials are stored only on the API host in `data/ai-settings.json` (override `AI_CONFIG_PATH`), excluded from backups and source control. Protect this file: it is not encrypted by the application. For Docker, settings persist in the `ai_settings` volume; host Ollama is reachable using `http://host.docker.internal:11434` if Ollama accepts the connection. Remote APIs require HTTPS. These settings endpoints are for the local single-user deployment only.

## PDF browser troubleshooting

From `apps/api`, run `uv run playwright install chromium`, then `uv run python scripts/check_pdf.py`. The diagnostic generates a real PDF. The renderer tries bundled Chromium, then installed Edge and Chrome. To choose a browser explicitly, set `PDF_BROWSER_CHANNEL=msedge` or `chrome`, or `PDF_BROWSER_EXECUTABLE` to its executable path in the API environment, and restart the API. Explicit overrides do not fall back silently. Linux deployments can install browser system dependencies with `uv run playwright install --with-deps chromium`.

Browser-start failures and document-rendering failures now have separate messages. No downloads happen during an export request.


## Appearance

Choose **Settings → Interface Aesthetic → Color theme** to use Light, Dark, or System. System follows the device appearance. The preference is saved in this browser and synchronized between open tabs. Dark mode uses warm charcoal surfaces and restrained orange accents for actions, selection and keyboard focus. Resume previews, template paper, and exported PDFs retain a white print background.


## Apply coaching and create job-specific copies

In a resume's **Review** tab, run an AI review. Suggestions with a verified field target show **Before** and **After**, **Apply suggestion**, **Skip suggestion**, and **Undo this suggestion**. Applying updates only the draft; **Save Draft** persists it as a new revision. Summary text, experience summaries/bullets, and project bullets support direct replacement. Other advice stays manual. If a targeted field changed after review, Apply is disabled to preserve your edits. A changed draft also marks the score outdated. Model wording still requires your factual review.

Expand **Job-specific resume copy**, choose a saved job or enter its company/role and description, then click **Create job-specific copy**. This saves a new copy of the current draft without saving over the original, with parent lineage and a snapshot of the target job. Open the copy to get job-specific coaching and accept changes individually. Job tracker links stay unchanged; link the copy from Target Jobs when ready. Creating a copy does not need an LLM connection.

### Word export

Use **Download → Word (.docx)** in the CV editor to download an editable Word document from the current form draft. DOCX preserves visible sections, their order, links, dates, and native editable bullet lists in the selected template’s A4 layout, including its typography, accent color, section rules and date alignment. PDF remains the option for preserving the designed print layout; Word pagination can differ between applications. DOCX import is not supported.
