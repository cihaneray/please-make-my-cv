"use client";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/lib/copy";
import { api } from "@/lib/api";
import { ResumeSummary } from "@/lib/types";
import { Icons } from "./Icons";

export function ResumeDeleteDialog({
  resume,
  onClose,
  onDeleted,
}: {
  resume: ResumeSummary;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const copy = useCopy(),
    dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current,
      focus = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
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
      await api.deleteResume(resume.id, resume.isArchived);
      onDeleted(resume.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : copy("Could not delete CV."),
      );
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="resume-delete-dialog"
      aria-labelledby="resume-delete-title"
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="resume-delete-content">
        <span className="resume-delete-symbol">
          <Icons.Delete size={24} />
        </span>
        <h2 id="resume-delete-title">
          {resume.isArchived
            ? copy("Delete CV permanently?")
            : copy("Delete this CV?")}
        </h2>
        <strong className="resume-delete-name">{resume.title}</strong>
        <p>
          {resume.isArchived
            ? copy(
                "This removes the CV and its revision history permanently. Linked jobs will be unlinked; submitted copies stay unchanged.",
              )
            : copy(
                "The CV will move to deleted documents. You can restore it there, and its history will be kept.",
              )}
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="resume-delete-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            {copy("Cancel")}
          </button>
          <button
            type="button"
            className="resume-delete-confirm"
            disabled={busy}
            onClick={remove}
          >
            {busy
              ? copy("Working…")
              : resume.isArchived
                ? copy("Delete permanently")
                : copy("Move to deleted documents")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
