# Security and deployment boundary

This application is intended for a single user on a trusted local machine. It has no application authentication or per-user authorization. The default commands and Compose ports bind to loopback. CORS is not authentication. Public or shared-network hosting requires a separately designed authentication and access-control boundary.

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

Basic editorial buttons use local text cleanup. Optional resume reviews use an OpenAI-compatible or Ollama connection configured in Settings. Reviews transmit career content only on request; direct profile contact fields are omitted. API keys are stored in the backend AI_CONFIG_PATH file (default data/ai-settings.json), not encrypted by the application, and are excluded from Git, container build context, API responses, and workspace backups. Protect this file with OS access controls. Changing the endpoint or provider drops an existing key to prevent accidental forwarding. Personal-data pattern redaction is incomplete by nature and must not be treated as anonymization.

For reports, use the repository's private vulnerability-reporting channel if available. Do not post personal data or live credentials in public issues. No response-time or monitored-email guarantee is implied by this document.
