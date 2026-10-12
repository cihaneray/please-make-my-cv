---

For job-specific applications, require an explicit job title and description or requirements. Select supported project and certification evidence for that posting, preserve chronological work history, and never invent missing credentials or claims. Generic source CVs remain reusable; application copies must retain their target job context.
ruleset: cv-ats-quality
version: 1.0.0
updated_at: 2026-09-27
authority: "ATS Technical Specifications, KVKK Data Minimization, and Career Industry Best Practices"
---

# CV ATS & Quality Review Rules

These rules govern:
- ATS parseability and format review
- Resume quality and bullet strength evaluation
- Job description requirement extraction and matching
- Privacy and KVKK compliance
- Deterministic validation and AI-assisted suggestions

## 1. ATS Claims Policy
- **Never claim:** "This resume will pass ATS 100%" or "This resume is 95% ATS compatible" without displaying a transparent, reproducible internal heuristic.
- **Prefer:** "No major ATS-oriented formatting or parseability issues were detected."
- Clarify in the UI: *This is an ATS compatibility heuristic, not a guarantee of how any single employer's proprietary ATS will rank the document.*

## 2. Deterministic Checks First
Always execute deterministic, algorithmic checks in Python before invoking AI analysis:
- Valid email syntax (RFC 5322 regex)
- Valid telephone formatting if provided
- Standard section heading recognition
- Date chronologies and chronological consistency
- Valid URL structures (GitHub, LinkedIn, personal website)
- Non-empty experience and education titles/organizations
- Exact duplicate bullets or duplicated sentences
- Excessively long paragraphs (>150 words per block)
- Inconsistent punctuation
- TDK 2026 percentage placement (`%25` in Turkish CVs)
- Sensitive private data patterns (TCKN, IBAN, national ID)

AI models must complement these deterministic checks, never replace them.

## 3. Standard Headings Recognition
Recognize accepted heading aliases across languages:
```yaml
experience:
  - Experience
  - Professional Experience
  - Work Experience
  - Deneyim
  - İş Deneyimi
education:
  - Education
  - Eğitim
skills:
  - Skills
  - Technical Skills
  - Beceriler
  - Teknik Beceriler
projects:
  - Projects
  - Projeler
summary:
  - Summary
  - Professional Summary
  - Profil
  - Profesyonel Özet
certifications:
  - Certifications
  - Sertifikalar
```
Custom headings may be valid. Issue a `SUGGESTION` (not an error) when a standard alias would improve parser certainty.

## 4. Layout & Parseability
- Core career content must be selectable text.
- Never place essential information exclusively inside images, charts, badges, or unlabelled icons.
- Treat multi-column designs and nested tables as compatibility risks, not universal failures. Flag them as `SUGGESTION` for high-risk ATS targets.

## 5. PDF Technical Standards
Exported PDF resumes must:
- Contain true, selectable text streams (never rasterized images of text).
- Correctly encode UTF-8 Turkish characters (`ğ, ı, ş, ç, ö, ü`).
- Preserve active hyperlinks.
- Retain a logical left-to-right, top-to-bottom reading order.

## 6. Typography & Font Size Heuristics
- Body font size < 9.5 pt: `IMPORTANT` (readability issue)
- Body font size 9.5 - 10 pt: `SUGGESTION`
- Body font size >= 10 pt: `Acceptable`

Do not aggressively shrink font sizes merely to compress text into a single page.

## 7. Contextual Page Count Guidelines
Page counts depend on seniority, market, and role:
- US Entry / Student: Preferred 1 page
- Experienced Software Engineer: 1 - 2 pages
- Türkiye Market: Typical 1 - 2 pages
- Academic / Research CV: No arbitrary page limit

Never sacrifice critical technical accomplishments or readability to satisfy a rigid one-page myth.

## 8. Reverse Chronology
Standard professional resumes must default to reverse chronological ordering:
`Most Recent Position ↓ Oldest Position`
Flag chronologies where dates contradict this ordering.

## 9. Job Description Analysis
Categorize requirements into distinct buckets:
- `role_terms`: job title and functional designations
- `hard_skills`: core tools, programming languages, databases, libraries
- `technologies`: platforms, cloud providers, infrastructure
- `domain_terms`: fintech, healthcare, e-commerce, cybersecurity
- `experience_requirements`: minimum years, project scale
- `education`: degrees, relevant academic fields

**Exclude from scoring:**
- Company marketing slogans ("We are a fast-growing startup...")
- Generic perks and benefits ("Free lunch, 401(k), health insurance...")
- Legal disclaimers and boilerplate.

