"use client";
import { useEffect, useRef } from "react";
import { useCopy } from "@/lib/copy";
export function SuggestionDialog({
  before,
  after,
  current,
  onApply,
  onClose,
}: {
  before: string;
  after: string;
  current: string | undefined;
  onApply: () => void;
  onClose: () => void;
}) {
  const copy = useCopy(),
    dialog = useRef<HTMLDialogElement>(null);
  const stale = current !== before;
  useEffect(() => {
    const element = dialog.current,
      focus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      focus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="resume-delete-dialog"
      aria-labelledby="suggestion-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="resume-delete-content">
        <h2 id="suggestion-title">{copy("Review suggested wording")}</h2>
        <div>
          <strong>{copy("Before")}</strong>
          <p>{before}</p>
        </div>
        <div>
          <strong>{copy("After")}</strong>
          <p>{after}</p>
        </div>
        <p>
          {copy(
            stale
              ? "This field changed after the suggestion. Request a new suggestion to preserve your edits."
              : "Verify the wording before applying. This changes only the draft.",
          )}
        </p>
        <div className="resume-delete-actions">
          <button onClick={onClose}>{copy("Skip suggestion")}</button>
          <button disabled={stale} onClick={onApply}>
            {copy("Apply suggestion")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
