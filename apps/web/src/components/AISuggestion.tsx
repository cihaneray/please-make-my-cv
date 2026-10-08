"use client";
import { useId, useState } from "react";
import { AIEdit, AIReview } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { readAIField } from "@/lib/ai-edits";
import { useCopy } from "@/lib/copy";
import { Icons } from "./Icons";
export function AISuggestion({
  item,
  document,
  disabled,
  onApply,
}: {
  item: AIReview["recommendations"][number];
  document: ResumeDocument;
  disabled: boolean;
  onApply: (edit: AIEdit) => void;
}) {
  const copy = useCopy();
  const headingId = useId();
  const [skipped, setSkipped] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const edit = item.edit;
  const current = edit ? readAIField(document, edit) : undefined;
  const applied = !!(accepted && edit && current === edit.after);
  const changed = !!edit && current !== edit.before && !applied;
  return (
    <article
      className={`ai-suggestion ${applied ? "is-applied" : ""} ${skipped ? "is-skipped" : ""}`}
      aria-labelledby={headingId}
    >
      <header className="ai-suggestion-header">
        <h4 id={headingId}>{copy(item.section)}</h4>
        <span className="ai-suggestion-priority">
          {copy(`${item.priority} priority`)}
        </span>
      </header>
      {skipped ? (
        <div className="ai-suggestion-actions">
          <span className="ai-suggestion-hint">
            {copy("Suggestion skipped.")}
          </span>
          <button onClick={() => setSkipped(false)}>
            {copy("Show skipped suggestion")}
          </button>
        </div>
      ) : (
        <>
          {item.evidence && (
            <p className="ai-suggestion-evidence">
              <strong>{copy("Evidence")}:</strong> {item.evidence}
            </p>
          )}
          <p>{item.advice}</p>
          {edit ? (
            <>
              <div className="ai-suggestion-comparison">
                <div>
                  <h5>{copy("Before")}</h5>
                  <p>{edit.before || copy("(Empty field)")}</p>
                </div>
                <div>
                  <h5>{copy("After")}</h5>
                  <p>{edit.after}</p>
                </div>
              </div>
              <p className="ai-suggestion-hint">
                {copy(
                  "Verify every claim before applying. This changes the draft; use Save Draft to keep it.",
                )}
              </p>
              {changed && (
                <p className="ai-suggestion-stale" role="status">
                  {copy(
                    "This field changed since the review. Run a new review to avoid overwriting your edits.",
                  )}
                </p>
              )}
            </>
          ) : item.suggestedText ? (
            <>
              <blockquote className="ai-suggestion-advice">
                {item.suggestedText}
              </blockquote>
              <p className="ai-suggestion-hint">
                {copy("Advice only: no safe field replacement was identified.")}
              </p>
            </>
          ) : null}
          <footer className="ai-suggestion-actions">
            {applied && edit ? (
              <>
                <span className="ai-suggestion-applied" role="status">
                  <span aria-hidden="true">
                    <Icons.Check size={16} />
                  </span>
                  {copy("Applied to draft.")}
                </span>
                <button
                  disabled={disabled}
                  onClick={() => {
                    onApply({
                      ...edit,
                      before: edit.after,
                      after: edit.before,
                    });
                    setAccepted(false);
                  }}
                >
                  {copy("Undo this suggestion")}
                </button>
              </>
            ) : (
              <>
                {edit && (
                  <button
                    className="ai-suggestion-apply"
                    disabled={disabled || changed}
                    onClick={() => {
                      onApply(edit);
                      setAccepted(true);
                    }}
                  >
                    <span aria-hidden="true">
                      <Icons.Check size={16} />
                    </span>
                    {copy("Apply suggestion")}
                  </button>
                )}
                <button disabled={disabled} onClick={() => setSkipped(true)}>
                  {copy("Skip suggestion")}
                </button>
              </>
            )}
          </footer>
        </>
      )}
    </article>
  );
}
