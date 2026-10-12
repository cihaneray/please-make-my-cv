import { fetchJson } from "./api";
export interface FamilyChange {
  id: string;
  label: string;
  section: string;
  entryId: string | null;
  field: string;
  before: unknown;
  after: unknown;
  baseline: unknown;
  action: "field" | "add" | "remove";
  status: "safe" | "customized";
}
export interface FamilyReport {
  comparedFields: number;
  source: { id: string; title: string; revision: number };
  root: { id: string; title: string };
  documents: { id: string; title: string }[];
  variants: {
    id: string;
    title: string;
    revision: number;
    language: string;
    hasBaseline: boolean;
    changes: FamilyChange[];
  }[];
  findings: {
    documentId: string;
    title: string;
    section: string;
    entryId: string;
    field: string;
    source: unknown;
    variant: unknown;
  }[];
}
const base = process.env.NEXT_PUBLIC_API_URL || "/api";
export const familyApi = {
  preview: (id: string, signal?: AbortSignal) =>
    fetchJson<FamilyReport>(
      `${base}/resumes/${encodeURIComponent(id)}/family`,
      { signal },
    ),
  apply: (
    id: string,
    input: {
      sourceRevision: number;
      choices: { targetId: string; targetRevision: number; changeId: string }[];
      overwriteCustomized: boolean;
    },
  ) =>
    fetchJson<{ updated: string[]; count: number }>(
      `${base}/resumes/${encodeURIComponent(id)}/family/apply`,
      { method: "POST", body: JSON.stringify(input) },
    ),
};
