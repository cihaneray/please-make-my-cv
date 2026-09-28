"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { aiApi, AIConnection, AIReview } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
export function AIResumeReview({ document }: { document: ResumeDocument }) {
  const [config, setConfig] = useState<AIConnection | null>(null);
  const [job, setJob] = useState("");
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const [result, setResult] = useState<AIReview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewedInput, setReviewedInput] = useState("");
  const controller = useRef<AbortController | null>(null);
  const input = JSON.stringify({ document, job, language });
  useEffect(() => {
    aiApi
      .settings()
      .then(setConfig)
      .catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  return (
    <section
      className="workspace-tools border rounded-xl p-4 space-y-3"
      aria-label="AI resume review"
    >
      <h2 className="font-semibold text-lg">AI resume coach</h2>
      <p className="text-sm">
        Get an explained score, strengths, gaps, and suggested wording for this
        draft. Suggestions never change your resume automatically.
      </p>
      {config?.enabled ? (
        <p className="text-xs">
          Using {config.model} at {config.baseUrl}. Clicking Review sends career
          content to this server. Contact fields are omitted, but free text can
          still identify you.
        </p>
      ) : (
        <p>
          Enable a model in{" "}
          <Link className="underline" href="/settings">
            Settings → LLM connection
          </Link>
          .
        </p>
      )}
      <label className="block text-sm">
        Target job description (optional)
        <textarea
          className="block w-full min-h-24"
          maxLength={20000}
          value={job}
          onChange={(e) => setJob(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Feedback language
        <select
          className="block"
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "tr")}
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </select>
      </label>
      <button
        disabled={busy || !config?.enabled}
        onClick={async () => {
          controller.current?.abort();
          const pending = new AbortController();
          controller.current = pending;
          setBusy(true);
          setError("");
          try {
            const value = await aiApi.review(
              document,
              job,
              language,
              pending.signal,
            );
            if (!pending.signal.aborted) {
              setResult(value);
              setReviewedInput(input);
            }
          } catch (e) {
            if (!pending.signal.aborted) setError((e as Error).message);
          } finally {
            if (!pending.signal.aborted) setBusy(false);
          }
        }}
      >
        {busy ? "Reviewing…" : "Review current draft with AI"}
      </button>
      {busy && (
        <button
          onClick={() => {
            controller.current?.abort();
            setBusy(false);
          }}
        >
          Cancel
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <div className="space-y-4">
          {input !== reviewedInput && (
            <p role="status" className="font-semibold">
              Draft or review options changed. Run a new review for an updated
              score.
            </p>
          )}
          <h3 className="font-semibold">
            AI editorial score: {result.score}/100
          </h3>
          <p>{result.summary}</p>
          <p className="text-xs">{result.notice}</p>
          {(["clarity", "evidence", "completeness", "relevance"] as const).map(
            (key) => (
              <div key={key}>
                <h4 className="font-semibold capitalize">
                  {key}:{" "}
                  {result[key] ? `${result[key]!.score}/25` : "Not assessed"}
                </h4>
                <p className="text-sm">
                  {result[key]?.rationale ||
                    "Add a target job to assess relevance."}
                </p>
              </div>
            ),
          )}
          <p className="text-xs">
            Overall = earned points ÷ assessed maximum × 100. Without a target
            job, relevance is excluded.
          </p>
          <h3 className="font-semibold">Strengths</h3>
          <ul className="list-disc pl-5">
            {result.strengths.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
          <h3 className="font-semibold">Recommended improvements</h3>
          {result.recommendations.map((item, i) => (
            <article key={i} className="border-t pt-3 space-y-2">
              <h4 className="font-semibold">
                {item.section} · {item.priority} priority
              </h4>
              <p className="text-sm">Evidence: {item.evidence}</p>
              <p>{item.advice}</p>
              {item.suggestedText && (
                <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
                  {item.suggestedText}
                </blockquote>
              )}
            </article>
          ))}
          <h3 className="font-semibold">Details to add or verify</h3>
          <ul className="list-disc pl-5">
            {result.questions.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
