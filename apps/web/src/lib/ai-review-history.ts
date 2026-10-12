import { fetchJson, type AIReview } from "./api";
import type { ResumeDocument } from "./types";

export interface AIReviewHistoryRecord {
  id: string;
  resumeId: string;
  revision: number;
  jobDescription: string;
  language: "en" | "tr";
  model: string;
  provider: string;
  createdAt: string;
  document: ResumeDocument;
  result: AIReview;
}

export interface AIReviewHistoryContext {
  jobDescription: string;
  language: "en" | "tr";
}

const base = `${process.env.NEXT_PUBLIC_API_URL || "/api"}/ai/reviews`;
export const aiReviewHistoryApi = {
  saveReview: (
    request: AIReviewHistoryContext & {
      document: ResumeDocument;
      result: AIReview;
    },
  ) =>
    fetchJson<AIReviewHistoryRecord>(base, {
      method: "POST",
      body: JSON.stringify(request),
    }),
  list: (
    documentId: string,
    jobDescription: string,
    language: "en" | "tr",
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({
      resumeId: documentId,
      jobDescription,
      language,
    });
    return fetchJson<AIReviewHistoryRecord[]>(`${base}?${params}`, { signal });
  },
  get: (id: string) =>
    fetchJson<AIReviewHistoryRecord>(`${base}/${encodeURIComponent(id)}`),
};

export function reviewDimensionDeltas(
  current: AIReviewHistoryRecord,
  previous: AIReviewHistoryRecord,
) {
  if (
    current.resumeId !== previous.resumeId ||
    current.jobDescription !== previous.jobDescription ||
    current.language !== previous.language
  )
    return null;
  return (["clarity", "evidence", "completeness", "relevance"] as const).map(
    (dimension) => ({
      dimension,
      delta:
        current.result[dimension] && previous.result[dimension]
          ? current.result[dimension]!.score - previous.result[dimension]!.score
          : null,
    }),
  );
}