## 10. Evidence-Based Job Matching
Match candidate qualifications at 3 explicit confidence levels:
1. `exact`: Direct textual match with verified skills or experience.
2. `semantic`: Strong conceptual equivalent (e.g. FastAPI ↔ Python REST API development).
3. `unsupported`: Skill is absent from resume data.

**Synonym Canonicalization:**
- `Postgres` ↔ `PostgreSQL`
- `JS` ↔ `JavaScript`
- `TS` ↔ `TypeScript`
- `GCP` ↔ `Google Cloud Platform`
- `ML` ↔ `Machine Learning`

Never conflate related but distinct technologies (e.g. `Java` ≠ `JavaScript`, `React` ≠ `React Native`, `AWS` ≠ `Azure`).

Every positive match must explicitly link to the candidate's section, entry, and exact text evidence.

## 11. Missing Skills Policy
When a required qualification is absent:
- Mark as: `Missing from current CV evidence`.
- Suggest: *"If you have experience with [Skill] that is currently omitted, consider adding the relevant project or responsibility."*
- **Never instruct:** *"Add [Skill] to your skills list"* if no evidence exists.

## 12. Keyword Stuffing Detection
Detect and flag unnatural keyword repetition:
- Repeated identical terms without context (e.g. `Python Python Python FastAPI Backend`).
- Prefer contextual bullet proof over passive comma-separated skill lists.

## 13. Bullet Quality Heuristics
Evaluate each bullet across 7 key dimensions:
- `action`: Concrete action verb
- `context`: Clear scope or business situation
- `specificity`: Exact technologies, tools, and technical terms used
- `evidence`: Credible demonstration of competence
- `result`: Measurable outcome, user impact, or efficiency gain where known
- `readability`: Concise, active voice without unnecessary filler
- `truthfulness`: Grounded strictly in user-provided source data

## 14. Repeated Action Verbs
Flag repetitive bullet openers within a single experience entry:
- e.g. 4 consecutive bullets starting with "Developed... Developed... Developed... Developed...".
- Suggest natural alternatives (*Engineered, Architected, Implemented, Automated, Refactored*) only when they reflect the real work.

## 15. Truthfulness Guard & Fact Immutability
Before generating or suggesting a rewritten bullet:
- Verify every noun, technology, and metric exists in the candidate's source data.
- Never inflate seniority:
  - "Contributed to design" must not become "Spearheaded the architecture".
  - "Assisted with testing" must not become "Owned quality assurance".
- Never inflate metrics:
  - "Approximately 100 users" must not become "Thousands of daily active users".

## 16. Transparent Scoring System
Scores presented in the workspace must be calculated deterministically with transparent weights:
```yaml
ats_heuristic:
  structure: 20
  readability: 20
  contact: 15
  consistency: 15
  job_relevance: 20
  parseability: 10
  total: 100
```
The user must see the exact breakdown and actionable suggestions for every deducted point.

## 17. Review Categories
Classify every issue into one of:
- `ATS / Parseability`
- `Content`
- `Language`
- `Consistency`
- `Relevance`
- `Formatting`
- `Privacy`
- `Job Match`

## 18. KVKK & Data Privacy Architecture
Resumes contain personal data subject to KVKK (Law No. 6698) and GDPR.
- **Redaction before LLM transmission:** Never send candidate phone numbers, full street addresses, TCKN, IBAN, passport numbers, or private emails to external AI providers.
- **Minimum Data Transmission Rule:** Only transmit the specific text chunk (e.g. the single bullet or summary) being analyzed or rewritten.
- Flag accidental inclusion of sensitive personal data as `IMPORTANT` privacy issues.

## 19. AI Suggestions & Human-in-the-Loop
- AI recommendations are proposals, never automatic overwrites.
- The UI must display side-by-side diffs with clear user controls to Accept, Edit, or Dismiss.
- The underlying `ResumeDocument` only updates upon explicit user confirmation.

## 20. Rule Typology & Versioning
Every rule executed by the platform is typed:
- `language_standard`: TDK orthography, grammar rules.
- `market_convention`: Target market norms (e.g. US vs TR photo conventions).
- `deterministic_validation`: Pure regex, structure, and integrity checks.
- `ats_heuristic`: Parseability and typography heuristics.
- `product_preference`: Style and conciseness preferences.

Each analysis run records the rule version (`cv-ats-quality-v1.0.0`) for auditing and reproducibility.
