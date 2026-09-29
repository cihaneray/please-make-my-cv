"use client";
import { useState } from "react";
import { AIEdit, AIReview } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { readAIField } from "@/lib/ai-edits";
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
  const [skipped, setSkipped] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const edit = item.edit;
  const current = edit ? readAIField(document, edit) : undefined;
  const applied = accepted && edit && current === edit.after;
  return (
    <article className="border-t pt-3 space-y-2">
      <h4 className="font-semibold">
        {item.section} · {item.priority} priority
      </h4>
      <p className="text-sm">Evidence: {item.evidence}</p>
      <p>{item.advice}</p>
      {skipped ? (
        <button onClick={() => setSkipped(false)}>
          Show skipped suggestion
        </button>
      ) : (
        <>
          {edit ? (
            <>
              <div className="rounded border p-3 space-y-3">
                <div>
                  <h5 className="font-semibold">Before</h5>
                  <p className="whitespace-pre-wrap">
                    {edit.before || "(Empty field)"}
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold">After</h5>
                  <p className="whitespace-pre-wrap">{edit.after}</p>
                </div>
              </div>
              <p className="text-xs">
                Verify every claim before applying. This changes the draft; use
                Save Draft to keep it.
              </p>
              {applied ? (
                <>
                  <p role="status">Applied to draft.</p>
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
                    Undo this suggestion
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={disabled || current !== edit.before}
                    onClick={() => {
                      onApply(edit);
                      setAccepted(true);
                    }}
                  >
                    Apply suggestion
                  </button>
                  {current !== edit.before && (
                    <p className="text-sm">
                      This field changed since the review. Run a new review to
                      avoid overwriting your edits.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            item.suggestedText && (
              <>
                <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
                  {item.suggestedText}
                </blockquote>
                <p className="text-xs">
                  Advice only: no safe field replacement was identified.
                </p>
              </>
            )
          )}
          {!applied && (
            <button onClick={() => setSkipped(true)}>Skip suggestion</button>
          )}
        </>
      )}
    </article>
  );
}
