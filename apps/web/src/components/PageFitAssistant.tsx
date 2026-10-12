"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { PageFitReport, ResumeDocument } from "@/lib/types";
import { SelectMenu } from "@/components/SelectMenu";
export function PageFitAssistant({
  document,
  onChange,
}: {
  document: ResumeDocument;
  onChange: (doc: ResumeDocument) => void;
}) {
  const copy = useCopy();
  const [target, setTarget] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    source: string;
    report: PageFitReport;
  } | null>(null);
  const current = JSON.stringify(document);
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  }, [current]);
  const stale =
    !!result &&
    (result.source !== current || result.report.targetPages !== target);
  return (
    <section className="workflow-tool">
      <h3>{copy("Page length assistant")}</h3>
      <label>
        {copy("Target page count")}
        <SelectMenu
          aria-label={copy("Target page count")}
          value={String(target)}
          onValueChange={(value) => setTarget(Number(value))}
        >
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectMenu>
      </label>
      <p>
        {copy(
          "Suggestions are measured using real PDFs. Changes are only applied when you approve them.",
        )}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          const source = current;
          setBusy(true);
          setError("");
          try {
            const report = await api.pageFit(document, target);
            if (latest.current === source) setResult({ source, report });
            else setError(copy("The draft changed. Run the check again."));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {copy(busy ? "Checking PDF…" : "Find layout suggestions")}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div>
          <p role="status">
            {copy("Pages")}: {result.report.currentPages} ·{" "}
            {copy("Target page count")}: {result.report.targetPages}
          </p>
          {stale && <p>{copy("The draft changed. Run the check again.")}</p>}
          {result.report.currentPages <= target && (
            <p>{copy("The document already fits the target.")}</p>
          )}
          <ul>
            {result.report.options.map((option) => (
              <li key={option.id}>
                <span>
                  {copy(option.label)} · {option.pageCount} {copy("pages")}
                </span>
                <button
                  type="button"
                  disabled={stale}
                  onClick={() =>
                    onChange({ ...document, design: option.design })
                  }
                >
                  {copy("Apply layout")}
                </button>
              </li>
            ))}
          </ul>
          {result.report.suggestions.map((text) => (
            <p key={text}>{copy(text)}</p>
          ))}
          <p>
            {copy("No text is removed or rewritten by layout suggestions.")}
          </p>
        </div>
      )}
    </section>
  );
}
