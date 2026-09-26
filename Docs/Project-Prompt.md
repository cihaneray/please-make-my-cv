You are a senior full-stack software architect and engineer.

Design and implement a production-quality personal CV / Resume Workspace that runs both locally and as a web application.

This is not a simple resume form generator.

It is a structured CV workspace for:

- creating resumes
- editing resumes
- maintaining reusable career information
- importing and exporting structured resume formats
- editing raw YAML / JSON / Markdown
- previewing resumes
- exporting PDF files
- analyzing resume quality
- performing ATS-oriented checks
- comparing resumes against job descriptions
- creating job-specific resume variants
- versioning resumes

The application should remain simple, maintainable, privacy-conscious, and modular.

# 1. Core Technology Stack

Use a separated frontend/backend architecture.

## Frontend

Use:

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query

Use Zustand only where complex local editor state genuinely requires it.

Do not use Next.js as the primary backend.

The frontend should communicate with the FastAPI backend through a typed REST API.

---

# 2. Backend

Use:

- Python 3.13+
- FastAPI
- uv
- Pydantic
- SQLAlchemy 2.x
- Alembic

Use `uv` for:

- Python version management
- dependency management
- virtual environments
- lock file
- running backend commands

Do not use pip + requirements.txt as the primary dependency management workflow.

The backend project should contain:

pyproject.toml
uv.lock

Expected local workflow:

uv sync

uv run fastapi dev app/main.py

or an equivalent well-structured command.

---

# 3. Backend Development Tools

Use:

- Ruff for linting and formatting
- Pytest for tests
- pytest-asyncio where required
- mypy or Pyright for static type checking

Prefer strict typing throughout the backend.

Avoid untyped dictionaries for core domain data.

Use Pydantic models for API boundaries and structured CV schemas.

---

# 4. Database

Local development:

SQLite

Production:

PostgreSQL

Use:

SQLAlchemy 2.x

for ORM/database access.

Use:

Alembic

for database migrations.

Application business logic must not depend on SQLite-specific behavior.

The same domain/application layer should work with both SQLite and PostgreSQL.

---

# 5. Repository Structure

Use a monorepo.

Suggested structure:

apps/
  web/
  api/

packages/
  shared/

docs/

Inside:

apps/web/

contains the Next.js application.

apps/api/

contains the Python/FastAPI backend.

Suggested backend structure:

apps/api/
  app/
    main.py

    api/
      routes/
      dependencies.py

    core/
      config.py
      exceptions.py
      logging.py

    domain/
      resumes/
      profiles/
      jobs/
      analysis/
      templates/

    schemas/
      resume.py
      job.py
      profile.py
      analysis.py
      import_export.py

    services/
      resume_service.py
      analysis_service.py
      matching_service.py
      import_service.py
      export_service.py

    repositories/
      resume_repository.py
      job_repository.py
      profile_repository.py

    db/
      base.py
      session.py
      models/
      migrations/

    parsers/
      json_parser.py
      yaml_parser.py
      markdown_parser.py

    exporters/
      json_exporter.py
      yaml_exporter.py
      markdown_exporter.py
      pdf_exporter.py

    analyzers/
      ats/
      content/
      consistency/
      job_match/

    tests/

Do not blindly follow this structure if a simpler organization produces cleaner boundaries.

Keep modules feature/domain oriented.

---

# 6. Backend Layering

Use a practical layered architecture.

Preferred flow:

API Route
↓
Application Service
↓
Repository / Domain Logic
↓
Database

Routes should be thin.

Do not place significant business logic inside FastAPI route handlers.

For example:

Bad:

@router.post(...)
async def create_resume(...):
    # 150 lines of validation, business logic and SQL

Good:

@router.post(...)
async def create_resume(...):
    return await resume_service.create(...)

---

# 7. Async Strategy

Use async FastAPI endpoints where appropriate.

Database access may use SQLAlchemy async sessions.

However:

Do not make every function async unnecessarily.

