"use client";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  JobApplication,
  ResumeDocument,
  ResumeSummary,
  JobMatchAnalysis,
} from "@/lib/types";
export function JobTools({
  job,
  resumes,
  onSaved,
  onMatch,
}: {
  job: JobApplication;
  resumes: ResumeSummary[];
  onSaved: (job: JobApplication) => void;
  onMatch: (match: JobMatchAnalysis) => void;
}) {
  const copy = useCopy();

  const [draft, setDraft] = useState<JobApplication>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`job-draft-${job.id}`) || "null",
      );
      return saved?.id === job.id && Array.isArray(saved.requirements)
        ? { ...job, ...saved }
        : job;
    } catch {
      return job;
    }
  });
  const [requirements, setRequirements] = useState(
    draft.requirements.join("\n"),
  );
  const editable = (value: JobApplication) =>
    JSON.stringify([
      value.company,
      value.position,
      value.location,
      value.url,
      value.description,
      value.notes,
      value.interviewAt,
      value.followUpDate,
      value.coverLetter,
      value.linkedResumeId,
      value.requirements,
    ]);
  const draftWithRequirements = useMemo(
    () => ({
      ...draft,
      requirements: requirements
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
    }),
    [draft, requirements],
  );
  const dirty = editable(draftWithRequirements) !== editable(job);
  useEffect(() => {
    setDraft((previous) => ({
      ...previous,
      status: job.status,
      timeline: job.timeline,
      updatedAt: job.updatedAt,
    }));
  }, [job.status, job.timeline, job.updatedAt]);
  useEffect(() => {
    try {
      if (dirty)
        localStorage.setItem(
          `job-draft-${job.id}`,
          JSON.stringify(draftWithRequirements),
        );
      else localStorage.removeItem(`job-draft-${job.id}`);
    } catch {
      /* Editing still works when browser storage is unavailable. */
    }
  }, [dirty, job.id, draftWithRequirements]);
  const [snapshots, setSnapshots] = useState<
    Array<{ id: string; createdAt: string; document: ResumeDocument }>
  >([]);
  const [message, setMessage] = useState("");
  const [letterLanguage, setLetterLanguage] = useState<"en" | "tr">("en");
  const [letterAI, setLetterAI] = useState(false);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      /* Actions set their own messages; keep generated draft guidance. */
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="workspace-tools border rounded p-3">
      <summary> {copy("Edit job, requirements and submitted copies")} </summary>
      <p role="status">
        {dirty
          ? copy("Unsaved job draft · stored in this browser")
          : copy("Saved")}
      </p>
      <fieldset disabled={busy} className="grid gap-3 py-3">
        {(
          [
            "company",
            "position",
            "location",
            "url",
            "description",
            "notes",
          ] as const
        ).map((key) => (
          <label key={key} className="grid">
            {copy(key.charAt(0).toUpperCase() + key.slice(1))}
            <textarea
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        <label>
          {" "}
          {copy("Linked resume")}{" "}
          <select
            value={draft.linkedResumeId || ""}
            onChange={(e) =>
              setDraft({ ...draft, linkedResumeId: e.target.value || null })
            }
          >
            <option value=""> {copy("None")} </option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          {copy("Interview date and time")}
          <input
            type="datetime-local"
            value={draft.interviewAt || ""}
            onChange={(e) =>
              setDraft({ ...draft, interviewAt: e.target.value })
            }
          />
        </label>
        <label>
          {copy("Follow-up date")}
          <input
            type="date"
            value={draft.followUpDate || ""}
            onChange={(e) =>
              setDraft({ ...draft, followUpDate: e.target.value })
            }
          />
        </label>
        <section className="workflow-tool">
          <h3>{copy("Cover letter")}</h3>
          <label>
            {copy("Letter language")}
            <select
              value={letterLanguage}
              onChange={(e) => setLetterLanguage(e.target.value as "en" | "tr")}
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={letterAI}
              onChange={(e) => setLetterAI(e.target.checked)}
            />
            {copy("Use configured AI connection")}
          </label>
          <p>
            {copy(
              "Local drafts quote CV evidence. AI sends the saved CV without contact fields and the saved job description to your configured provider.",
            )}
          </p>
          <button
            type="button"
            disabled={!draft.linkedResumeId}
            onClick={() =>
              run(async () => {
                if (dirty) {
                  setMessage(
                    copy(
                      "Save the job first to generate from the current requirements.",
                    ),
                  );
                  return;
                }
                if (
                  draft.coverLetter.trim() &&
                  !confirm(copy("Replace the existing letter draft?"))
                )
                  return;
                const result = await api.coverLetter(
                  job.id,
                  draft.linkedResumeId!,
                  letterLanguage,
                  letterAI,
                );
                setDraft((previous) => ({
                  ...previous,
                  coverLetter: result.text,
                }));
                setMessage(copy(result.notice));
              })
            }
          >
            {copy("Generate letter draft")}
          </button>
          <label>
            {copy("Letter text")}
            <textarea
              rows={10}
              value={draft.coverLetter || ""}
              onChange={(e) =>
                setDraft({ ...draft, coverLetter: e.target.value })
              }
            />
          </label>
          <button
            type="button"
            disabled={!draft.coverLetter}
            onClick={() => {
              const blob = new Blob([draft.coverLetter], {
                type: "text/plain;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement("a");
              a.href = url;
              a.download = "cover-letter.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {copy("Download letter")}
          </button>
        </section>
        <button
          onClick={() =>
            run(async () =>
              onSaved(
                await api.updateJob(job.id, {
                  company: draft.company,
                  position: draft.position,
                  location: draft.location,
                  url: draft.url,
                  description: draft.description,
                  notes: draft.notes,
                  interviewAt: draft.interviewAt,
                  followUpDate: draft.followUpDate,
                  coverLetter: draft.coverLetter,
                  linkedResumeId: draft.linkedResumeId,
                  requirements: requirements
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                }),
              ),
            )
          }
        >
          {" "}
          {copy("Save job")}{" "}
        </button>
        <label className="grid">
          {" "}
          {copy("Requirements to compare (one per line)")}{" "}
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Add requirements from any occupation"
          />
        </label>
        <button
          disabled={!draft.linkedResumeId || !requirements.trim()}
          onClick={() =>
            run(async () =>
              onMatch(
                await api.matchJob(
                  job.id,
                  draft.linkedResumeId!,
                  requirements.split("\n").filter(Boolean),
                ),
              ),
            )
          }
        >
          {" "}
          {copy("Compare these requirements")}{" "}
        </button>
        <p>
          {" "}
          {copy(
            "Matching checks explicit terms; it does not verify experience or predict hiring outcomes.",
          )}{" "}
        </p>
        <button
          onClick={() =>
            run(async () => {
              const response = await fetch(`/api/jobs/${job.id}/snapshots`);
              if (!response.ok)
                throw new Error("Could not load submitted copies");
              setSnapshots(await response.json());
            })
          }
        >
          {" "}
          {copy("Load submitted copies")}{" "}
        </button>
        {snapshots.map((row) => (
          <button
            key={row.id}
            onClick={() => run(() => api.downloadPdf(row.document))}
          >
            {" "}
            {copy("Download submitted copy (")} {row.createdAt})
          </button>
        ))}
        <p role="status">{message}</p>
        <section aria-label={copy("Application timeline")}>
          <h3>{copy("Application timeline")}</h3>
          {!job.timeline.length && (
            <p>
              {copy("No recorded status history for this older application.")}
            </p>
          )}
          <ol>
            {job.timeline.map((event) => (
              <li key={event.id}>
                <time dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>{" "}
                · {copy(event.status)}
              </li>
            ))}
          </ol>
        </section>
      </fieldset>
    </details>
  );
}
