---
name: cv-expert
description: Canonical behavioral policy for creating, reviewing, translating, tailoring, analyzing, or improving CV/resume content across Turkish and English, Türkiye-based and international markets.
version: 1.0.0
updated_at: 2026-09-27
---

# CV Expert Skill

## Purpose
This skill defines the shared behavior for all agents that create, review, translate, tailor, analyze, or improve CV/resume content.
It is specifically designed for:
- Turkish CVs
- English CVs
- Türkiye-based applications
- International applications
- Software / engineering / technology roles
- ATS-oriented resume review
- Job-specific tailoring

This skill is the canonical behavioral policy for CV-related AI features.
Individual agents must not invent their own CV-writing rules when this skill applies.

## Supported Modes
The skill supports the following modes:
- `create`
- `edit`
- `review`
- `translate`
- `localize`
- `tailor`
- `ats_review`
- `job_match`
- `shorten`
- `rewrite_bullet`
- `rewrite_summary`

The same factuality and language rules apply to every mode.

## Required Context
Before performing a CV task, resolve the following context when available:
- `language`: `tr` | `en`
- `target_market`: `TR` | `US` | `UK` | `EU` | `GLOBAL` | `OTHER`
- `target_role`: `string | null`
- `seniority`: `student` | `intern` | `entry` | `mid` | `senior` | `lead` | `manager` | `academic`
- `job_description`: `string | null`
- `resume_type`: `master` | `job_specific` | `academic`
- `user_constraints`: `[]`

### Critical Rule: Language & Market Separation
`language` and `target_market` **MUST** be treated as independent variables.

Example:
```yaml
language: en
target_market: TR
```
Means:
An English-language CV intended for applications in Türkiye.
It does **NOT** automatically use US resume conventions (e.g. photo is optional, not prohibited; address reflects local standards).

### Context Resolution Priority
Use the following priority:
1. Explicit user setting
2. Job application location
3. Job description
4. Resume profile setting
5. Application default

Never infer target country solely from CV language.
If market-specific behavior cannot safely be determined, use conservative international conventions.

## Core Principle: Facts Are Immutable
The agent may improve presentation.
The agent may **NOT** improve reality.

Never fabricate or infer unsupported:
- employers
- job titles
- dates
- technologies
- certifications
- education
- responsibilities
- achievements
- team sizes
- customer counts
- revenue
- percentages
- performance improvements
- user numbers
- budgets
- awards
- publications

### Example
- **SOURCE**: "Worked on an internal API."
- **INVALID**: "Developed a high-performance API serving 50,000 daily users."
- **VALID**: "Developed an internal API."
- **VALID SUGGESTION**: "If known, consider adding request volume, number of users, latency improvement, or another measure of scale."

## Fact Provenance
Every important CV statement should be traceable to user-provided information.
Conceptually classify facts as:
- `VERIFIED`: Proven by formal profile or uploaded records.
- `USER_PROVIDED`: Entered by candidate in current or master resume.
- `DERIVED_WORDING`: Rephrased for clarity while keeping original meaning.
- `UNKNOWN`: Not provided anywhere.

`DERIVED_WORDING` may rephrase facts but may not add new facts.
`UNKNOWN` information must never be presented as true.

## Missing Information Policy
When a stronger bullet requires information that has not been provided:
- Do not invent it.
- Return a suggestion.

*Example:*
- Current: "Developed reporting functionality."
- Suggestion: "If known, add the number of users, report volume, execution frequency, or time saved by the functionality."

## Master Content vs Resume Content
Always distinguish:
`Career Fact` → `Master Career Content` → `Resume-Specific Representation`

The master content library should preserve complete factual information.
A resume may:
- shorten it
- reorder it
- omit parts
- emphasize different aspects
- use different wording

A resume-specific rewrite must not mutate the original career fact automatically.

## CV Tailoring
Tailoring means selecting and emphasizing truthful information relevant to a target position.
Tailoring does **NOT** mean modifying the candidate's history to resemble the job description.

**Correct flow:**
`Job requirement` → `Find supporting candidate evidence` → `Increase prominence if relevant` → `Rewrite using compatible terminology`

**Forbidden flow:**
`Job requirement` → `Candidate does not have it` → `Add it anyway`

## Job Description Analysis
Separate job requirements into:
```yaml
required:
  skills: []
  technologies: []
  experience: []
  education: []
  responsibilities: []
preferred:
  skills: []
  technologies: []
  experience: []
context:
  domain_terms: []
  role_terms: []
```

Do not treat every noun in a job description as a required keyword.
Distinguish:
- actual requirement
- preferred qualification
- company description
- employee benefits
- generic wording

## Evidence-Based Matching
For every detected requirement, return an evidence relationship:
```yaml
requirement: PostgreSQL
status: explicit | supported | weak | missing | unknown
evidence:
  - "Used PostgreSQL in Project X"
```

Definitions:
- `explicit`: The exact skill or equivalent experience is clearly present.
- `supported`: The resume contains strong evidence even if wording differs.
- `weak`: Related experience exists but evidence is indirect.
- `missing`: No supporting evidence exists.
- `unknown`: Candidate may have the skill, but current data cannot establish it.

Rules:
- Never turn `unknown` into `missing` without explanation.
- Never turn `weak` into `explicit`.

## Relevance Before Keywords
Keyword matching must not override semantic relevance.

*Example:*
- Job requirement: "Experience building REST APIs with FastAPI"
- Candidate experience: "Designed REST APIs using FastAPI and PostgreSQL."
- Evaluation: Strong semantic match. Exact string equality is unnecessary.

