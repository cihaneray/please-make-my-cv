import {
  JobApplication,
  JobMatchAnalysis,
  LibrarySnippet,
  ResumeAnalysisReport,
  ResumeDocument,
  ResumeSummary,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson?.error?.message || errorJson?.detail || JSON.stringify(errorJson);
    } catch {
      errorDetail = await res.text();
    }
    const err = new Error(errorDetail);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  // Resumes
  async listResumes(includeArchived = false): Promise<ResumeSummary[]> {
    return fetchJson<ResumeSummary[]>(`${API_BASE}/resumes?include_archived=${includeArchived}`);
  },

  async getResume(id: string): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}`);
  },

  async createResume(payload: { title: string; targetRole?: string; templateId?: string; initialData?: ResumeDocument }): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateResume(id: string, revision: number, document: ResumeDocument): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ revision, document }),
    });
  },

  async patchMetadata(id: string, patch: { title?: string; targetRole?: string; templateId?: string; isArchived?: boolean }): Promise<ResumeSummary> {
    return fetchJson<ResumeSummary>(`${API_BASE}/resumes/${id}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async duplicateResume(id: string, title?: string): Promise<ResumeDocument> {
    const url = title ? `${API_BASE}/resumes/${id}/duplicate?title=${encodeURIComponent(title)}` : `${API_BASE}/resumes/${id}/duplicate`;
    return fetchJson<ResumeDocument>(url, { method: 'POST' });
  },

  async deleteResume(id: string, permanent = false): Promise<void> {
    await fetch(`${API_BASE}/resumes/${id}?permanent=${permanent}`, { method: 'DELETE' });
  },

  async getAnalysis(id: string): Promise<ResumeAnalysisReport> {
    return fetchJson<ResumeAnalysisReport>(`${API_BASE}/resumes/${id}/analysis`);
  },

  // Source Editor
  async getSource(id: string, format: 'yaml' | 'json' | 'markdown'): Promise<{ format: string; content: string; revision: number }> {
    return fetchJson<{ format: string; content: string; revision: number }>(`${API_BASE}/resumes/${id}/source?format=${format}`);
  },

  async validateSource(id: string, format: 'yaml' | 'json' | 'markdown', content: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    normalizedDocument: ResumeDocument | null;
  }> {
    return fetchJson(`${API_BASE}/resumes/${id}/source/validate`, {
      method: 'POST',
      body: JSON.stringify({ format, content }),
    });
  },

  async applySource(id: string, format: 'yaml' | 'json' | 'markdown', content: string, revision: number): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/resumes/${id}/source`, {
      method: 'PUT',
      body: JSON.stringify({ format, content, revision }),
    });
  },

  // Import
  async validateImport(content: string, format?: string): Promise<{
    valid: boolean;
    detectedFormat: string;
    schemaVersion: number;
    warnings: string[];
    errors: string[];
  }> {
    return fetchJson(`${API_BASE}/import/validate`, {
      method: 'POST',
      body: JSON.stringify({ content, format }),
    });
  },

  async previewImport(content: string, format?: string): Promise<{
    valid: boolean;
    detectedFormat: string;
    schemaVersion: number;
    warnings: string[];
    errors: string[];
    previewDocument: ResumeDocument | null;
    sectionSummary: Record<string, number>;
  }> {
    return fetchJson(`${API_BASE}/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ content, format }),
    });
  },

  async applyImport(document: ResumeDocument, targetTitle?: string): Promise<ResumeDocument> {
    return fetchJson<ResumeDocument>(`${API_BASE}/import/apply`, {
      method: 'POST',
      body: JSON.stringify({ document, targetTitle }),
    });
  },

  // Jobs
  async listJobs(status?: string): Promise<JobApplication[]> {
    const url = status ? `${API_BASE}/jobs?status=${status}` : `${API_BASE}/jobs`;
    return fetchJson<JobApplication[]>(url);
  },

  async getJob(id: string): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs/${id}`);
  },

  async createJob(payload: Partial<JobApplication>): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateJob(id: string, payload: Partial<JobApplication>): Promise<JobApplication> {
    return fetchJson<JobApplication>(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteJob(id: string): Promise<void> {
    await fetch(`${API_BASE}/jobs/${id}`, { method: 'DELETE' });
  },

  async matchJob(jobId: string, resumeId: string): Promise<JobMatchAnalysis> {
    return fetchJson<JobMatchAnalysis>(`${API_BASE}/jobs/${jobId}/match/${resumeId}`, {
      method: 'POST',
    });
  },

  // Library
  async listSnippets(type?: string, tag?: string, query?: string): Promise<LibrarySnippet[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (tag) params.set('tag', tag);
    if (query) params.set('query', query);
    return fetchJson<LibrarySnippet[]>(`${API_BASE}/library?${params.toString()}`);
  },

  async createSnippet(payload: Partial<LibrarySnippet>): Promise<LibrarySnippet> {
    return fetchJson<LibrarySnippet>(`${API_BASE}/library`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteSnippet(id: string): Promise<void> {
    await fetch(`${API_BASE}/library/${id}`, { method: 'DELETE' });
  },

  // AI Assistance
  async rewriteBullet(bullet: string, tone = 'technical'): Promise<{ original: string; suggestion: string; note: string }> {
    return fetchJson(`${API_BASE}/ai/rewrite-bullet`, {
      method: 'POST',
      body: JSON.stringify({ bullet, tone }),
    });
  },

  async improveSummary(summary: string, targetRole = ''): Promise<{ original: string; suggestion: string; note: string }> {
    return fetchJson(`${API_BASE}/ai/improve-summary`, {
      method: 'POST',
      body: JSON.stringify({ summary, targetRole }),
    });
  },

  getExportUrl(resumeId: string, format: string, download = true): string {
    return `${API_BASE}/resumes/${resumeId}/export?format=${format}&download=${download}`;
  },
};
