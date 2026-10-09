"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { JobApplication } from "@/lib/types";
import { Icons } from "./Icons";

export function JobDeleteDialog({
  job,
  onClose,
  onDeleted,
}: {
  job: JobApplication;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const copy = useCopy();
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      focus?.focus();
    };
  }, []);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteJob(job.id);
      onDeleted(job.id);
      onClose();
    } catch (err: unknown) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="resume-delete-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="resume-delete-content">
        <span className="resume-delete-symbol">
          <Icons.Delete size={24} />
        </span>
        <h2 id={titleId}>{copy("Delete this job?")}</h2>
        <strong className="resume-delete-name">
          {job.position} · {job.company}
        </strong>
        <p id={descriptionId}>
          {copy(
            "This permanently removes the job, its application history, saved letter and submitted copies. Your original and tailored CVs stay in your document list. Unsaved edits to this job will also be discarded.",
          )}
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="resume-delete-actions">
          <button type="button" disabled={busy} onClick={onClose} autoFocus>
            {copy("Cancel")}
          </button>
          <button
            type="button"
            className="resume-delete-confirm"
            disabled={busy}
            onClick={remove}
          >
            {busy ? copy("Working…") : copy("Delete job permanently")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
