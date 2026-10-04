"use client";
import { useCopy } from "@/lib/copy";
import React, { useState } from "react";
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

  const [draft, setDraft] = useState(job);
  const [requirements, setRequirements] = useState(job.requirements.join("\n"));
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
            {key}
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
                  ...draft,
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
      </fieldset>
    </details>
  );
}
