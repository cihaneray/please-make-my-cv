# Changelog

## Unreleased

- Unify certification, language and custom-section editing cards, including nested item and bullet controls.
- Add saved-CV application preparation checks with actual PDF diagnostics and a read-only ZIP export of the current linked CV plus saved cover letter.

- Simplify selected controls with even borders and quiet fills instead of one-sided accent strips; retain sliding selection transitions.

- Move entry, bullet and nested field reorder controls below editable content, align deletion buttons with their adjacent inputs, and prevent revision comparison labels from overlapping selectors in Turkish and narrow panels.

- Redesign Target Jobs as an editorial application dossier with keyboard-accessible tabs, persistent drafts, highlighted evidence previews, actual CV covers, dated submitted copies and responsive layouts.

- Refine dark mode with warm charcoal panels, orange action/selection accents, clearer focus states and contrast coverage; preserve white resume paper.

- Add section, entry and bullet ordering with accessible controls and PDF parity.
- Add grouped draft undo/redo, deletion recovery, CV search and Ctrl+K commands.
- Add an opt-in page length assistant using actual PDF page counts.
- Add editable local/optional AI cover letters, interview and follow-up dates, and a 14-day/overdue job agenda; preserve planning fields in backups.

- Redesign the home and CV studio around real document previews, an editorial desk, compact navigation, contextual section editing, focus mode and mobile tools/preview switching.
- Preserve job drafts across status changes and reloads; store application status timelines.
- Fix date range editing, Turkish education text, accessible labels and mobile preview navigation.
- Preserve timestamps in backward-compatible v2 workspace backups; detach live links when permanently deleting a CV.
- Calculate the library ATS heuristic average from active saved CV analyses; support actual tags, categories and editable tone variants.
- Add field-level revision/variant comparisons, matching evidence links and checks on the actual PDF output.
- Add API and browser regression coverage for these workflows.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased

- Add Docker Compose development with Windows file polling, container-managed dependencies and Linux build cache, plus an isolated Docker verification workflow.
- Fix job deletion leaving submitted copies that prevented backup restore; recover older orphan copies into archived placeholder jobs in new backups.
- Persist editable job requirements, include them in workspace backups, and migrate existing databases without replacing records.
- Document SQLite-to-PostgreSQL migration and Docker-only access to legacy workspaces.

- Add native Google Gemini API support for connection testing, resume scores, and actionable review suggestions, with backend-only credentials and blocked/incomplete response handling.

- Review and apply individual AI field suggestions with before/after comparison, conflict protection, and undo.
- Create job-specific copies from the current draft with original lineage and persistent job context.

- Add persistent Light, Dark, and System appearance preferences while preserving white resume paper.

- Configurable OpenAI-compatible/Ollama resume reviews with explained scores and actionable feedback.
- Chromium launch fallback to installed browsers, explicit overrides, and PDF diagnostics. - reliability and workflow remediation

- Prevented draft/source overwrites and save-response races; added recovery, undo, revision history and archive restore.
- Added atomic database revision checks, schema migrations, immutable application snapshots and additive workspace backup/restore.
- Secured HTML generation and implemented actual PDF output, shared live rendering and exact PDF page previews.
- Corrected import defaults, malformed-input errors, template selection, Markdown parsing and unsafe Markdown source replacement.
- Added complete field editing, library insertion, job editing, explicit requirements matching and non-blocking error feedback.
- Removed unsupported AI/scoring/privacy claims and remote font requests; documented local-only deployment.
- Generated frontend contracts from backend models; added backend regressions, production-browser tests and CI/container checks.

Historical release descriptions below describe the implementation at release time; current behavior and limitations are documented in README.md.

## [0.2.0] - 2026-09-27

### Added
- **Multi-Template Presentation System**:
  - Implemented three distinct production-ready visual templates: **Minimal Swiss**, **Technical Architecture**, and **Executive Editorial (Professional)**.
  - Template Registry pattern with runtime selection and zero modification to underlying `ResumeDocument` data.
  - Authentic scaled A4 template preview cards in the Template Gallery (`/templates`).
- **Discrete Multi-Page A4 Sheet Pagination**:
  - Dynamic DOM measurement and non-destructive page breaking.
  - Discrete stacked A4 sheets (`595px × 842px`) with realistic drop shadows and visible inter-page gaps.
  - Running headers (`Page 2+`) and running footers (`Page X of Y`) per page.
  - Orphan heading prevention ensuring section headings are never left isolated at the bottom of a sheet.
  - Dedicated print stylesheet supporting clean physical multi-page output via `window.print()`.
- **Multilingual Support (Turkish & English)**:
  - Full client-side localization system (`useI18n`) covering Dashboard, Studio Editor, Resumes, Jobs, Library, and Settings.
  - Localized section headings and date formatters (`formatDateRange`, `formatResumeDate`).
- **Decoupled Language & Target Market**:
  - Separated resume language (`metadata.language`: `tr` | `en`) from candidate target market (`metadata.targetMarket`: `TR`, `US`, `UK`, `EU`, `GLOBAL`).
  - Independent market controls with KVKK data minimization warnings for international applications.
- **Deterministic ATS Rule Registry**:
  - Modular rule engine categorizing Structural, Market-Specific, Content Quality, and Formatting rules.
  - Transparent rule evaluation breakdown with actionable severity levels (`error`, `warning`, `suggestion`).
- **Repository Governance & Compliance**:
  - Added [MIT License](LICENSE).
  - Added [Security Policy](SECURITY.md).
  - Comprehensive `.gitignore` covering Python, uv, Next.js, and multi-platform development.

### Changed
- Rebranded workspace name to `please-make-my-cv` with tagline *"Your CV. Smarter. Sharper. Job-ready."*.
- Replaced Material Symbols icons with SVG-based Lucide typography icons.
- Sanitized export filename generation using ASCII transliteration for RFC-compliant HTTP `Content-Disposition` headers.

### Fixed
- Fixed single long page overflow bug in A4 live preview by implementing automatic pagination across multiple sheets.
- Fixed 500 Internal Server Error during PDF export caused by non-ASCII em-dashes in document titles.
- Resolved preview container flex-shrink and scroll overflow issues on wide and ultra-wide displays.

---

## [0.1.0] - 2026-09-26

### Added
- **Initial Workspace Release**:
  - Monorepo architecture pairing a Next.js 16 frontend with a FastAPI Python backend.
  - Canonical `ResumeDocument` schema serving as the single source of truth.
  - Multi-format roundtrip import and export engine supporting JSON, YAML, Markdown, and print-ready HTML/PDF.
  - Two-way interactive Studio editor featuring simultaneous Visual Form Outline and Monaco Code Editor.
  - Reusable Career Library storing achievements, skills, and bullet variations (Technical, Concise, Business).
  - Job Matcher computing keyword overlap percentages and competency gap analyses.
  - Docker Compose orchestration for full-stack containerized deployments.
  - Comprehensive Pytest test suite with 100% route and parser coverage.
