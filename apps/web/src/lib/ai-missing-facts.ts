import { fetchJson, type AIReview } from "./api";
import type { ResumeDocument } from "./types";

export interface MissingFactsResult {
  recommendations: AIReview["recommendations"];
  notice: string;
  model: string;
  provider: string;
}

export const missingFactsApi = {
  generate: (
    input: {
      document: ResumeDocument;
      answers: { question: string; answer: string }[];
      jobDescription: string;
      language: "en" | "tr";
    },
    signal: AbortSignal,
  ) =>
    fetchJson<MissingFactsResult>(
      `${process.env.NEXT_PUBLIC_API_URL || "/api"}/ai/missing-facts`,
      { method: "POST", body: JSON.stringify(input), signal },
    ),
};
