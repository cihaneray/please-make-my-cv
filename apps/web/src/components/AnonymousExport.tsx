"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import type { ResumeDocument } from "@/lib/types";
import { A4ResumePreview } from "./A4ResumePreview";

export function AnonymousExport({
  document,
  onClose,
}: {
  document: ResumeDocument;
  onClose: () => void;
}) {
  const copy = useCopy();
  const [preview, setPreview] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = window.document.activeElement as HTMLElement | null;
    const previousOverflow = window.document.body.style.overflow;
    element?.showModal();
    window.document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      element?.close();
      window.document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setError("");
    void api.anonymousPreview(document).then(
      (value) => {
        if (active) setPreview(value);
      },
      (reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : copy("Could not prepare anonymous preview."));
      },
    );
    return () => { active = false; };
  }, [document, copy]);

  async function download() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const blob = await api.anonymousPdfBlob(document);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = preview.metadata.language.toLowerCase() === "tr" ? "aday-cv.pdf" : "candidate-cv.pdf";
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy("Download failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-busy={busy}
        className="anonymous-export-dialog"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) onClose();
        }}
      >
        <div className="anonymous-export-header">
          <div>
            <h2 id={titleId}>{copy("Anonymous PDF")}</h2>
            <p>{copy("Review the redacted preview before downloading. Names, photo, contact details, and known personal values have been removed. Review free text for indirect identifiers or details we cannot recognize.")}</p>
          </div>
          <button type="button" ref={closeButton} onClick={onClose} aria-label={copy("Cancel")}>×</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {preview ? (
          <div className="anonymous-export-preview"><A4ResumePreview document={preview} /></div>
        ) : (
          <p role="status">{copy("Preparing anonymous preview…")}</p>
        )}
        <div className="anonymous-export-actions">
          <button type="button" onClick={onClose}>{copy("Cancel")}</button>
          <button type="button" disabled={!preview || busy} onClick={() => void download()}>
            {copy(busy ? "Preparing download…" : "Download anonymous PDF")}
          </button>
        </div>
      </dialog>
  );
}
