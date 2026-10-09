"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { ResumeDocument, ResumeComparisonReport } from "@/lib/types";
import { useCopy } from "@/lib/copy";

export function ResumeConflict({
  draft,
  onResolved,
}: {
  draft: ResumeDocument;
  onResolved: (document: ResumeDocument) => void;
}) {
  const copy = useCopy();
  const [server, setServer] = useState<ResumeDocument | null>(null);
  const [comparison, setComparison] = useState<ResumeComparisonReport | null>(
    null,
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .getResume(draft.metadata.id)
        .then(async (value) => {
          const report = await api.compareDrafts(draft, value);
          if (!cancelled) {
            setServer(value);
            setComparison(report);
          }
        })
        .catch((error) => {
          if (!cancelled) setError(errorMessage(error));
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [draft]);
  async function resolve(useServer: boolean) {
    if (!server) return;
    const tab = useServer ? null : window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setBusy(true);
    try {
      // Preserve the local draft before replacing it with the server version.
      const saved = await api.applyImport(
        draft,
        `${draft.metadata.title} · ${copy("Recovered draft")}`,
      );
      if (useServer) onResolved(await api.getResume(server.metadata.id));
      else {
        if (tab) tab.location.href = `/resumes/${saved.metadata.id}`;
        else
          setError(copy("The draft copy was saved. Open it from the CV list."));
        onResolved(await api.getResume(server.metadata.id));
      }
    } catch (error) {
      tab?.close();
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="conflict-panel"
      role="region"
      aria-label={copy("Resolve save conflict")}
    >
      <h2>{copy("A newer revision is available")}</h2>
      <p>
        {copy(
          "Your draft is preserved. Both choices save it as a separate CV before loading the server revision.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {comparison && (
        <details>
          <summary>
            {copy("Compare changes")} ({comparison.changes.length})
          </summary>
          <ul>
            {comparison.changes.map((change, index) => (
              <li key={index}>
                <strong>{change.category}</strong>: {change.description}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="resume-card-actions">
        <button disabled={busy || !server} onClick={() => resolve(true)}>
          {copy("Keep draft copy and load server revision")}
        </button>
        <button disabled={busy || !server} onClick={() => resolve(false)}>
          {copy("Open draft copy in a new tab")}
        </button>
      </div>
    </section>
  );
}