Pure functions such as:

- ATS rules
- keyword normalization
- resume comparison
- schema conversion
- formatting
- text analysis

should remain synchronous when no I/O is involved.

---

# 8. Pydantic Resume Schema

Create a canonical internal Resume Schema.

All visual editing, imports, exports and analysis should ultimately operate on this canonical representation.

Example conceptual model:

ResumeDocument

Metadata:
- id
- schemaVersion
- title
- targetRole
- language
- templateId
- tags
- createdAt
- updatedAt

Profile:
- firstName
- lastName
- professionalTitle
- email
- phone
- location
- website
- linkedin
- github
- links

Summary

Experience[]

Education[]

Project[]

SkillGroup[]

Certification[]

Language[]

CustomSection[]

LayoutSettings

VisibilitySettings

Use nested Pydantic models.

Do not represent the entire resume as:

dict[str, Any]

---

# 9. Single Canonical Data Model

This is a critical architectural rule.

The application must NOT maintain independent versions of:

Form Resume
YAML Resume
JSON Resume
Markdown Resume
PDF Resume

There must be one canonical ResumeDocument model.

Architecture:

Visual Editor
        ↓
ResumeDocument
        ↓
Database

YAML
        ↕
ResumeDocument

JSON
        ↕
ResumeDocument

Markdown
        ↕
ResumeDocument

PDF
        ←
ResumeDocument

This prevents different formats from becoming inconsistent.

---

# 10. JSON Support

JSON must be a first-class structured format.

Support:

Import JSON
Export JSON
Edit JSON
Validate JSON

JSON structure must include:

schemaVersion

Example:

{
  "schemaVersion": 1,
  "resume": {
    ...
  }
}

Use Pydantic validation.

Pretty-print exported JSON.

Invalid JSON must never overwrite valid resume data.

---

# 11. YAML Support

Use:

PyYAML

or another mature YAML implementation.

Support:

.yaml
.yml

Operations:

- Import
- Export
- Parse
- Validate
- Edit
- Convert to JSON

YAML should remain human readable.

Example:

schemaVersion: 1

resume:
  profile:
    firstName: Cihan
    lastName: ...
  experience:
    - company: ...

Never silently ignore unknown or invalid important fields.

Return useful validation errors.

---

# 12. Markdown Support

Markdown is less structurally reliable than JSON/YAML.

Treat Markdown as:

- readable resume representation
- editable export format
- portable text format
- AI-friendly format
- Git-friendly format

Support:

Export Markdown
Import Markdown
Edit Markdown

Define a predictable Markdown convention.

Example:

# Cihan Example

Software Engineer

## Contact

...

## Summary

...

## Experience

### Backend Developer — Company

2025 – 2026

- Built ...
- Developed ...

## Education

...

## Projects

...

## Skills

...

When importing Markdown:

Parse recognized headings.

Map known sections to the canonical ResumeDocument.

Unknown sections should become Custom Sections.

If parsing is ambiguous:

return an import preview and warnings.

Never silently discard content.

---

# 13. Format Conversion Service

Create a dedicated ConversionService.

Support:

JSON → ResumeDocument
YAML → ResumeDocument
Markdown → ResumeDocument

ResumeDocument → JSON
ResumeDocument → YAML
ResumeDocument → Markdown

JSON ↔ YAML

Do not implement separate duplicated conversion logic in API routes.

---

# 14. Import API

Create endpoints conceptually similar to:

POST /api/import/validate

POST /api/import/preview

POST /api/import/apply

Support:

- JSON
- YAML
- Markdown

Input may come from:

- uploaded file
- pasted raw text

Return:

- detected format
- schema version
- parsed sections
- warnings
- validation errors
- normalized preview

Import should follow:

Upload
↓
Detect
↓
Parse
↓
Validate
↓
Normalize
↓
Preview
↓
User confirms
↓
Persist

Never immediately overwrite resume data after file upload.

---

