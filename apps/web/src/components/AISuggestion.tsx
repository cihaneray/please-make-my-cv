"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AIEdit, AIReview } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { readAIField } from "@/lib/ai-edits";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { Icons } from "./Icons";
import styles from "./AISuggestion.module.css";

export type AISuggestionStatus = "pending" | "applied" | "skipped";

export function AISuggestion({
  item,
  document,
  disabled,
  onApply,
  onStatusChange,
  onNavigate,
}: {
  item: AIReview["recommendations"][number];
  document: ResumeDocument;
  disabled: boolean;
  onApply: (edit: AIEdit) => void;
  onStatusChange?: (status: AISuggestionStatus) => void;
  onNavigate?: (edit: AIEdit) => void;
}) {
  const copy = useCopy();
  const { language } = useI18n();
  const headingId = useId();
  const [skipped, setSkipped] = useState(false);
  const [appliedEdit, setAppliedEdit] = useState<AIEdit | null>(null);
  const [suggestedText, setSuggestedText] = useState(item.edit?.after ?? "");
  const onStatusChangeRef = useRef(onStatusChange);
  const edit = item.edit;
  const current = edit ? readAIField(document, edit) : undefined;
  const applied = !!(
    appliedEdit &&
    edit &&
    current === appliedEdit.after &&
    appliedEdit.before === edit.before
  );
  const changed = !!edit && current !== edit.before && !applied;
  const status: AISuggestionStatus = skipped
    ? "skipped"
    : applied
      ? "applied"
      : "pending";

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  useEffect(() => onStatusChangeRef.current?.(status), [status]);

  const localized = (english: string, turkish: string) =>
    language === "tr" ? turkish : english;

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
                  <label className={styles.editorLabel}>
                    <span>{localized("Suggested text", "Önerilen metin")}</span>
                    <textarea
                      className={styles.editor}
                      aria-label={localized("Suggested text", "Önerilen metin")}
                      value={applied ? appliedEdit!.after : suggestedText}
                      disabled={disabled || applied}
                      onChange={(event) => setSuggestedText(event.target.value)}
                    />
                  </label>
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
            {applied && appliedEdit ? (
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
                      ...appliedEdit,
                      before: appliedEdit.after,
                      after: appliedEdit.before,
                    });
                    setAppliedEdit(null);
                    setSuggestedText(appliedEdit.after);
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
                    disabled={disabled || changed || !suggestedText.trim()}
                    onClick={() => {
                      const customizedEdit = { ...edit, after: suggestedText };
                      onApply(customizedEdit);
                      setAppliedEdit(customizedEdit);
                    }}
                  >
                    <span aria-hidden="true">
                      <Icons.Check size={16} />
                    </span>
                    {copy("Apply suggestion")}
                  </button>
                )}
                {edit && onNavigate && (
                  <button disabled={disabled} onClick={() => onNavigate(edit)}>
                    {localized("Go to field", "Alana git")}
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
