# REST API Reference

The FastAPI backend runs by default at `http://localhost:8000/api`.

## Endpoints

### 1. Resumes
- `GET /api/resumes` — List all resumes (supports `include_archived=true`)
- `POST /api/resumes` — Create a new resume
- `GET /api/resumes/{id}` — Retrieve canonical `ResumeDocument`
- `PUT /api/resumes/{id}` — Atomically update `ResumeDocument` (requires matching `revision`)
- `PATCH /api/resumes/{id}/metadata` — Update title, tags, or archive status
- `POST /api/resumes/{id}/duplicate` — Clone a resume variant
- `DELETE /api/resumes/{id}` — Soft delete (archive) or permanent delete
- `GET /api/resumes/{id}/analysis` — Run ATS compatibility and writing quality review
- `POST /api/resumes/{id}/compare/{other_id}` — Semantic comparison report

### 2. Source Editor
- `GET /api/resumes/{id}/source?format=yaml|json|markdown` — Retrieve formatted source
- `POST /api/resumes/{id}/source/validate` — Validate raw syntax and schema integrity
- `PUT /api/resumes/{id}/source` — Atomically apply source edits with optimistic locking

### 3. Import & Export
- `POST /api/import/validate` — Validate uploaded or pasted resume content
- `POST /api/import/preview` — Generate normalized preview and structure summary
- `POST /api/import/apply` — Persist imported document to the workspace
- `GET /api/resumes/{id}/export?format=pdf|yaml|json|markdown` — Export and download

### 4. Jobs & Matching
- `GET /api/jobs` — List job applications
- `POST /api/jobs` — Add target job
- `PUT /api/jobs/{id}` — Update status (Saved, Applied, Interview, Offer, Rejected)
- `POST /api/jobs/{id}/match/{resume_id}` — Calculate keyword and competency alignment

### 5. Career Content Library
- `GET /api/library` — Search and filter reusable achievements, projects, and skills
- `POST /api/library` — Store new career achievement snippet with tone variants
- `DELETE /api/library/{id}` — Remove snippet
