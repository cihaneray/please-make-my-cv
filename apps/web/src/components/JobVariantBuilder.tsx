"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { JobApplication, ResumeDocument, TargetJob } from "@/lib/types";
export function JobVariantBuilder({
  document,
  target,
  onTarget,
  disabled,
}: {
  document: ResumeDocument;
  target: TargetJob;
  onTarget: (target: TargetJob) => void;
  disabled: boolean;
}) {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ResumeDocument | null>(null);
  useEffect(() => {
    let active = true;
    api
      .listJobs()
      .then((data) => {
        if (active) setJobs(data);
      })
      .catch(() => {
        if (active)
          setError(
            "Saved jobs could not be loaded. You can enter a target below.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <details
      className="border rounded p-3 space-y-3"
      open={!!document.metadata.targetJob}
    >
      <summary className="cursor-pointer font-semibold">
        Job-specific resume copy
      </summary>
      {document.metadata.parentResumeId && (
        <p className="text-xs">
          Based on{" "}
          <Link
            className="underline"
            href={`/resumes/${document.metadata.parentResumeId}`}
          >
            the original resume
          </Link>
          .
        </p>
      )}
      {document.metadata.targetJob && (
        <p className="text-xs">
          The saved target is loaded below. Changes here affect this review;
          create another copy to save a different target.
        </p>
      )}
      <p className="text-sm">
        Create a separate copy of this draft for a target job, then review and
        accept tailored suggestions in the copy. Your original and job tracker
        links stay unchanged.
      </p>
      <label className="block text-sm">
        Use a saved job
        <select
          aria-label="Use a saved job"
          className="block w-full"
          disabled={busy || disabled}
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            const job = jobs.find((item) => item.id === e.target.value);
            if (job)
              onTarget({
                company: job.company,
                position: job.position,
                description: job.description,
              });
          }}
        >
          <option value="">Enter manually</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.position} — {job.company}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Target company
        <input
          className="block w-full"
          maxLength={255}
          value={target.company}
          onChange={(e) => {
            setSelected("");
            onTarget({ ...target, company: e.target.value });
          }}
        />
      </label>
      <label className="block text-sm">
        Target role
        <input
          className="block w-full"
          maxLength={255}
          value={target.position}
          onChange={(e) => {
            setSelected("");
            onTarget({ ...target, position: e.target.value });
          }}
        />
      </label>
      <p className="text-xs">
        Uses the target job description below. A role and description are
        required.
      </p>
      <button
        disabled={
          busy ||
          disabled ||
          !target.position.trim() ||
          !target.description.trim()
        }
        onClick={async () => {
          setBusy(true);
          setError("");
          setCreated(null);
          try {
            setCreated(await api.createVariant(document, target));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating copy…" : "Create job-specific copy"}
      </button>
      {error && <p role="alert">{error}</p>}
      {created && (
        <p role="status">
          Copy saved.{" "}
          <Link
            className="underline font-semibold"
            href={`/resumes/${created.metadata.id}`}
          >
            Open job-specific copy
          </Link>
        </p>
      )}
    </details>
  );
}