# 15. Source Editing API

The frontend Source Editor should allow:

YAML
JSON
Markdown

When source content changes:

POST /api/resumes/{id}/source/validate

The backend should return:

valid
errors
warnings
normalizedData

When the user selects Apply:

PUT /api/resumes/{id}/source

The backend should:

1. Parse source
2. Validate
3. Convert to ResumeDocument
4. Save atomically
5. Return updated ResumeDocument

If validation fails:

do not modify the stored resume.

---

# 16. Optimistic Concurrency

Prevent accidental overwrites from multiple editor states.

Resume update operations should include a version or revision identifier.

For example:

revision: 17

The backend rejects stale updates.

Return:

409 Conflict

when the client tries to overwrite a newer version.

This is especially important because both:

Visual Editor

and

Source Editor

can modify the same document.

---

# 17. Autosave

The frontend may autosave changes with debounce.

Backend should expose a lightweight update mechanism.

Support partial resume updates where reasonable.

Do not create an immutable ResumeVersion for every keystroke.

Version history and autosave history are different concepts.

---

# 18. Resume Versioning

Allow:

Master Resume

to produce versions such as:

Backend Resume
Cybersecurity Resume
AI Engineer Resume
Company-Specific Resume

Models should support:

parentResumeId

or a similar relationship.

Operations:

- duplicate
- fork
- rename
- archive
- compare
- restore

Do not require full Git semantics.

---

# 19. Career Content Library

Do not make each resume the only source of career information.

Create a reusable Career Content Library.

Entities may include:

Experience
Project
Education
Skill
Certification
Achievement / Bullet

A Resume should be able to reuse content from the library.

Example:

Career Library

Turkcell Project
- full description
- all technologies
- all achievements

Resume A:
uses bullets 1, 2

Resume B:
uses bullets 2, 4

Resume C:
uses a shortened variant

Support either:

linked entry

or

detached copy

where appropriate.

Avoid accidental global modification of every resume.

---

# 20. Bullet Variants

Support variants for achievements.

Example:

Base accomplishment

Variants:

- Technical
- Concise
- Business
- General

Do not use AI-generated variants as canonical truth automatically.

Variants must preserve the underlying career fact.

---

# 21. Job Applications

Create JobApplication entities.

Fields:

- id
- company
- position
- location
- url
- description
- notes
- status
- createdAt
- updatedAt

Status examples:

- saved
- applied
- interview
- offer
- rejected
- archived

A job may be associated with one or more resumes.

---

# 22. Job Description Analysis

The backend should analyze job descriptions.

Extract:

- technical skills
- tools
- technologies
- responsibilities
- education requirements
- experience requirements
- domain terminology
- important keywords

Initially implement deterministic analysis.

AI integration should be optional.

---

# 23. Keyword Normalization

Implement controlled normalization.

Examples:

Postgres
PostgreSQL

JS
JavaScript

ML
Machine Learning

Do not automatically merge technologies that merely look similar.

Keep synonym mappings explicit and testable.

---

# 24. Resume ↔ Job Matching

Create MatchingService.

Input:

ResumeDocument
JobDescription

Output:

- found requirements
- missing requirements
- weakly represented requirements
- relevant keywords
- possible suggestions

Never encourage dishonest keyword injection.

A missing technology must not be added to the resume merely because the job asks for it.

---

# 25. Resume Analysis

Create modular analyzers.

Do not create:

analyze_resume.py

with thousands of lines.

Use independent rules.

Conceptual interface:

class ResumeRule(Protocol):
    id: str

    def analyze(
        self,
        resume: ResumeDocument
    ) -> list[AnalysisIssue]:
        ...

Possible categories:

- ATS
- content
- readability
- completeness
- consistency
- formatting

---

# 26. ATS Analyzer

Implement deterministic rules first.

Examples:

