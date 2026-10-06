"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { JobApplication, PdfCheckReport, ResumeDocument } from "@/lib/types";
import { useCopy } from "@/lib/copy";
import { Icons } from "./Icons";

type Check = { name: string; ok: boolean; section?: string };
export function ApplicationPreparation({
  job,
  dirty,
  onDocuments,
}: {
  job: JobApplication;
  dirty: boolean;
  onDocuments: () => void;
}) {
  const copy = useCopy();
  const generation = useRef(0);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [pdf, setPdf] = useState<PdfCheckReport | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    generation.current++;
    setChecks(null);
    setPdf(null);
    setRevision(null);
    setError("");
    setNotice("");
  }, [job.linkedResumeId, job.coverLetter, job.updatedAt, dirty]);
  async function check() {
    if (!job.linkedResumeId || dirty) return;
    const token = generation.current;
    setBusy(true);
    setError("");
    setChecks(null);
    setPdf(null);
    setRevision(null);
    try {
      const doc = await api.getResume(job.linkedResumeId);
      if (generation.current !== token) return;
      const visible: Record<string, unknown> = {
        profile: doc.profile,
        customSections: doc.customSections,
      };
      for (const section of [
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
        "certifications",
        "languages",
      ] as const) {
        const key =
          `show${section[0].toUpperCase()}${section.slice(1)}` as keyof ResumeDocument["visibility"];
        if (doc.visibility[key]) visible[section] = doc[section];
      }
      const placeholder =
        /\b(?:todo|tbd|lorem ipsum|your name|placeholder)\b|buraya yaz|adınızı yaz/iu;
      setChecks([
        {
          name: "Name and surname are filled",
          ok: !!doc.profile.firstName.trim() && !!doc.profile.lastName.trim(),
          section: "profile",
        },
        {
          name: "Contact email has a valid format",
          ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.profile.email.trim()),
          section: "profile",
        },
        {
          name: "Professional headline is filled",
          ok: !!doc.profile.headline.trim(),
          section: "profile",
        },
        {
          name: "No common draft placeholders found",
          ok: !placeholder.test(JSON.stringify(visible)),
          section: "summary",
        },
        { name: "Cover letter is saved", ok: !!job.coverLetter.trim() },
      ]);
      setRevision(doc.metadata.revision);
      const result = await api.checkPdf(doc);
      if (generation.current === token) setPdf(result);
    } catch (e) {
      if (generation.current === token) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/jobs/${job.id}/package`, {
        method: "POST",
      });
      if (!response.ok) {
        let detail = "Could not download the application package.";
        try {
          detail = (await response.json()).detail || detail;
        } catch {}
        throw new Error(detail);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stem = `${job.company}-${job.position}`
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .slice(0, 100);
      a.download = `${stem || "application"}-application.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        copy(
          "Package downloaded. It contains the current saved CV and cover letter.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const findings =
    (checks?.filter((row) => !row.ok).length || 0) + (pdf?.issues.length || 0);
  return (
    <section
      className="application-preparation"
      aria-label={copy("Ready to apply")}
    >
      <header className="dossier-section-heading">
        <h3>{copy("Ready to apply")}</h3>
        <button
          type="button"
          className="editorial-button"
          disabled={busy || dirty || !job.linkedResumeId}
          onClick={check}
        >
          {copy(busy ? "Working…" : "Check application")}
        </button>
      </header>
      <p className="dossier-hint">
        {copy(
          "Checks use the saved linked CV and its actual PDF. They are preparation reminders, not a hiring score.",
        )}
      </p>
      {dirty && (
        <p className="preparation-notice">
          {copy("Save application edits before checking or downloading.")}
        </p>
      )}
      {!job.linkedResumeId && (
        <button
          type="button"
          className="editorial-button"
          onClick={onDocuments}
        >
          {copy("Link a CV")}
        </button>
      )}
      {checks && (
        <div aria-live="polite">
          <p className="preparation-result">
            {copy("Checked revision")}: {revision} ·{" "}
            {pdf
              ? `${findings} ${copy("items to review")}`
              : copy(busy ? "Checking PDF…" : "PDF check incomplete")}
          </p>
          <ul className="preparation-checks">
            {checks.map((row) => (
              <li key={row.name} data-result={row.ok ? "pass" : "review"}>
                {row.ok ? (
                  <Icons.Check size={16} />
                ) : (
                  <Icons.AlertTriangle size={16} />
                )}
                <span>
                  <span className="sr-only">
                    {copy(row.ok ? "Complete" : "Review")}:{" "}
                  </span>
                  {copy(row.name)}
                </span>
                {!row.ok &&
                  (row.section ? (
                    <a
                      href={`/resumes/${job.linkedResumeId}?section=${row.section}`}
                    >
                      {copy("Open in CV")}
                    </a>
                  ) : (
                    <button type="button" onClick={onDocuments}>
                      {copy("Documents")}
                    </button>
                  ))}
              </li>
            ))}
          </ul>
          {pdf && (
            <div className="preparation-pdf">
              <p>
                {copy("Actual PDF")}: {pdf.pageCount} {copy("pages")}
              </p>
              {pdf.issues.length ? (
                <ul>
                  {pdf.issues.map((issue, i) => (
                    <li key={i}>
                      {issue.page ? `${copy("Page")} ${issue.page}: ` : ""}
                      {copy(issue.message)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{copy("No PDF layout issues detected.")}</p>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p role="alert">{copy(error)}</p>}
      <div className="preparation-package">
        <div>
          <h4>{copy("Application package")}</h4>
          <p>
            {copy(
              "One ZIP with cv.pdf and cover-letter.txt, named for the company and position. Downloading does not submit the application.",
            )}
          </p>
        </div>
        <button
          type="button"
          className="editorial-button"
          disabled={
            busy || dirty || !job.linkedResumeId || !job.coverLetter.trim()
          }
          onClick={download}
        >
          <Icons.Download size={14} />
          {copy("Download package")}
        </button>
      </div>
      {!job.coverLetter.trim() && (
        <p className="dossier-hint">
          {copy(
            "Save a cover letter in Documents to include it in the package.",
          )}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
