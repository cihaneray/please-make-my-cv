"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import {
  ComparisonChange,
  ResumeDocument,
  ResumeComparisonReport,
  ResumeSummary,
} from "@/lib/types";
import styles from "./ResumeChanges.module.css";
import { SelectMenu } from "@/components/SelectMenu";

type Revision = { revision: number; document: ResumeDocument };

function readableField(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function changeTitle(change: ComparisonChange, copy: (text: string) => string) {
  const field = change.details.field;
  const entry = change.details.to ?? change.details.from;
  if (!field && entry && typeof entry === "object" && !Array.isArray(entry)) {
    const value = entry as Record<string, unknown>;
    const label =
      value.title ?? value.name ?? value.company ?? value.institution;
    if (typeof label === "string" && label.trim()) return label;
  }
  return typeof field === "string"
    ? copy(readableField(field))
    : change.description === "Entry order changed."
      ? copy(change.description)
      : copy(readableField(change.category));
}

export function ResumeChanges({
  document,
  disabled,
}: {
  document: ResumeDocument;
  disabled: boolean;
}) {
  const copy = useCopy();
  const details = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const loadId = useRef(0);
  const comparisonId = useRef(0);
  const titleId = useId();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [target, setTarget] = useState("");
  const [report, setReport] = useState<ResumeComparisonReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // A draft edit invalidates the visible result and any request based on the old draft.
  useEffect(() => {
    comparisonId.current += 1;
    setReport(null);
    setComparing(false);
  }, [document]);

  useEffect(() => {
    loadId.current += 1;
    comparisonId.current += 1;
    setTarget("");
    setRevisions([]);
    setResumes([]);
    setLoaded(false);
    setLoading(false);
    setError("");
  }, [document.metadata.id]);

  async function load() {
    const current = ++loadId.current;
    setLoading(true);
    setLoaded(false);
    setTarget("");
    setReport(null);
    setError("");
    try {
      const [history, list] = await Promise.all([
        api.history(document.metadata.id),
        api.listResumes(),
      ]);
      if (current !== loadId.current) return;
      setRevisions(history);
      setResumes(list.filter((item) => item.id !== document.metadata.id));
      setLoaded(true);
    } catch (cause) {
      if (current === loadId.current) setError((cause as Error).message);
    } finally {
      if (current === loadId.current) setLoading(false);
    }
  }

  function close() {
    loadId.current += 1;
    comparisonId.current += 1;
    dialog.current?.close();
    details.current?.removeAttribute("open");
    setLoading(false);
    setComparing(false);
  }

  async function compare() {
    if (!target || comparing) return;
    const current = ++comparisonId.current;
    const selected = target;
    const draft = document;
    setComparing(true);
    setError("");
    setReport(null);
    try {
      const baseline = selected.startsWith("revision:")
        ? revisions.find((item) => item.revision === Number(selected.slice(9)))
            ?.document
        : await api.getResume(selected.slice(7));
      if (!baseline) throw new Error(copy("Select a revision or resume"));
      const result = await api.compareDrafts(baseline, draft);
      if (current === comparisonId.current) setReport(result);
    } catch (cause) {
      if (current === comparisonId.current) setError((cause as Error).message);
    } finally {
      if (current === comparisonId.current) setComparing(false);
    }
  }

  const hasChoices = revisions.length > 0 || resumes.length > 0;
  const selectedLabel = target.startsWith("revision:")
    ? `${copy("Revision")} ${target.slice(9)}`
    : resumes.find((item) => `resume:${item.id}` === target)?.title;

  return (
    <details
      ref={details}
      className="workspace-tools no-print"
      onToggle={(event) => {
        if (!event.currentTarget.open || dialog.current?.open) return;
        if (disabled) {
          event.currentTarget.removeAttribute("open");
          return;
        }
        dialog.current?.showModal();
        void load();
      }}
    >
      <summary
        aria-label={copy("Compare revisions and variants")}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        {copy("Compare versions")}
      </summary>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => details.current?.removeAttribute("open")}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className={`document-popover ${styles.content}`}>
          <header className={styles.header}>
            <div>
              <h2 id={titleId}>{copy("Compare versions")}</h2>
              <p>
                {copy(
                  "Select a version or CV to see how it differs from your current draft.",
                )}
              </p>
            </div>
            <button
              type="button"
              aria-label={copy("Close comparison")}
              onClick={close}
            >
              ×
            </button>
          </header>
          <div className={styles.body}>
            <p className={styles.note}>
              {copy("Comparison does not change your document.")}
            </p>
            {loading && (
              <p role="status">{copy("Loading comparison choices…")}</p>
            )}
            {!loading && error && !loaded && (
              <div role="alert" className={styles.message}>
                <p>{error}</p>
                <button type="button" onClick={() => void load()}>
                  {copy("Try again")}
                </button>
              </div>
            )}
            {!loading && loaded && !hasChoices && (
              <p className={styles.message}>
                {copy("No saved versions or other CVs are available yet.")}
              </p>
            )}
            {!loading && loaded && hasChoices && (
              <div className="revision-comparison-fields">
                <label className="revision-comparison-target">
                  <span>{copy("Compare current draft with")}</span>
                  <SelectMenu
                    value={target}
                    disabled={disabled || comparing}
                    onValueChange={(value) => {
                      comparisonId.current += 1;
                      setTarget(value);
                      setReport(null);
                      setError("");
                    }}
                  >
                    <option value="">
                      {copy("Select a revision or resume")}
                    </option>
                    {revisions.length > 0 && (
                      <optgroup label={copy("Saved versions")}>
                        {revisions.map((item) => (
                          <option
                            key={item.revision}
                            value={`revision:${item.revision}`}
                          >
                            {copy("Revision")} {item.revision}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {resumes.length > 0 && (
                      <optgroup label={copy("Other CVs")}>
                        {resumes.map((item) => (
                          <option key={item.id} value={`resume:${item.id}`}>
                            {item.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </SelectMenu>
                </label>
                <button
                  type="button"
                  className={styles.compareButton}
                  disabled={disabled || comparing || !target}
                  onClick={() => void compare()}
                >
                  {comparing ? copy("Comparing…") : copy("Show differences")}
                </button>
              </div>
            )}
            {error && loaded && (
              <p role="alert" className={styles.message}>
                {error}
              </p>
            )}
            {report && (
              <section className={styles.results} aria-live="polite">
                <h3>
                  {copy("Differences")} · {report.changes.length}
                </h3>
                <p>
                  {selectedLabel} → {copy("Current draft")}
                </p>
                {report.changes.length === 0 && (
                  <p className={styles.message}>
                    {copy("No differences found.")}
                  </p>
                )}
                <div className={styles.changes}>
                  {report.changes.map((change, index) => {
                    const before = readableValue(change.details.from);
                    const after = readableValue(change.details.to);
                    const kind =
                      change.changeType === "added"
                        ? copy("Added")
                        : change.changeType === "removed"
                          ? copy("Removed")
                          : copy("Changed");
                    return (
                      <article key={index} className={styles.change}>
                        <div className={styles.changeHeading}>
                          <div>
                            <span className={styles.category}>
                              {copy(change.category)}
                            </span>
                            <h4>{changeTitle(change, copy)}</h4>
                          </div>
                          <span className={styles.kind}>{kind}</span>
                        </div>
                        {(before !== null || after !== null) && (
                          <div className={styles.values}>
                            <div>
                              <strong>{copy("Before")}</strong>
                              <pre>{before ?? copy("No content")}</pre>
                            </div>
                            <div>
                              <strong>{copy("Current draft")}</strong>
                              <pre>{after ?? copy("No content")}</pre>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </dialog>
    </details>
  );
}