- Missing email
- Missing phone
- Missing professional title
- Invalid URL
- Inconsistent dates
- Empty experience
- Very large paragraphs
- Unusual section titles
- Duplicate content
- Excessive keyword repetition
- Excessively long bullet points
- Missing experience titles
- Invalid Unicode characters
- Poor section structure

Return structured issues.

Example:

{
  "ruleId": "missing-email",
  "severity": "important",
  "section": "profile",
  "message": "Contact email is missing."
}

Never claim:

"This CV will pass ATS."

Use wording such as:

"ATS compatibility heuristic."

---

# 27. Writing Quality Analyzer

Analyze bullet points for:

- repeated action verbs
- vague openings
- weak wording
- excessive length
- generic descriptions
- lack of outcome
- duplicated sentences
- inconsistent punctuation

Weak examples:

Worked on...
Helped with...
Responsible for...

Do not require every bullet to contain a metric.

Never fabricate metrics.

---

# 28. Resume Comparison

Create ResumeComparisonService.

Input:

Resume A
Resume B

Return semantic differences:

- section added
- section removed
- item added
- item removed
- field changed
- bullet changed
- ordering changed

Do not compare raw JSON strings.

Compare normalized domain structures.

---

# 29. PDF Export

PDF export must preserve:

- selectable text
- hyperlinks
- ATS-readable content
- A4 layout
- multiple pages
- proper page breaks

Do NOT generate PDF as an image.

Prefer HTML/CSS → Chromium PDF rendering.

A possible backend implementation may use Python Playwright.

Use:

ResumeDocument
↓
HTML Renderer
↓
Print CSS
↓
Chromium / Playwright
↓
PDF

The same resume presentation rules should be shared as closely as practical with frontend preview.

Keep PDF generation behind:

PdfExportService

Do not couple API routes directly to Playwright.

---

# 30. Templates

Templates should control appearance only.

Resume data must never contain template-specific HTML.

Templates:

- Minimal
- Professional
- Technical

Template settings:

- font family
- font size
- margins
- spacing
- accent color
- icons
- links

Keep templates ATS-friendly.

---

# 31. API Design

Use RESTful endpoints.

Possible structure:

/api/resumes

GET
POST

/api/resumes/{id}

GET
PATCH
DELETE

/api/resumes/{id}/duplicate

POST

/api/resumes/{id}/versions

GET
POST

/api/resumes/{id}/analysis

POST

/api/resumes/{id}/export

POST

/api/resumes/{id}/source

GET
PUT

/api/resumes/{id}/source/validate

POST

/api/jobs

GET
POST

/api/jobs/{id}

GET
PATCH
DELETE

/api/jobs/{id}/match/{resume_id}

POST

/api/import/validate

POST

/api/import/preview

POST

/api/library/experiences

/api/library/projects

/api/library/skills

Do not blindly create endpoints exactly like this if a cleaner API design is justified.

---

# 32. API Response Design

Use consistent API errors.

Example:

{
  "error": {
    "code": "RESUME_VALIDATION_FAILED",
    "message": "Resume source could not be validated.",
    "details": [...]
  }
}

Do not return raw Python exceptions to the frontend.

Create centralized exception handlers in FastAPI.

---

# 33. FastAPI Dependency Injection

Use FastAPI dependencies for infrastructure concerns such as:

- database sessions
- authenticated user
- application settings
- services where appropriate

Do not abuse dependency injection for pure utility functions.

---

# 34. Configuration

Use Pydantic Settings.

Environment configuration:

APP_ENV

DATABASE_URL

CORS_ORIGINS

AI_ENABLED

OPENAI_API_KEY

ANTHROPIC_API_KEY

OLLAMA_BASE_URL

PDF_RENDERER

etc.

Create:

.env.example

Never commit real credentials.

---

# 35. Authentication

Authentication is not required for the first local-only MVP.

However, database models should support ownership later.

For example:

owner_id

may initially be nullable or reference a default local profile.

Future web deployment may use:

- Auth.js frontend integration
- OAuth
- JWT-based FastAPI authentication
- external auth providers

