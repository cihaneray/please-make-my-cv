"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import {
  ResumeDocument,
  ResumeComparisonReport,
  ResumeSummary,
} from "@/lib/types";

export function ResumeChanges({
  document,
  disabled,
}: {
  document: ResumeDocument;
  disabled: boolean;
}) {
  const copy = useCopy();
  const [revisions, setRevisions] = useState<
    Array<{ revision: number; document: ResumeDocument }>
  >([]);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [target, setTarget] = useState("");
  const [report, setReport] = useState<ResumeComparisonReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setReport(null);
  }, [document]);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const [history, list] = await Promise.all([
        api.history(document.metadata.id),
        api.listResumes(),
      ]);
      setRevisions(history);
      setResumes(list.filter((r) => r.id !== document.metadata.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="workspace-tools border-b p-3 no-print shrink-0 max-h-[50vh] overflow-auto">
      <summary>{copy("Compare revisions and variants")}</summary>
      <div className="document-popover">
        <button
          className="document-popover-close"
          aria-label={copy("Close panel")}
          onClick={(event) =>
            event.currentTarget.closest("details")?.removeAttribute("open")
          }
        >
          {copy("Close panel")}
        </button>
        <fieldset disabled={disabled || busy} className="space-y-3 py-3">
          <button onClick={load}>{copy("Load comparison choices")}</button>
          <label className="block">
            {copy("Compare current draft with")}
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setReport(null);
              }}
            >
              <option value="">{copy("Select a revision or resume")}</option>
              {revisions.map((r) => (
                <option key={r.revision} value={`revision:${r.revision}`}>
                  {copy("Revision")} {r.revision}
                </option>
              ))}
              {resumes.map((r) => (
                <option key={r.id} value={`resume:${r.id}`}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!target}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const baseline = target.startsWith("revision:")
                  ? revisions.find(
                      (r) => r.revision === Number(target.slice(9)),
                    )?.document
                  : await api.getResume(target.slice(7));
                if (!baseline)
                  throw new Error(copy("Select a revision or resume"));
                setReport(await api.compareDrafts(baseline, document));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {copy("Show differences")}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {report && (
          <section aria-live="polite">
            <p>
              {copy("Differences")}: {report.changes.length} ·{" "}
              {copy("Before → current draft")}
            </p>
            <p>{copy("Comparison does not change your document.")}</p>
            {report.changes.map((change, i) => (
              <article key={i} className="border rounded p-3 my-2">
                <h3>
                  {copy(change.category)} ·{" "}
                  {String(change.details.field || change.changeType)}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <strong>{copy("Before")}</strong>
                    <pre className="whitespace-pre-wrap break-words text-xs">
                      {typeof change.details.from === "string"
                        ? change.details.from
                        : JSON.stringify(change.details.from ?? null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <strong>{copy("Current draft")}</strong>
                    <pre className="whitespace-pre-wrap break-words text-xs">
                      {typeof change.details.to === "string"
                        ? change.details.to
                        : JSON.stringify(change.details.to ?? null, null, 2)}
                    </pre>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </details>
  );
}
