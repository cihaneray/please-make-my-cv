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
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setMessage("Done.");
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