Keep authentication isolated from domain logic.

---

# 36. Local-First Behavior

The application must work completely locally.

Required local services should be minimal.

Initial local environment:

Next.js
FastAPI
SQLite

No:

- Redis requirement
- external object storage
- cloud database
- hosted authentication

should be necessary for basic local usage.

---

# 37. Production

Production environment:

Frontend:
Next.js

Backend:
FastAPI

Database:
PostgreSQL

Possible deployment:

Frontend:
Vercel

Backend:
Railway / Fly.io / Render / VPS

or:

self-host everything with Docker.

---

# 38. Docker

Provide:

Dockerfile for frontend

Dockerfile for FastAPI

docker-compose.yml

for optional local/self-hosted deployment.

Development without Docker should still remain easy.

---

# 39. Backend Commands

Create convenient commands.

Examples:

uv sync

uv run fastapi dev app/main.py

uv run pytest

uv run ruff check .

uv run ruff format .

uv run mypy app

uv run alembic upgrade head

uv run alembic revision --autogenerate -m "..."

Prefer documented commands in README.

---

# 40. Frontend API Client

Do not scatter fetch() calls throughout React components.

Create a typed API layer.

Example:

lib/api/
  resumes.ts
  jobs.ts
  library.ts
  analysis.ts

or generate TypeScript API types from FastAPI OpenAPI.

Strongly consider generating the TypeScript API client/schema from:

FastAPI OpenAPI specification.

Avoid manually maintaining duplicate request/response types wherever possible.

---

# 41. Frontend / Backend Type Contract

Python Pydantic models are the backend source of truth for API contracts.

Generate or derive TypeScript types where practical.

Do not manually maintain:

Python ResumeSchema

and a completely separate handwritten:

TypeScript ResumeSchema

if automation can prevent schema drift.

---

# 42. Source Editor

Use a proper code editor component.

Possible option:

Monaco Editor

or a lighter equivalent if bundle size matters.

Support:

YAML
JSON
Markdown

Features:

- syntax highlighting
- line numbers
- validation errors
- find
- replace
- formatting
- keyboard shortcuts

The backend remains the authoritative validator.

---

# 43. Visual Editor Synchronization

Workflow:

Visual Editor change
↓
canonical frontend state
↓
FastAPI update
↓
validated ResumeDocument
↓
source representations generated as needed

Source Editor change
↓
FastAPI parse/validate
↓
ResumeDocument
↓
frontend visual editor update
↓
preview update

Never have YAML and form data independently mutate without canonical synchronization.

---

# 44. Validation Strategy

Use validation at multiple layers.

Frontend:

Zod

for immediate UX validation.

Backend:

Pydantic

for authoritative API validation.

Database:

constraints

for persistence integrity.

Frontend validation must never replace backend validation.

---

# 45. Transactions

Operations such as:

Apply Source Changes

Import Resume

Restore Version

should be atomic.

If validation or persistence fails:

the previous resume must remain intact.

Use database transactions appropriately.

---

# 46. Security

Protect against:

- malicious HTML
- script injection
- unsafe links
- path traversal
- dangerous upload filenames
- invalid file types
- excessive upload size
- malformed YAML
- unsafe YAML object deserialization

VERY IMPORTANT:

Use safe YAML parsing.

Never allow YAML to instantiate arbitrary Python objects.

Sanitize resume content before rendering HTML/PDF.

---

# 47. File Upload Limits

Only allow expected resume files.

Supported:

.json
.yaml
.yml
.md
.markdown

Optional future:

.pdf
.docx

Do not implement PDF/DOCX parsing in MVP unless specifically required.

Set sensible file size limits.

---

# 48. AI Architecture

AI must be optional.

Create abstraction:

AIProvider

Possible implementations:

OpenAIProvider
AnthropicProvider
GeminiProvider
OllamaProvider

Backend only.

Never expose API keys to frontend.

AI functionality may support:

