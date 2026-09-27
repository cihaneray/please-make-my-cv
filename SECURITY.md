# Security Policy

`please-make-my-cv` takes the security, confidentiality, and privacy of your career data seriously. Because this application processes sensitive personal information (contact details, employment history, certifications, compensation preferences, and identification data), it is architected with a **local-first, privacy-by-design** approach.

---

## Supported Versions

Only the latest release and the current `main` branch receive security patches.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or privacy leak in `please-make-my-cv`, please report it responsibly rather than opening a public issue on GitHub.

### How to Report
1. Email your report to: **security@please-make-my-cv.local** (or submit via [GitHub Security Advisories](https://github.com/cihaneray/please-make-my-cv/security/advisories/new)).
2. Include the following details:
   - A clear description of the vulnerability and potential impact.
   - Step-by-step reproduction instructions or proof-of-concept (PoC).
   - Component affected (`apps/api`, `apps/web`, export pipelines, or parsing engines).
   - Operating system and environment details.

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours.
- **Triage & Assessment**: Within 5 business days.
- **Remediation & Patch**: Dependent on severity, typically within 14 business days.
- **Public Disclosure**: Coordinated after the fix has been merged and released.

---

## Core Security & Privacy Principles

### 1. Local-First & Zero Telemetry
- By default, all resume documents, career snippets, and job applications are stored strictly in your local SQLite database on your machine.
- No third-party analytics, tracking pixels, or remote telemetry are embedded.

### 2. KVKK & GDPR Data Minimization
- The backend incorporates deterministic data minimizers designed to detect and flag high-risk sensitive attributes (such as T.C. Kimlik No, national identification numbers, marital status, military status, and photos) when tailoring resumes for international or privacy-conscious target markets.

### 3. Safe Parsing & Deserialization
- **YAML**: Parsed exclusively through safe loaders (`yaml.safe_load`) to prevent arbitrary code execution via Python object desync.
- **JSON**: Validated via strict Pydantic v2 and Zod models with type enforcement and sanitized payloads.
- **HTML/PDF Export**: All user inputs in the HTML export pipeline are escaped via standard HTML entity escaping (`html.escape`) to prevent cross-site scripting (XSS) or server-side injection during document compilation.

### 4. AI Provider Privacy (Strictly Opt-In)
- AI features are **disabled by default**.
- When configured, API keys are loaded strictly from server-side environment variables and are never exposed or transmitted to the client browser.
- Local LLM providers (e.g., Ollama) are supported for full air-gapped offline operation.

---

## Guidelines for Self-Hosting & Deployment

When deploying `please-make-my-cv` to a remote server or production environment:
1. **Enforce HTTPS / TLS**: Terminate TLS at a secure reverse proxy (Nginx, Caddy, or Cloudflare) with modern ciphers.
2. **Restrict CORS Origins**: Update `CORS_ORIGINS` in `apps/api/.env` to include only your trusted frontend domain.
3. **Protect Environment Secrets**: Never commit `.env` or production credentials to source control.
4. **Network Isolation**: Ensure the API and database are accessible only through authenticated internal networks or reverse proxies.
