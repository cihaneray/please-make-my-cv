# please-make-my-cv

> Your CV. Smarter. Sharper. Job-ready.

A production-quality, local-first CV & Resume Workspace designed with the **Calm Editorial Workspace** design aesthetic (Swiss modernist precision, Inter typography, razor-thin hairlines, and realistic A4 document scaling).

Built with a clean monorepo architecture separating the **Next.js** frontend from the **FastAPI** backend, adhering to a single canonical `ResumeDocument` source of truth.

---

## Architecture Overview

```
                                  ┌────────────────────┐
                                  │   ResumeDocument   │  <-- Single Canonical Truth
                                  └─────────┬──────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
       Visual Form Studio             Source Editor                Database Persistence
    (Outline & Form Inputs)     (YAML / JSON / Markdown)           (SQLite / PostgreSQL)
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │     Analyzers      │  <-- Modular ATS & Quality Rules
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │    Job Matching    │  <-- Normalized Skill Gaps
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │  A4 Canvas / PDF   │  <-- Print-Accurate PDF Export
                                  └────────────────────┘
```

---

## Tech Stack

### Backend (`apps/api`)
- **Python 3.12+** managed with `uv`
- **FastAPI** typed REST API
- **Pydantic v2** canonical schema validation
- **SQLAlchemy 2.0** ORM (SQLite for local-first, PostgreSQL for production)
- **PyYAML** (strictly safe parsing via `yaml.safe_load`)
- **Pytest** & **Ruff** for high-velocity testing and strict formatting

### Frontend (`apps/web`)
- **Next.js 15** App Router
- **React 19** & **TypeScript**
- **Tailwind CSS** with Calm Editorial Workspace design tokens
- **Lucide** & **Material Symbols** typography icons
- **A4 Document Presentation Canvas** with interactive zoom, fit, and print stylesheet

---

## Quickstart

### 1. Local Development (Recommended)

#### Backend
```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/api/health`

#### Frontend
```bash
cd apps/web
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

### 2. Docker Compose (Full Stack)

```bash
docker-compose up --build
```
Runs PostgreSQL, FastAPI backend, and Next.js frontend together.

---

## Verification & Tests

### Backend Tests
```bash
cd apps/api
uv run pytest
```
*Executes unit tests across canonical schemas, JSON/YAML/Markdown parsers, exporters, ATS heuristic rules, and API integration flows.*

### Backend Linting & Formatting
```bash
cd apps/api
uv run ruff check .
uv run ruff format .
```

### Frontend Production Build
```bash
cd apps/web
npm run build
```

---

## Key Features

1. **Single Canonical Data Model (`ResumeDocument`)**:
   Eliminates sync bugs between visual editor forms and raw source files.
2. **Multi-Format Roundtrip (YAML, JSON, Markdown, PDF)**:
   Seamlessly switch between Visual editing and Code editing tabs without data loss. Unrecognized Markdown headings are safely preserved as Custom Sections.
3. **ATS Compatibility & Writing Quality Review**:
   Modular `ResumeRule` protocol inspecting contact info, weak action verbs, bullet lengths, and verb variety.
4. **Career Content Library & Bullet Variants**:
   Central repository to store reusable achievements with Technical, Concise, and Business variants.
5. **Job Application Tracking & Competency Matching**:
   Normalized keyword extractor calculating compatibility percentages and gap analyses between job postings and your CV.
6. **Optimistic Concurrency Control**:
   Guarantees updates carry revision counters, rejecting stale concurrent edits with `409 Conflict`.
7. **Privacy & Local-First**:
   Runs completely on your local workstation without requiring external cloud databases or third-party telemetry.
