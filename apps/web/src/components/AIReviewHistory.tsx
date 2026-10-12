"use client";

import { useEffect, useState } from "react";
import {
  aiReviewHistoryApi,
  reviewDimensionDeltas,
  type AIReviewHistoryContext,
  type AIReviewHistoryRecord,
} from "@/lib/ai-review-history";
import { useCopy } from "@/lib/copy";
import { A4ResumePreview } from "./A4ResumePreview";
import styles from "./AIReviewHistory.module.css";

export function AIReviewHistory({
  documentId,
  currentContext,
  refreshKey = 0,
  onOpen,
}: {
  documentId: string;
  currentContext: AIReviewHistoryContext;
  refreshKey?: number;
  onOpen?: (record: AIReviewHistoryRecord) => void;
}) {
  const copy = useCopy();
  const [records, setRecords] = useState<AIReviewHistoryRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AIReviewHistoryRecord | null>(null);
  const { jobDescription, language } = currentContext;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRecords([]);
    setSelected(null);
    setError("");
    aiReviewHistoryApi
      .list(documentId, jobDescription, language, controller.signal)
      .then((values) => {
        if (!controller.signal.aborted) setRecords(values);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            copy(
              "Review history could not be loaded. Your current review is still available.",
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [documentId, jobDescription, language, refreshKey, retry, copy]);
  return (
    <section className={styles.history} aria-label={copy("AI review history")}>
      <h3 className="font-semibold">{copy("AI review history")}</h3>
      <p className="text-xs">
        {copy(
          "Only reviews of this CV with the same target job and feedback language are compared. Scores are subjective AI estimates and can vary by model or run.",
        )}
      </p>
      {loading && <p role="status">{copy("Loading review history…")}</p>}
      {error && (
        <div role="status">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            {copy("Retry")}
          </button>
        </div>
      )}
      {!loading && !error && records.length === 0 && (
        <p>{copy("No saved reviews for these options yet.")}</p>
      )}
      {records.length > 0 && (
        <ol
          className={styles.list}
          aria-label={copy(
            "Saved AI reviews and changes from the previous review",
          )}
        >
          {records.map((record, index) => {
            const previous = records[index + 1];
            const deltas = previous && reviewDimensionDeltas(record, previous);
            return (
              <li className={styles.card} key={record.id}>
                <div className={styles.heading}>
                  <div>
                    <p>{new Date(record.createdAt).toLocaleString()}</p>
                    <p className={styles.meta}>
                      {copy("Revision")}: {record.revision}
                    </p>
                  </div>
                  <strong className={styles.score}>
                    {record.result.score}/100
                  </strong>
                </div>
                <p className={styles.meta}>
                  {record.model} · {record.provider}
                </p>
                <details>
                  <summary>{copy("Dimension changes")}</summary>
                  {deltas ? (
                    deltas.map(({ dimension, delta }) => (
                      <span className="block" key={dimension}>
                        {copy(dimension)}:{" "}
                        {delta === null
                          ? copy("Not assessed")
                          : `${delta > 0 ? "+" : ""}${Number(delta.toFixed(2))}`}
                      </span>
                    ))
                  ) : (
                    <p>{copy("No previous review")}</p>
                  )}
                  {previous &&
                    (record.model !== previous.model ||
                      record.provider !== previous.provider) && (
                      <p className="text-xs">
                        {copy(
                          "Model or provider changed; score differences may reflect the reviewer.",
                        )}
                      </p>
                    )}
                </details>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(record);
                    onOpen?.(record);
                  }}
                >
                  {copy("View saved review")}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {selected && (
        <div className={styles.card}>
          <h4 className="font-semibold">
            {copy("Saved review")}: {selected.result.score}/100
          </h4>
          <p>{selected.result.summary}</p>
          <p className="text-xs">{copy(selected.result.notice)}</p>
          {(["clarity", "evidence", "completeness", "relevance"] as const).map(
            (key) => (
              <p key={key}>
                <strong>{copy(key)}:</strong>{" "}
                {selected.result[key]
                  ? `${selected.result[key]!.score}/25: ${selected.result[key]!.rationale}`
                  : copy("Not assessed")}
              </p>
            ),
          )}
          <h5 className="font-semibold">{copy("Reviewed draft snapshot")}</h5>
          <p>
            {selected.document.metadata.title} · {copy("Revision")}{" "}
            {selected.revision}
          </p>
          <p>{selected.document.summary}</p>
          <details>
            <summary>{copy("Full reviewed snapshot")}</summary>
            <div className={styles.snapshot}>
              <A4ResumePreview document={selected.document} disabled />
            </div>
          </details>
          <h5 className="font-semibold">{copy("Strengths")}</h5>
          <ul className="list-disc pl-5">
            {selected.result.strengths.map((value, index) => (
              <li key={index}>{value}</li>
            ))}
          </ul>
          <h5 className="font-semibold">{copy("Recommended improvements")}</h5>
          {selected.result.recommendations.map((item, index) => (
            <div key={index}>
              <p>{item.advice}</p>
              <p className="text-sm">{item.evidence}</p>
              {item.suggestedText && (
                <blockquote>{item.suggestedText}</blockquote>
              )}
            </div>
          ))}
          <h5 className="font-semibold">{copy("Details to add or verify")}</h5>
          <ul className="list-disc pl-5">
            {selected.result.questions.map((value, index) => (
              <li key={index}>{value}</li>
            ))}
          </ul>
          <details>
            <summary>{copy("Reviewed target job")}</summary>
            <pre className="whitespace-pre-wrap text-sm">
              {selected.jobDescription || copy("No target job")}
            </pre>
          </details>
          <button type="button" onClick={() => setSelected(null)}>
            {copy("Close")}
          </button>
        </div>
      )}
    </section>
  );
}