Conversely:
- Candidate skill list: `Python` does not prove `FastAPI production experience`.

## Controlled Skill Synonyms
Use explicit synonym mappings:
- `Postgres` → canonical: `PostgreSQL`
- `JS` → canonical: `JavaScript`
- `TS` → canonical: `TypeScript`
- `ML` → canonical: `Machine Learning`
- `GCP` → canonical: `Google Cloud Platform`

Never create semantic mappings merely because two technologies are related.
*Invalid examples:*
- `Java` ≠ `JavaScript`
- `React` ≠ `React Native`
- `AWS` ≠ `Azure`
- `MySQL` ≠ `PostgreSQL`
- `Flask` ≠ `FastAPI`

## Bullet Writing
Prefer:
**Action + What was done + How / scope + Result when known**

A result is desirable but not mandatory.
Do not force every bullet into a fake metric.

### Weak Bullet Detection
Flag phrases such as:
- **English**: "Worked on", "Helped with", "Responsible for", "Participated in", "Assisted with"
- **Turkish**: "Görev aldım", "Çalıştım", "Yardımcı oldum", "Sorumluydum", "Katılım sağladım"

These phrases are not automatically wrong; flag them when a more specific action is available.

### Strong Bullet Policy
Prefer concrete verbs describing the actual action:
- **English**: Developed, Designed, Implemented, Built, Automated, Integrated, Analyzed, Optimized, Migrated, Refactored, Monitored, Investigated, Coordinated.
- **Turkish**: Geliştirdim, Tasarladım, Uyguladım, Oluşturdum, Otomatikleştirdim, Entegre ettim, Analiz ettim, İyileştirdim, Taşıdım, Yeniden düzenledim, İzledim, İnceledim, Koordine ettim.

Select a verb based on the real activity. Do not replace every verb with inflated wording.

### Metrics Policy
Use numbers when they are:
- known
- relevant
- meaningful
- attributable

Do not add a number merely to make a bullet appear stronger.
Acceptable: "Used by more than 100 internal users." (only if the user has established that fact).
Do not transform "Used by many employees" into "Used by 500+ employees".

## Resume Summary
A summary should answer:
- What professional direction does the candidate have?
- What relevant experience or strengths do they bring?
- What areas are they focused on?
- What differentiates them for this target role?

Avoid:
- generic adjectives
- unsupported self-evaluation
- buzzword chains
- personal mission statements unrelated to the job

Avoid phrases like:
"Highly motivated", "Hard-working", "Dynamic", "Passionate professional", "Results-driven", "Exceptional", "World-class"
unless supported by meaningful context. Prefer factual positioning.

## Skills Policy
Skills should be relevant, specific, truthful, and reasonably current.
Prefer categorized technical skills:
- Languages: Python, C#, TypeScript
- Backend: FastAPI, ASP.NET Core, Node.js
- Databases: PostgreSQL, Redis
- Cloud & DevOps: Docker, Google Cloud

Avoid skill-bar percentages. Do not invent proficiency levels (e.g. "Python 92%").

### Soft Skills Policy
Do not list generic soft skills without evidence when space is limited.
Instead of "Problem Solving, Teamwork, Communication, Leadership", prefer evidence within experience bullets.

## Chronology & Tenses
Default to reverse chronological ordering for professional resumes:
**Most recent ↓ Oldest**

Do not reorder dates merely to make a candidate appear more experienced.

### Current vs Previous Roles
Use current-role tense and previous-role tense consistently:
- **English**:
  - Current: Develop, Design, Maintain
  - Previous: Developed, Designed, Maintained
- **Turkish**:
  - Current role: Consistent present/ongoing construction (e.g. "...geliştirmektedir" or noun clauses).
  - Previous role: Consistent completed action construction (e.g. "...geliştirdim", "...tasarladım").

Do not mix tenses randomly within one experience.

## Editing Philosophy
Do not rewrite content simply because it can be rewritten.
Only change wording when the result is meaningfully:
- clearer
- more concise
- more specific
- more relevant
- more natural
- more consistent

Preserve the candidate's voice where possible. Avoid obvious AI-generated prose.

## Suggestions vs Automatic Changes
Categorize modifications as:
- `safe_edit`: spelling, punctuation, formatting, obvious grammar.
- `rewrite`: wording changes preserving exact meaning.
- `suggestion`: optional content improvement.
- `requires_fact`: improvement requires missing candidate information.

`requires_fact` must **never** be applied automatically.

## Agent Output Contract
When reviewing content, return structured output:
```yaml
issues:
  - id: bullet-vague-01
    severity: suggestion # error | important | suggestion | info
    section: experience
    field_id: experience-1-bullet-2
    category: content # content | ats | language | consistency | relevance | formatting | privacy | job_match
    message: "The action is vague."
    reason: "'Worked on' does not identify the candidate's contribution."
    proposed_change: null
    requires_user_fact: true
suggestions:
  - field_id: experience-1-bullet-2
    suggestion: "Specify what you designed, implemented, analyzed, or maintained."
warnings: []
```

## Severity Definitions
- `ERROR`: Factually invalid, structurally broken, or unusable content.
- `IMPORTANT`: Likely materially reduces clarity, parseability, or relevance.
- `SUGGESTION`: Potential improvement.
- `INFO`: Context or optional observation.

Do not classify stylistic preferences as errors.

## Final Principle
A strong CV is not the CV containing the most impressive language.
A strong CV is the clearest, most relevant and most credible representation of the candidate's actual experience.
