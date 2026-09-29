import {
  JobApplication,
  JobMatchAnalysis,
  LibrarySnippet,
  ResumeAnalysisReport,
  ResumeDocument,
  ResumeSummary,
  TargetJob,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const raw = await res.text();
    let errorDetail = raw || `Request failed (${res.status})`;
    try {
      const data = JSON.parse(raw);
      const detail = data?.error?.message || data?.detail;
      errorDetail =
        typeof detail === "string" ? detail : JSON.stringify(detail || data);
    } catch {
      /* Plain-text server error. */
    }

    const err = new Error(errorDetail);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
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
    const url = URL.createObjectURL(await response.blob());
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.metadata.title.replace(/[^a-z0-9_-]/gi, "_") || "resume"}.pdf`;
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
  ): Promise<ResumeAnalysisReport> {
    return fetchJson<ResumeAnalysisReport>(
      `${API_BASE}/resumes/${id}/analysis`,
      document ? { method: "POST", body: JSON.stringify(document) } : undefined,
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
