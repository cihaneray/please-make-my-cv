# CV Workspace Architecture

## 1. System Overview

CV Workspace is a local-first, modular platform designed for creating, editing, tailoring, and analyzing professional curriculum vitae and resumes.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│  (Studio, Visual Editor, Source Monaco, A4 Canvas)     │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / Typed)
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│  (Canonical ResumeDocument, Parsers, Matcher, Rules)   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼────────────┐ ┌─────────────▼────────────┐
│   SQLite (Local-First)   │ │  Multi-Format Exporters  │
│  PostgreSQL (Production) │ │  (JSON, YAML, MD, PDF)   │
└──────────────────────────┘ └───────────────────────────┘
```

## 2. The Single Canonical Data Model

To prevent inconsistencies between visual forms, raw YAML, JSON, Markdown, and PDF outputs, the entire system relies on a single source of truth: `ResumeDocument`.

- **Visual Editor:** Mutates typed state that maps 1:1 to `ResumeDocument`.
- **Source Editor:** Parses user-supplied YAML, JSON, or Markdown into `ResumeDocument` before persistence.
- **Analyzers & Matchers:** Pure deterministic functions executing against `ResumeDocument`.
- **Exporters:** Transform `ResumeDocument` into structured formats or A4 HTML/CSS print documents.

## 3. Concurrency & Data Safety

- **Optimistic Locking:** Every `ResumeDocument` carries a monotonic `revision` integer. Updates are rejected with `409 Conflict` if the incoming revision does not match the database state.
- **Safe Parsing:** YAML is parsed strictly via `yaml.safe_load` to prevent arbitrary Python bytecode execution.
- **Non-Destructive Imports:** Imports are always executed as a two-phase `validate/preview` -> `apply` transaction.
- **Privacy First:** Local SQLite database with zero external telemetry. AI assistance is optional and strictly deterministic without fabricating career facts.