- rewrite bullet
- shorten bullet
- improve summary
- analyze job description
- identify keywords
- suggest wording

AI output is a suggestion.

User must explicitly accept changes.

---

# 49. No Fabricated Career Data

This rule is mandatory.

AI and deterministic systems must NEVER invent:

- technologies
- employers
- roles
- education
- certifications
- metrics
- percentages
- user counts
- revenue
- responsibilities
- achievements

If useful information is missing:

suggest what the user could add if they know it.

Example:

Good:

"Consider adding the number of users if known."

Bad:

"Served 10,000 users."

---

# 50. Privacy

Local mode must not transmit resume content anywhere externally by default.

Default:

AI_ENABLED=false

If external AI is enabled:

make it clear which data may be sent.

Avoid storing full CV content in logs.

Redact sensitive values from errors/logs where practical.

---

# 51. Logging

Use structured backend logging.

Log:

- request ID
- route
- status
- latency
- internal error code

Avoid logging:

- full resume documents
- emails
- phone numbers
- API keys
- job descriptions

unless explicitly required for development debugging.

---

# 52. Testing

Backend tests should cover:

Resume schema validation

JSON parsing

YAML parsing

Markdown parsing

JSON export

YAML export

Markdown export

format conversion

ATS rules

job matching

resume comparison

repository behavior

API routes

source validation

import transactions

Use unit tests heavily for pure analysis logic.

---

# 53. Test Fixtures

Create reusable realistic fixtures.

Examples:

minimal_resume

software_engineer_resume

resume_with_invalid_links

resume_with_missing_contact

job_description_backend

Do not rely on Lorem Ipsum for everything.

---

# 54. API Integration Tests

Test flows such as:

Create Resume
→ Edit Resume
→ Export YAML
→ Import YAML
→ Compare resulting model

and:

Create Resume
→ Edit Source JSON
→ Validate
→ Apply
→ Fetch Resume

and:

Upload invalid YAML
→ Validation fails
→ Existing Resume remains unchanged

---

# 55. Frontend Tests

Use:

Vitest

React Testing Library

Playwright

Test critical flows:

- create resume
- edit experience
- preview changes
- source editing
- YAML import
- JSON import
- export
- analysis
- job matching

---

# 56. MVP

MVP should include:

Backend:
- FastAPI
- uv
- SQLite
- SQLAlchemy
- Alembic
- Resume API
- canonical Pydantic ResumeDocument
- JSON support
- YAML support
- Markdown support
- source validation
- import/export
- basic ATS analyzer
- PDF export

Frontend:
- Resume list
- Resume creation
- Resume editor
- source editor
- live preview
- design settings
- review screen
- PDF export

Do NOT start by implementing every future feature.

---

# 57. Second Phase

After the MVP is stable:

- Content Library
- Resume versions
- Job Applications
- Job matching
- PostgreSQL
- AI providers
- Docker
- authentication
- advanced comparison
- more templates

---

# 58. Code Quality Rules

Follow these rules.

Python:

- Use modern Python syntax.
- Use type annotations.
- Prefer dataclasses/Pydantic models over raw dictionaries.
- Avoid global mutable state.
- Avoid giant service classes.
- Avoid circular dependencies.
- Keep pure business logic independent from FastAPI.
- Keep database models separate from API schemas where appropriate.
- Do not expose ORM entities directly through API responses.
- Use pathlib instead of manual path manipulation.
- Use timezone-aware datetimes.
- Use enums where finite states exist.

TypeScript:

- Avoid any.
- Keep business logic outside JSX.
- Keep API logic outside UI components.
- Keep resume template code isolated from application UI.

---

# 59. README

Document:

## Development

Frontend:

cd apps/web
npm install
npm run dev

Backend:

cd apps/api
uv sync
uv run fastapi dev app/main.py

## Tests

uv run pytest

## Lint

uv run ruff check .

## Format

uv run ruff format .

## Database

uv run alembic upgrade head

