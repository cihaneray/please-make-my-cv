"use client";
import { useEffect, useState } from "react";
import { useCopy } from "@/lib/copy";
import { api } from "@/lib/api";
import { JobMatchAnalysis, ResumeDocument } from "@/lib/types";
import { Icons } from "./Icons";
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    <>
      {text
        .split(new RegExp(`(${escaped})`, "gi"))
        .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}
export function ApplicationEvidence({
  jobId,
  result,
}: {
  jobId: string;
  result: JobMatchAnalysis;
}) {
  const copy = useCopy();
  const [document, setDocument] = useState<ResumeDocument | null>(null);
  const [open, setOpen] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(`job-evidence-${jobId}`) || "[]",
      );
      return Array.isArray(stored)
        ? stored.filter((value) => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    api
      .getResume(result.resumeId)
      .then((doc) => {
        if (!cancelled) setDocument(doc);
      })
      .catch(() => {
        /* Evidence text remains available without entry labels. */
      });
    return () => {
      cancelled = true;
    };
  }, [result.resumeId]);
  useEffect(() => {
    try {
      sessionStorage.setItem(`job-evidence-${jobId}`, JSON.stringify(open));
    } catch {
      /* Expansion works without browser storage. */
    }
  }, [jobId, open]);
  const sourceTitle = (section: string, entryId: string | null | undefined) => {
    const items = document?.[section as keyof ResumeDocument];
    if (!Array.isArray(items) || !entryId) return copy(section);
    const entry = items.find(
      (row) =>
        typeof row === "object" && row && "id" in row && row.id === entryId,
    ) as Record<string, unknown> | undefined;
    return String(
      entry?.company ||
        entry?.institution ||
        entry?.name ||
        entry?.category ||
        copy(section),
    );
  };
  const requirements = Array.from(new Set(result.matchedSkills));
  return (
    <section
      className="application-evidence"
      aria-label={copy("Requirement evidence")}
    >
      <div className="dossier-section-heading">
        <h3>{copy("Evidence in your CV")}</h3>
        <span>
          {requirements.length} {copy("matched")}
        </span>
      </div>
      {!requirements.length && (
        <p className="dossier-hint">
          {copy(
            "No matching evidence yet. Review the requirements and linked CV.",
          )}
        </p>
      )}
      <div className="evidence-list">
        {requirements.map((requirement) => {
          const sourcePriority: Record<string, number> = {
            experience: 0,
            projects: 1,
            education: 2,
            summary: 3,
            skills: 4,
          };
          const sources = result.evidence
            .filter((row) => row.requirement === requirement)
            .sort(
              (a, b) =>
                (sourcePriority[a.section] ?? 5) -
                  (sourcePriority[b.section] ?? 5) ||
                b.text.length - a.text.length,
            );
          return (
            <details
              className="evidence-card"
              key={requirement}
              open={open.includes(requirement)}
              onToggle={(event) => {
                const expanded = event.currentTarget.open;
                setOpen((previous) =>
                  expanded
                    ? previous.includes(requirement)
                      ? previous
                      : [...previous, requirement]
                    : previous.filter((value) => value !== requirement),
                );
              }}
            >
              <summary>
                <span className="evidence-heading">
                  <strong>{requirement}</strong>
                  <span className="evidence-count">
                    {sources.length} {copy("sources")}
                  </span>
                  <Icons.ArrowRight size={16} />
                </span>
                {sources[0] && (
                  <span className="evidence-preview">
                    <small>
                      {sourceTitle(sources[0].section, sources[0].entryId)}
                    </small>
                    <span>
                      <Highlight text={sources[0].text} term={requirement} />
                    </span>
                  </span>
                )}
              </summary>
              <div className="evidence-sources">
                {sources.map((source, index) => (
                  <div
                    className="evidence-source"
                    key={`${source.section}-${source.entryId}-${index}`}
                  >
                    <div>
                      <span>
                        {copy(source.section)} ·{" "}
                        {sourceTitle(source.section, source.entryId)}
                      </span>
                      <a
                        href={`/resumes/${result.resumeId}?section=${encodeURIComponent(source.section)}${source.entryId ? `&entry=${encodeURIComponent(source.entryId)}` : ""}`}
                      >
                        {copy("Open in CV")} <Icons.ArrowRight size={12} />
                      </a>
                    </div>
                    <p>
                      <Highlight text={source.text} term={requirement} />
                    </p>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
