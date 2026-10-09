import { ResumeDocument } from "./types";
export const sections = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
  "customSections",
] as const;
export type SectionKey = (typeof sections)[number];
export function sectionOrder(doc: ResumeDocument): SectionKey[] {
  const defaults: SectionKey[] = ["technical", "classic"].includes(
    doc.design.template || doc.metadata.templateId,
  )
    ? [
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "certifications",
        "languages",
        "customSections",
      ]
    : [...sections];
  return Array.from(new Set([...(doc.design.sectionOrder || []), ...defaults]));
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  )
    return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
