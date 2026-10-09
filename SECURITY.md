# Security and deployment boundary

This application is intended for a single user on a trusted local machine. Host headers are restricted on both the web and API. Unsafe browser requests require an allowed Origin. An optional API_TOKEN protects direct API requests; the web forwards it server-side after checking Host and Origin. This is not a multi-user authorization system. The default commands and Compose ports bind to loopback. CORS is not authentication. Public or shared-network hosting requires a separately designed authentication and access-control boundary.

## Implemented protections

- Request bodies are bounded to 5 MB before parsing.
- YAML uses safe loading, rejects aliases and handles malformed/nested input errors.
- Structured imports reject unknown fields and unsupported versions instead of dropping data.
- HTML content is escaped; styling values are restricted. Export HTML has a restrictive content security policy; preview HTML runs in a sandboxed iframe.
- PDF generation blocks network requests and disables page JavaScript.
- Document writes use atomic revision checks and save previous versions.
- Restore validates backups and creates new records in a transaction.
- Demo seeding is opt-in, and tests isolate database access.

## Important limits

Database files, browser recovery drafts, downloaded PDFs and backups contain personal data. Local storage is not encryption. Protect the machine and its backups, and use full-disk encryption if appropriate for your installation. The application does not certify legal compliance or verify the truth of resume content.

Basic editorial buttons use local text cleanup. Optional resume reviews use a Google Gemini, OpenAI-compatible, or Ollama connection configured in Settings. Reviews transmit career content only on request; direct profile contact fields are omitted. API keys are stored with authenticated Fernet encryption in AI_CONFIG_PATH. Docker keeps the key in a separate ai_secrets volume at AI_SECRET_KEY_PATH; direct Python installations must set a separate key path and protect it with OS access controls. This does not protect against full access to the running container or both volumes. Keys are excluded from Git, container build context, API responses, and workspace backups. Protect this file with OS access controls. Changing the endpoint or provider drops an existing key to prevent accidental forwarding. Personal-data pattern redaction is incomplete by nature and must not be treated as anonymization.

For reports, use the repository's private vulnerability-reporting channel if available. Do not post personal data or live credentials in public issues. No response-time or monitored-email guarantee is implied by this document.


## Model and import boundaries

Model requests allow Google/OpenAI and the documented local Ollama hosts by default. Configure LLM_ALLOWED_HOSTS as a JSON array for a trusted custom public endpoint. DNS results are checked on each request; the connection is pinned to an approved IP while preserving Host and TLS SNI. Environment HTTP proxies and redirects are disabled. Metadata/link-local targets are blocked.

PDF imports run in bounded child processes, with a maximum of PDF_IMPORT_WORKERS jobs per API process (default 2). Use one API worker under Compose; multiple workers multiply that limit. Linux memory/CPU limits and a wall-clock timeout apply. Native Windows has a timeout but no Job Object resource limit; prefer Docker.

Downloaded backups are limited to a size that the configured restore limit can accept. Corrupt records are reported instead of silently omitted.