Also document:

- architecture
- API
- import/export format
- schema versioning
- PDF rendering
- SQLite/PostgreSQL setup
- environment variables

---

# 60. Architecture Documentation

Create:

docs/architecture.md

Explain:

- frontend/backend boundary
- canonical resume model
- visual/source synchronization
- database architecture
- import pipeline
- export pipeline
- PDF pipeline
- analyzer architecture
- job matching
- AI provider abstraction
- local vs production environments

Create:

docs/resume-schema.md

Document the structured resume schema.

Create:

docs/api.md

Document important API concepts.

---

# 61. Schema Versioning

Resume export files must contain:

schemaVersion

Example:

schemaVersion: 1

When importing older schemas:

migrate safely.

Architecture:

Source File
↓
Detect schema version
↓
Migration
↓
Current ResumeDocument
↓
Validation

Create migrations at the document/schema level independently from SQL database migrations.

These are different concepts:

Alembic migration:
database schema

Resume schema migration:
portable CV file format

Do not mix them.

---

# 62. Failure Handling

Never silently recover in a way that loses user data.

Examples:

Invalid YAML:
show parse error.

Unknown field:
show warning/error depending on severity.

Old schema:
migrate and report migration.

Unsupported section:
preserve as Custom Section when possible.

Database failure:
do not pretend save succeeded.

PDF failure:
return useful export error.

---

# 63. User Data Safety

Before destructive actions such as:

Delete Resume

Replace Resume

Restore Previous Version

Import Over Existing Resume

require explicit confirmation.

Prefer soft delete/archive for resumes where practical.

---

# 64. Initial Development Process

Do not immediately generate hundreds of files.

First:

1. Inspect the repository.
2. Explain existing structure.
3. Identify reusable code.
4. Propose final monorepo architecture.
5. Design ResumeDocument.
6. Design SQLAlchemy models.
7. Design FastAPI API structure.
8. Design JSON/YAML/Markdown conversion architecture.
9. Design visual editor ↔ source editor synchronization.
10. Design PDF rendering architecture.
11. Create implementation phases.

Then implement.

---

# 65. Implementation Order

Use roughly this dependency order:

Phase 1
Project bootstrap

Phase 2
FastAPI + uv configuration

Phase 3
Pydantic ResumeDocument

Phase 4
SQLAlchemy + SQLite + Alembic

Phase 5
Resume CRUD API

Phase 6
JSON/YAML/Markdown parsing and export

Phase 7
Next.js resume editor

Phase 8
Visual editor ↔ backend synchronization

Phase 9
Source editor

Phase 10
Live preview

Phase 11
PDF export

Phase 12
ATS analyzer

Phase 13
Content Library

Phase 14
Job Applications + matching

Phase 15
Versioning + comparison

Phase 16
AI providers

Phase 17
PostgreSQL + deployment

Phase 18
Testing, refactoring and documentation

At the end of each phase run relevant:

backend tests
frontend tests
type checks
linters

Fix failures before continuing.

---

# 66. Main Architectural Principle

The central architecture should remain:

                ┌─────────────────┐
                │ ResumeDocument  │
                └────────┬────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Visual Editor      Source Editor     Database
                        │
              ┌─────────┼─────────┐
              │         │         │
             YAML      JSON    Markdown
                        │
                        ▼
                    Analysis
                        │
                        ▼
                  Job Matching
                        │
                        ▼
                   PDF Export

ResumeDocument is the canonical source of truth.

Formats, views and exports are representations of this model.

---

# 67. Final Product Philosophy

Build a focused personal productivity application.

Do not turn it into an enterprise HR platform.

The main workflow should remain:

Create Resume
→ Edit
→ Preview
→ Review
→ Export

Advanced functionality should remain available without cluttering the primary experience.

The implementation should prioritize:

correctness
data safety
simplicity
maintainability
local-first operation
clean architecture
fast development workflow

over unnecessary architectural complexity.