"use client";
import { useEffect, useId, useState } from "react";
import { api, EmailDraft, errorMessage } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { JobApplication } from "@/lib/types";

type Kind = "follow-up" | "thank-you" | "negotiation";
export function JobEmailDrafts({
  job,
  dirty,
}: {
  job: JobApplication;
  dirty: boolean;
}) {
  const copy = useCopy();
  const { language } = useI18n();
  const prefix = useId();
  const [kind, setKind] = useState<Kind>("follow-up");
  const [recipientName, setRecipientName] = useState("");
  const [terms, setTerms] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const storageKey = `job-email-${job.id}`;
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "null",
      );
      if (
        value &&
        typeof value === "object" &&
        "subject" in value &&
        typeof value.subject === "string" &&
        "body" in value &&
        typeof value.body === "string" &&
        value.subject.length <= 2000 &&
        value.body.length <= 30000
      ) {
        setDraft({ subject: value.subject, body: value.body, notice: "" });
      }
    } catch {
      /* Invalid optional email draft is ignored. */
    }
  }, [storageKey]);
  useEffect(() => {
    if (!draft) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        /* Download remains available when storage is full. */
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [storageKey, draft]);
  return (
    <section
      className="job-email-drafts"
      aria-label={copy("Application email drafts")}
    >
      <h3>{copy("Application email drafts")}</h3>
      <p>
        {copy(
          "Prepare and edit a template from saved job details. No email is sent and no AI request is needed.",
        )}
      </p>
      <div className="career-tool-fields">
        <label>
          <span>{copy("Email type")}</span>
          <select
            value={kind}
            disabled={busy}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            <option value="follow-up">{copy("Application follow-up")}</option>
            <option value="thank-you">{copy("Interview thank-you")}</option>
            <option value="negotiation">{copy("Offer discussion")}</option>
          </select>
        </label>
        <label>
          <span>{copy("Recipient name (optional)")}</span>
          <input
            value={recipientName}
            maxLength={200}
            disabled={busy}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </label>
        {kind === "negotiation" && (
          <label className="career-tool-wide">
            <span>{copy("Terms you want to discuss")}</span>
            <textarea
              value={terms}
              maxLength={1000}
              disabled={busy}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={copy(
                "Enter your own expectations; no salary figure is assumed.",
              )}
            />
          </label>
        )}
      </div>
      {dirty && <p>{copy("Save job changes before preparing an email.")}</p>}
      <button
        type="button"
        className="editorial-button"
        disabled={busy || dirty}
        onClick={async () => {
          if (
            draft &&
            !window.confirm(copy("Replace the existing email draft?"))
          )
            return;
          setBusy(true);
          setMessage("");
          try {
            setDraft(
              await api.emailDraft(job.id, {
                kind,
                language,
                recipientName,
                requestedTerms: terms,
              }),
            );
          } catch (e) {
            setMessage(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {copy(busy ? "Working…" : "Prepare email draft")}
      </button>
      {draft && (
        <div className="career-tool-result">
          <label htmlFor={`${prefix}-subject`}>{copy("Email subject")}</label>
          <input
            id={`${prefix}-subject`}
            value={draft.subject}
            maxLength={2000}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          />
          <label htmlFor={`${prefix}-body`}>{copy("Email text")}</label>
          <textarea
            id={`${prefix}-body`}
            rows={10}
            maxLength={30000}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <p>
            {copy(
              "Verify placeholders and all facts before sending. This editable draft is stored only in this browser.",
            )}
          </p>
          <div className="career-tool-actions">
            <button
              type="button"
              className="editorial-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${draft.subject}\n\n${draft.body}`,
                  );
                  setMessage(copy("Email draft copied."));
                } catch {
                  setMessage(
                    copy(
                      "Could not copy. Select the text or download the draft.",
                    ),
                  );
                }
              }}
            >
              {copy("Copy email draft")}
            </button>
            <button
              type="button"
              className="editorial-button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([`${draft.subject}\n\n${draft.body}`], {
                    type: "text/plain;charset=utf-8",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "application-email.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              {copy("Download email draft")}
            </button>
          </div>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
