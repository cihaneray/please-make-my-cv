import {
  PageFitReport,
  CoverLetterResult,
  ResumeComparisonReport,
  PdfCheckReport,
  JobApplication,
  JobMatchAnalysis,
  LibrarySnippet,
  ResumeAnalysisReport,
  ResumeDocument,
  ResumeSummary,
  TargetJob,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface EmailDraft {
  subject: string;
  body: string;
  notice: string;
}
export interface TranslationPreview {
  document: ResumeDocument;
  changes: { path: string; original: string; translated: string }[];
  targetLanguage: "en" | "tr";
}
export interface ImportedJobListing {
  sourceUrl: string;
  company: string;
  position: string;
  description: string;
  extraction: "structured" | "text";
  warnings: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "NETWORK_ERROR",
    public details: unknown = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "An unexpected error occurred.";
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const timeout = AbortSignal.timeout(
    url.includes("/ai/") ||
      url.includes("/pdf-check") ||
      url.includes("/page-fit")
      ? 120000
      : 30000,
  );
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted
        ? "The request timed out. Try again."
        : "Cannot reach the API. Check the connection and try again.",
      0,
      timeout.aborted ? "TIMEOUT" : "NETWORK_ERROR",
    );
  }
  if (!res.ok) {
    const raw = await res.text();
    let message = `Request failed (${res.status})`,
      code = "REQUEST_FAILED",
      details: unknown = [];
    try {
      const data = JSON.parse(raw);
      code = data.error?.code || code;
      details = data.error?.details || data.detail || [];
      message =
        data.error?.message ||
        (typeof data.detail === "string" ? data.detail : message);
      if (res.status === 422 && Array.isArray(details))
        message =
          details
            .map(
              (item: {
                field?: string;
                loc?: (string | number)[];
                msg?: string;
              }) =>
                `${item.field || item.loc?.join(".") || "Field"}: ${item.msg || "Invalid value"}`,
            )
            .join("; ") || message;
    } catch {
      /* Do not expose an HTML proxy error as user-facing text. */
    }
    throw new ApiError(message, res.status, code, details);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  reviewPdfImport: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return fetchJson<import("./types").PdfImportReport>(
      `${API_BASE}/import/pdf`,
      { method: "POST", body },
    );
  },
  planTailoring: (jobId: string, resumeId: string) =>
    fetchJson<import("./types").TailoringPlan>(
      `${API_BASE}/jobs/${jobId}/tailoring/${resumeId}`,
      { method: "POST" },
    ),
  applyTailoring: (
    jobId: string,
    resumeId: string,
    request: import("./types").TailoringApplyRequest,
  ) =>
    fetchJson<ResumeDocument>(
      `${API_BASE}/jobs/${jobId}/tailoring/${resumeId}/apply`,
      { method: "POST", body: JSON.stringify(request) },
    ),
  workspaceMetrics: () =>
    fetchJson<{
      atsAverage: number | null;
      resumeCount: number;
      notice: string;
    }>(`${API_BASE}/workspace/metrics`),
  compareDrafts: (source: ResumeDocument, target: ResumeDocument) =>
    fetchJson<ResumeComparisonReport>(`${API_BASE}/resumes/compare-drafts`, {
      method: "POST",
      body: JSON.stringify({ source, target }),
    }),
  checkPdf: (document: ResumeDocument) =>
    fetchJson<PdfCheckReport>(
      `${API_BASE}/resumes/${document.metadata.id}/pdf-check`,
      { method: "POST", body: JSON.stringify(document) },
    ),
  updateSnippet: (id: string, payload: Partial<LibrarySnippet>) =>
    fetchJson<LibrarySnippet>(`${API_BASE}/library/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  async createVariant(
    document: ResumeDocument,
    targetJob: TargetJob,
  ): Promise<ResumeDocument> {
    return fetchJson(`${API_BASE}/resumes/${document.metadata.id}/variants`, {
      method: "POST",
      body: JSON.stringify({ document, targetJob }),
    });
  },
  async history(
    id: string,
  ): Promise<
    Array<{ revision: number; createdAt: string; document: ResumeDocument }>
  > {
    return fetchJson(`${API_BASE}/resumes/${id}/history`);
  },
  async restore(
    id: string,
    revision: number,
    expected: number,
  ): Promise<ResumeDocument> {
    return fetchJson(
      `${API_BASE}/resumes/${id}/restore/${revision}?expected_revision=${expected}`,
      { method: "POST" },
    );
  },
  async preview(
    document: ResumeDocument,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE}/resumes/${document.metadata.id}/preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
        signal,
      },
    );
    if (!response.ok)
      throw new Error(
        "Preview could not be rendered. Retry after checking the API.",
      );
    return response.text();
  },
  async pdfBlob(document: ResumeDocument): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/resumes/${document.metadata.id}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      },
    );
    if (!response.ok)
      throw new Error(
        "PDF could not be generated. Check that the API has Chromium installed.",
      );
    return response.blob();
  },
  async downloadPdf(document: ResumeDocument): Promise<void> {
    return api.downloadDocument(document, "pdf");
  },
  async downloadDocx(document: ResumeDocument): Promise<void> {
    return api.downloadDocument(document, "docx");
  },
  async downloadDocument(
    document: ResumeDocument,
    format: "pdf" | "docx",
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE}/resumes/${document.metadata.id}/export?format=${format}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      },
    );
    if (!response.ok)
      throw new Error(
        `${format.toUpperCase()} could not be generated. Please try again.`,
      );
    const url = URL.createObjectURL(await response.blob());
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.metadata.title.replace(/[^a-z0-9_-]/gi, "_") || "resume"}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  // Resumes
  async listResumes(includeArchived = false): Promise<ResumeSummary[]> {
    return fetchJson<ResumeSummary[]>(
      `${API_BASE}/resumes?include_archived=${includeArchived}`,
    );
  },

  async getResume(id: string): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}`);
  },

  async createResume(payload: {
    title: string;
    targetRole?: string;
    templateId?: string;
    initialData?: ResumeDocument;
  }): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateResume(
    id: string,
    revision: number,
    document: ResumeDocument,
  ): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ revision, document }),
    });
  },

  async patchMetadata(
    id: string,
    patch: {
      revision: number;
      title?: string;
      targetRole?: string;
      templateId?: string;
      isArchived?: boolean;
    },
  ): Promise<ResumeSummary> {
    return fetchJson<ResumeSummary>(`${API_BASE}/resumes/${id}/metadata`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async duplicateResume(id: string, title?: string): Promise<ResumeDocument> {
    const url = title
      ? `${API_BASE}/resumes/${id}/duplicate?title=${encodeURIComponent(title)}`
      : `${API_BASE}/resumes/${id}/duplicate`;
    return fetchJson<ResumeDocument>(url, { method: "POST" });
  },

  async deleteResume(id: string, permanent = false): Promise<void> {
    await fetchJson<void>(`${API_BASE}/resumes/${id}?permanent=${permanent}`, {
      method: "DELETE",
    });
  },

  async getAnalysis(
    id: string,
    document?: ResumeDocument,
    signal?: AbortSignal,
  ): Promise<ResumeAnalysisReport> {
    return fetchJson<ResumeAnalysisReport>(
      `${API_BASE}/resumes/${id}/analysis`,
      document
        ? { method: "POST", body: JSON.stringify(document), signal }
        : { signal },
    );
  },

  // Source Editor
  async getSource(
    id: string,
    format: "yaml" | "json" | "markdown",
  ): Promise<{ format: string; content: string; revision: number }> {
    return fetchJson<{ format: string; content: string; revision: number }>(
      `${API_BASE}/resumes/${id}/source?format=${format}`,
    );
  },

  async validateSource(
    id: string,
    format: "yaml" | "json" | "markdown",
    content: string,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    normalizedDocument: ResumeDocument | null;
  }> {
    return fetchJson(`${API_BASE}/resumes/${id}/source/validate`, {
      method: "POST",
      body: JSON.stringify({ format, content }),
    });
  },

  async applySource(
    id: string,
    format: "yaml" | "json" | "markdown",
    content: string,
    revision: number,
  ): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}/source`, {
      method: "PUT",
      body: JSON.stringify({ format, content, revision }),
    });
  },

  // Import
  async validateImport(
    content: string,
    format?: string,
  ): Promise<{
    valid: boolean;
    detectedFormat: string;
    schemaVersion: number;
    warnings: string[];
    errors: string[];
  }> {
    return fetchJson(`${API_BASE}/import/validate`, {
      method: "POST",
      body: JSON.stringify({ content, format }),
    });
  },

  async previewImport(
    content: string,
    format?: string,
  ): Promise<{
    valid: boolean;
    detectedFormat: string;
    schemaVersion: number;
    warnings: string[];
    errors: string[];
    previewDocument: ResumeDocument | null;
    sectionSummary: Record<string, number>;
  }> {
    return fetchJson(`${API_BASE}/import/preview`, {
      method: "POST",
      body: JSON.stringify({ content, format }),
    });
  },

  async applyImport(
    document: ResumeDocument,
    targetTitle?: string,
  ): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/import/apply`, {
      method: "POST",
      body: JSON.stringify({ document, targetTitle }),
    });
  },

  // Jobs
  async listJobs(status?: string): Promise<JobApplication[]> {
    const url = status
      ? `${API_BASE}/jobs?status=${status}`
      : `${API_BASE}/jobs`;
    return fetchJson<JobApplication[]>(url);
  },

  async getJob(id: string): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs/${id}`);
  },

  async createJob(payload: Partial<JobApplication>): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateJob(
    id: string,
    payload: Partial<JobApplication>,
  ): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteJob(id: string): Promise<void> {
    await fetchJson<void>(`${API_BASE}/jobs/${id}`, { method: "DELETE" });
  },

  emailDraft: (
    jobId: string,
    options: {
      kind: "follow-up" | "thank-you" | "negotiation";
      language: "en" | "tr";
      recipientName: string;
      requestedTerms: string;
    },
  ) =>
    fetchJson<EmailDraft>(`${API_BASE}/jobs/${jobId}/email-draft`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  translateResume: (document: ResumeDocument, targetLanguage: "en" | "tr") =>
    fetchJson<TranslationPreview>(`${API_BASE}/ai/translate`, {
      method: "POST",
      body: JSON.stringify({ document, targetLanguage }),
    }),
  importJobUrl: (url: string) =>
    fetchJson<ImportedJobListing>(`${API_BASE}/jobs/import-url`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  anonymousPreview: (document: ResumeDocument) =>
    fetchJson<ResumeDocument>(
      `${API_BASE}/resumes/${document.metadata.id}/export/anonymous/preview`,
      { method: "POST", body: JSON.stringify(document) },
    ),
  async anonymousPdfBlob(document: ResumeDocument): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/resumes/${document.metadata.id}/export/anonymous/pdf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
        signal: AbortSignal.timeout(120000),
      },
    );
    if (!response.ok) {
      const value = await response.json();
      throw new Error(value.error?.message || "Anonymous PDF export failed.");
    }
    return response.blob();
  },

  async matchJob(
    jobId: string,
    resumeId: string,
    requirements?: string[],
  ): Promise<JobMatchAnalysis> {
    return fetchJson<JobMatchAnalysis>(
      `${API_BASE}/jobs/${jobId}/match/${resumeId}`,
      {
        method: "POST",
        body: JSON.stringify({ requirements }),
      },
    );
  },

  async pageFit(
    document: ResumeDocument,
    targetPages: number,
  ): Promise<PageFitReport> {
    return fetchJson(`${API_BASE}/resumes/${document.metadata.id}/page-fit`, {
      method: "POST",
      body: JSON.stringify({ document, targetPages }),
    });
  },
  async coverLetter(
    jobId: string,
    resumeId: string,
    language: "en" | "tr",
    useAI: boolean,
  ): Promise<CoverLetterResult> {
    return fetchJson(`${API_BASE}/jobs/${jobId}/cover-letter`, {
      method: "POST",
      body: JSON.stringify({ resumeId, language, useAI }),
    });
  },

  // Library
  async listSnippets(
    type?: string,
    tag?: string,
    query?: string,
  ): Promise<LibrarySnippet[]> {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (tag) params.set("tag", tag);
    if (query) params.set("query", query);
    return fetchJson<LibrarySnippet[]>(
      `${API_BASE}/library?${params.toString()}`,
    );
  },

  async createSnippet(
    payload: Partial<LibrarySnippet>,
  ): Promise<LibrarySnippet> {
    return fetchJson<LibrarySnippet>(`${API_BASE}/library`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteSnippet(id: string): Promise<void> {
    await fetchJson<void>(`${API_BASE}/library/${id}`, { method: "DELETE" });
  },

  // AI Assistance
  async rewriteBullet(
    bullet: string,
    tone = "technical",
  ): Promise<{ original: string; suggestion: string; note: string }> {
    return fetchJson(`${API_BASE}/ai/rewrite-bullet`, {
      method: "POST",
      body: JSON.stringify({ bullet, tone }),
    });
  },

  async improveSummary(
    summary: string,
    targetRole = "",
  ): Promise<{ original: string; suggestion: string; note: string }> {
    return fetchJson(`${API_BASE}/ai/improve-summary`, {
      method: "POST",
      body: JSON.stringify({ summary, targetRole }),
    });
  },

  getExportUrl(resumeId: string, format: string, download = true): string {
    return `${API_BASE}/resumes/${resumeId}/export?format=${format}&download=${download}`;
  },
};

export interface AIConnection {
  enabled: boolean;
  provider: "openai-compatible" | "ollama" | "gemini";
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}
export interface AIDimension {
  score: number;
  rationale: string;
}
export interface AIEdit {
  documentId: string;
  target: {
    section: "summary" | "experience" | "projects";
    field: "summary" | "bullets";
    entryId: string | null;
    index: number | null;
  };
  before: string;
  after: string;
}
export interface AIReview {
  score: number;
  summary: string;
  model: string;
  provider: string;
  notice: string;
  clarity: AIDimension;
  evidence: AIDimension;
  completeness: AIDimension;
  relevance: AIDimension | null;
  strengths: string[];
  recommendations: Array<{
    section: string;
    priority: string;
    evidence: string;
    advice: string;
    suggestedText: string;
    edit?: AIEdit | null;
  }>;
  questions: string[];
}
export const aiApi = {
  settings: () => fetchJson<AIConnection>(`${API_BASE}/ai/settings`),
  save: (
    settings: Omit<AIConnection, "hasApiKey"> & {
      apiKey?: string;
      clearApiKey?: boolean;
    },
  ) =>
    fetchJson<AIConnection>(`${API_BASE}/ai/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  test: () =>
    fetchJson<{ message: string }>(`${API_BASE}/ai/test`, { method: "POST" }),
  review: (
    document: ResumeDocument,
    jobDescription: string,
    language: "en" | "tr",
    signal: AbortSignal,
  ) =>
    fetchJson<AIReview>(`${API_BASE}/ai/review`, {
      method: "POST",
      body: JSON.stringify({ document, jobDescription, language }),
      signal,
    }),
};
