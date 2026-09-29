import type { AIEdit } from "./api";
import type { ResumeDocument } from "./types";

export function readAIField(
  document: ResumeDocument,
  edit: AIEdit,
): string | undefined {
  if (document.metadata.id !== edit.documentId) return undefined;
  const { section, field, entryId, index } = edit.target;
  if (
    section === "summary" &&
    field === "summary" &&
    entryId === null &&
    index === null
  )
    return document.summary;
  if (section !== "experience" && section !== "projects") return undefined;
  const entry = document[section].find((item) => item.id === entryId);
  if (!entry) return undefined;
  if (
    section === "experience" &&
    field === "summary" &&
    index === null &&
    "summary" in entry
  )
    return entry.summary;
  if (
    field === "bullets" &&
    Number.isInteger(index) &&
    index !== null &&
    index >= 0
  )
    return entry.bullets[index];
  return undefined;
}

export function applyAIEdit(
  document: ResumeDocument,
  edit: AIEdit,
): ResumeDocument {
  if (readAIField(document, edit) !== edit.before) return document;
  const next = structuredClone(document);
  const { section, field, entryId, index } = edit.target;
  if (section === "summary") next.summary = edit.after;
  else if (section === "experience" || section === "projects") {
    const entry = next[section].find((item) => item.id === entryId)!;
    if (field === "summary" && "summary" in entry) entry.summary = edit.after;
    else if (field === "bullets" && index !== null)
      entry.bullets[index] = edit.after;
  }
  return next;
}
