<p align="center">
  <img src="apps/web/src/app/icon.svg" alt="please-make-my-cv logo" width="88" height="88" />
</p>

# please-make-my-cv

A local, single-user workspace for creating, reviewing and tailoring English or Turkish CVs. Built with Next.js, React and FastAPI. Docker Compose provides PostgreSQL, the API, the web interface and the browser used to render PDFs.

## Run with Docker

Install Docker with Linux containers and Docker Compose 2.17 or newer. From the repository root:

```sh
# First setup only: keep your existing .env when upgrading.
cp .env.example .env
```

Set **different passwords** for `POSTGRES_PASSWORD` and `CV_DB_PASSWORD` in `.env`, then start:

```sh
docker compose up --build --wait
```

Open [localhost:3000](http://localhost:3000). Python, Node.js and Chromium are installed inside the containers. Web and API ports bind to loopback; PostgreSQL is not published by default. Demo data is off unless `SEED_DEMO=true`.

```sh
docker compose logs -f api web
docker compose down
```

`down` preserves data. **`down --volumes` deletes the database and saved AI settings/keys.** Back up before updating or cleaning volumes.

### Development

Use the source-mounted development overlay for automatic reloads:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --wait --wait-timeout 240
```

Stop the normal runtime before starting development: both use the same ports and data volumes. Rebuild after dependency or Dockerfile changes; restart the API after migration changes. Development uses polling and a Linux volume for the Next.js cache.

### What the containers do

| Service | Purpose |
| --- | --- |
| `web` | Next.js interface and server-side API proxy |
| `api` | FastAPI, document processing and Chromium PDF rendering |
| `db` | Persistent PostgreSQL database |
| `db-init` | One-time startup setup of the restricted `cv_app` database role and table ownership |
| `volume-init` | One-time startup repair of permissions for persistent AI settings/key volumes |

The setup services exit successfully after completing their work. Web/API run as non-root UID 10001 with dropped capabilities. Production API images omit development dependencies; web images use Next.js standalone output. PDF rendering stays in the API container.

Changing `CV_DB_PASSWORD` takes effect when `db-init` runs again. Changing `POSTGRES_PASSWORD` in `.env` does not change the administrator password in an existing database.

For local database tools, explicitly enable the loopback-only PostgreSQL port:

```sh
docker compose -f docker-compose.yml -f docker-compose.tools.yml up -d
```

## What you can do

- **Create or import CVs:** JSON/YAML imports preserve the supported document schema. PDF import extracts text, assesses it and prepares an editable draft; review the result because it does not reproduce arbitrary PDF layouts. Markdown import is also best effort.
- **Edit and organize:** edit content or JSON/YAML source, reorder sections and entries, add an optional profile photo, and collapse experience, education, project and skill-group cards. Save Draft creates a revision. Archive CVs and restore or permanently delete them from Deleted documents.
- **Navigate the studio:** use content search (`Ctrl+K`), undo/redo, section navigation and the responsive editing/preview modes. Recovery drafts are validated, saved with a debounce and kept separately per browser tab.
- **Review versions:** compare the current draft with a saved revision or another CV. The comparison groups available documents and shows field-level additions, removals and changes. A save conflict offers comparison and preservation of the local draft as another CV.
- **Check layout:** live preview uses the same HTML renderer as PDF export, with page boundaries and a page count. Exact PDF pages shows the rendered PDF. PDF output checks and the page-length assistant measure actual rendered pages; applying a layout proposal preserves text.
- **Inspect a reading map:** the optional **Reading map · ESTIMATE** overlay shows section positions and relative text density. It is a layout heuristic, not eye tracking, an ATS score or a hiring prediction, and is excluded from exports.
- **Use the Career Library:** save reusable achievements with categories, tags and tone variants, then build a CV from selected content.
- **Track target jobs:** save roles, requirements, notes, interview/follow-up dates and linked CVs. Matching evidence links to relevant CV entries. Moving a linked job to Applied preserves a submitted copy independently of later CV edits.
- **Tailor applications:** select existing evidence to prioritize bullets in a new job-specific CV. Missing skills are reported rather than invented. Prepare editable cover letters and application emails; download a ZIP containing the saved CV PDF and cover letter. These tools do not send or submit applications.
- **Review with AI:** inspect priority suggestions, filter pending/applied/skipped items, edit suggested wording before applying, and jump to the related CV field. Answer missing-detail questions to explicitly generate additional proposals. Applying changes only the draft; Save Draft persists them. Changed fields disable stale suggestions. Local analysis remains available without AI.
- **Keep CV variants consistent:** open CV Family in the studio toolbar to review date, title and institution differences, then copy selected source changes into related variants. Tailored and translated fields are protected by default. Source baselines survive workspace backup/restore; updates keep prior revisions and stop on conflicting edits.
- **Track review history:** saved reviews retain the reviewed CV snapshot, revision, model and feedback. Compare dimensions for the same CV, target text and feedback language. Reviews are included in workspace backups; permanent CV deletion removes its history.
- **Check before sharing:** the editor's sharing check scans the current draft for malformed/unsafe links, likely placeholder text and visible contact/photo information. It runs locally and does not check remote link availability or block exports.
- **Translate and share:** preview AI-assisted English/Turkish translations before applying or creating a copy. Anonymous PDF export removes direct profile identifiers; inspect remaining narrative content before sharing.

Language and target market are separate settings: a Turkish-market CV can be written in English. Local ATS/content scores are transparent internal heuristics, not external ATS certification. Job relevance is assessed against explicit requirements; descriptions without recognized requirements are not assessed.

## Import and export

| Format | Support |
| --- | --- |
| JSON / YAML | Document import/export and validated source editing; unknown fields and unsupported versions are rejected |
| Markdown | Human-readable export and lossy import; no replacement source editing |
| PDF | Text extraction and editable import draft; Chromium-generated export with selectable text and A4 pagination |
| DOCX | Editable Word export with visible sections, ordering, links, dates and native bullets; no DOCX import |
| HTML | Escaped print-ready export with restricted styling |

Use **Download → PDF** or **Word (.docx)** in the editor. PDF preserves the print layout; Word pagination may differ between applications. Review imported data and generated wording before use. Unapplied source changes must be applied or discarded before export.

## AI connection

In **Settings → LLM connection**, choose a provider, enter a model ID available to your account, save and test the connection:

| Provider | Connection |
| --- | --- |
| Google Gemini | Gemini Developer API key; default base URL `https://generativelanguage.googleapis.com/v1beta` |
| OpenAI-compatible | HTTPS base URL ending in `/v1`, model ID and API key when required; model must support JSON output |
| Ollama | Local endpoint such as `http://localhost:11434` with an already installed model |

Inside Docker, host Ollama can use `http://host.docker.internal:11434` if it accepts connections. Google and OpenAI hosts are allowed by default. Add a trusted custom public provider through `LLM_ALLOWED_HOSTS` in the API configuration. Remote requests validate DNS, pin an approved IP, retain TLS hostname verification and reject redirects/private destinations.

AI runs only on request and transmits career content to the configured provider with direct profile contact fields omitted. Pattern redaction is incomplete; review what you send. Connection tests and reviews can incur provider charges. Invalid, blocked, incomplete or rate-limited responses report an error without applying suggestions.

Credentials are encrypted with Fernet in `ai_settings`; the local key is stored separately in `ai_secrets`. Neither is included in workspace backups. Protect both volumes: encryption does not protect against an administrator who can read the settings and key. See [SECURITY.md](SECURITY.md).

## Backups and upgrades

**Settings → workspace backup** exports CVs, jobs, library entries, revision history and submitted copies. Enter a password of at least 12 characters to encrypt the backup; losing it makes that backup unrecoverable. Browser-local unsaved drafts and AI credentials are excluded, so save drafts first.

Restore is additive: it creates fresh IDs and preserves existing records. Repeating a restore creates duplicates; the browser warns when it recognizes a repeated backup. Backup v2 preserves timestamps/job timelines, and v1 is still accepted. Requests are limited to 5 MB by default; oversized backups are rejected before download if they would exceed the restore limit.

Keep backups private. For larger workspaces, use PostgreSQL backup tools, or SQLite's backup tools with the API stopped. Do not copy a live database without accounting for its transaction files.

To move an existing SQLite workspace to Docker, start the API against the original database, download a workspace backup, stop that instance and restore into Docker. Check the restored content before retiring the original. Configure AI credentials again.

## Appearance

Choose **Settings → Interface and Theme** for Light, Dark or System. The preference is stored in the browser and synchronized across tabs. Dark mode uses charcoal surfaces and orange accents; CV previews and exported PDFs keep a white print background. Interface languages are English and Turkish.

## Local access and data safety

The application is intended for a trusted local machine and one user. It is not a multi-user hosting service. Host headers and browser write origins are restricted. Optionally set a long random `API_TOKEN` in `.env` and recreate web/API; the web forwards it server-side, and direct API clients must send `Authorization: Bearer …`. Health checks remain unauthenticated.

Document saves use revision checks. Startup applies database migrations without deleting records. PDF imports run in bounded child processes with file/page limits, a timeout and Linux memory/CPU limits; `PDF_IMPORT_WORKERS` defaults to two per API worker. Native Windows has no Job Object resource limit; Docker is recommended.

Database volumes, downloaded documents and browser recovery drafts contain personal data. Local storage is not encryption. Protect the machine and its backups.

## Run without Docker

Install Python 3.12+, uv and Node.js/npm. Run both services in the same environment.

```sh
# From apps/api
uv sync --frozen
uv run playwright install chromium
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

# From apps/web, in another terminal
npm ci
npm run dev
```

On Linux, use `uv run playwright install --with-deps chromium` to install browser system dependencies. Install Python dependencies from **apps/api**, not the repository root.

The frontend proxies `/api` to the API. `API_INTERNAL_URL` sets the server-side destination before building; ordinarily leave `NEXT_PUBLIC_API_URL` unset. See the API's [.env.example](apps/api/.env.example) for standalone configuration.

If PDF rendering fails, run `uv run python scripts/check_pdf.py` from `apps/api`. To use a specific installed browser, set `PDF_BROWSER_CHANNEL=msedge` or `chrome`, or `PDF_BROWSER_EXECUTABLE`, then restart the API. No browser downloads occur during export requests.

## Verification and development references

Run the isolated API/frontend suite through Docker:

```sh
docker compose -f docker-compose.test.yml run --build --rm test
```

The suite uses disposable SQLite databases and does not connect to the workspace PostgreSQL volume. It checks lint, API tests, generated contracts and production-build browser workflows.

For local checks:

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

Frontend types are generated from Pydantic models; regenerate them after schema changes. GitHub Actions also verifies Docker startup. A latest commit message containing `[SKIP]` skips verification jobs; pull requests still run the lightweight commit-policy check. No release is created by an ordinary commit.

- [Architecture](Docs/architecture.md)
- [API reference](Docs/api.md) and generated `/docs` / `/openapi.json`
- [Security boundary](SECURITY.md)
- [Change history](CHANGELOG.md)

## Releases and versioning

API and web share one version. Use patch bumps for fixes, minor bumps for features and major bumps for incompatible stable contracts. During `0.x`, document incompatible changes explicitly and use a minor bump. Change versions for releases rather than every commit; do not reuse published tags.

1. Set the same version in `apps/web/package.json` and `apps/api/pyproject.toml`.
2. Refresh lockfiles with `npm install --package-lock-only --ignore-scripts` in `apps/web` and `uv lock` in `apps/api`.
3. Update `CHANGELOG.md`, verify and merge the version changes into `main`.
4. Push a matching tag, or retain `[RELEASE:vX.Y.Z]` in the resulting main commit message.

```sh
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

A suffix such as `v0.2.0-beta.1` publishes a prerelease. Release workflows publish GitHub release notes, versioned API/web images to GHCR and a Docker ZIP with pinned image digests and a SHA-256 checksum. Images target `linux/amd64`; there is no moving `latest` tag. Builds include SBOM/provenance attestations and keyless Cosign signatures. Existing releases are not automatically republished.

Download and extract the Docker ZIP, copy `.env.example` to `.env`, set the two passwords and run:

```sh
docker compose pull
docker compose up -d --wait
```

Follow the included `INSTALL.md` for updates: preserve `.env`, the Compose project name and named volumes. Private GHCR packages require `docker login ghcr.io` with `read:packages` access; public packages allow anonymous pulls.

`[SKIP]` skips verification while allowing an explicitly requested release. GitHub's native `[skip ci]` marker also suppresses commit-triggered release workflows. Application versions, document schema versions, saved revisions and backup format versions are independent.

## Optional job capture extension

The [Chrome/Edge job capture extension](extensions/job-capture/README.md) can transfer reviewed public job text into the local job form. On LinkedIn, it automatically reads the active job's title, company and description from their page elements; text selection is ignored. Review the extracted fields before transfer and save explicitly in the app. Load the extension manually or build its ZIP with `python extensions/package_job_capture.py`; see the guide for installation and updates.
