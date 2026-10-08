"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AISuggestion } from "./AISuggestion";
import { JobVariantBuilder } from "./JobVariantBuilder";
import { aiApi, AIConnection, AIReview, AIEdit } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { useCopy } from "@/lib/copy";
export function AIResumeReview({
  document,
  onApply,
  disabled = false,
}: {
  document: ResumeDocument;
  onApply: (edit: AIEdit) => void;
  disabled?: boolean;
}) {
  const copy = useCopy();
  const [config, setConfig] = useState<AIConnection | null>(null);
  const [target, setTarget] = useState(
    document.metadata.targetJob || {
      company: "",
      position: document.metadata.targetRole,
      description: "",
    },
  );
  const job = target.description;
  const [language, setLanguage] = useState<"en" | "tr">(
    document.metadata.language === "tr" ? "tr" : "en",
  );
  const [result, setResult] = useState<AIReview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewedInput, setReviewedInput] = useState("");
  const [reviewContext, setReviewContext] = useState("");
  const [reviewNumber, setReviewNumber] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const input = JSON.stringify({ document, target, language });
  useEffect(() => {
    aiApi
      .settings()
      .then(setConfig)
      .catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  return (
    <section
      className="workspace-tools ai-review"
      aria-label="AI resume review"
    >
      <h2>{copy("AI resume coach")}</h2>
      <p className="ai-review-description">
        {copy(
          "Get an explained score, strengths, gaps, and suggested wording for this draft. Suggestions never change your resume automatically.",
        )}
      </p>
      {config?.enabled ? (
        <p className="ai-review-provider">
          <span>{config.model}</span>
          {copy(
            "Review sends career content to the configured provider. Contact fields are omitted; free text may still identify you.",
          )}
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
      <JobVariantBuilder
        document={document}
        target={target}
        onTarget={setTarget}
        disabled={disabled || busy}
      />
      <label className="ai-review-field">
        <span>{copy("Target job description (optional)")}</span>
        <textarea
          aria-label="Target job description (optional)"
          className="block w-full min-h-24"
          maxLength={20000}
          disabled={busy}
          value={job}
          onChange={(e) =>
            setTarget({ ...target, description: e.target.value })
          }
        />
      </label>
      <label className="ai-review-field">
        <span>{copy("Feedback language")}</span>
        <select
          aria-label="Feedback language"
          className="block"
          disabled={busy}
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "tr")}
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </select>
      </label>
      <div className="ai-review-actions">
        <button
          className="ai-review-primary"
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
                job.trim()
                  ? `Target role: ${target.position}\nCompany: ${target.company}\n${job}`
                  : "",
                language,
                pending.signal,
              );
              if (!pending.signal.aborted) {
                setResult(value);
                setReviewedInput(input);
                setReviewContext(JSON.stringify({ target, language }));
                setReviewNumber((value) => value + 1);
              }
            } catch (e) {
              if (!pending.signal.aborted) setError((e as Error).message);
            } finally {
              if (!pending.signal.aborted) setBusy(false);
            }
          }}
        >
          {copy(busy ? "Reviewing…" : "Review current draft with AI")}
        </button>
        {busy && (
          <button
            onClick={() => {
              controller.current?.abort();
              setBusy(false);
            }}
          >
            {copy("Cancel")}
          </button>
        )}
      </div>
      {error && (
        <div className="ai-review-error" role="alert">
          <strong>{copy("Review could not be completed")}</strong>
          <p>
            {copy(
              error.includes("HTTP 429")
                ? "The AI provider's request limit or quota was reached. Wait and try again, or check your quota in the provider dashboard."
                : error.includes("HTTP 503")
                  ? "The AI provider is temporarily unavailable. Try again shortly."
                  : error.includes("timed out")
                    ? "The AI provider did not respond in time. Try again or select a faster model in Settings."
                    : error,
            )}
          </p>
        </div>
      )}
      {result && (
        <div className="ai-review-result space-y-4">
          {input !== reviewedInput && (
            <p role="status" className="font-semibold">
              {copy(
                "Draft or review options changed. Run a new review for an updated score.",
              )}
            </p>
          )}
          <h3 className="font-semibold">
            {copy("AI editorial score")}: {result.score}/100
          </h3>
          <p>{result.summary}</p>
          <p className="text-xs">{result.notice}</p>
          {(["clarity", "evidence", "completeness", "relevance"] as const).map(
            (key) => (
              <div key={key}>
                <h4 className="font-semibold capitalize">
                  {copy(key)}:{" "}
                  {result[key]
                    ? `${result[key]!.score}/25`
                    : copy("Not assessed")}
                </h4>
                <p className="text-sm">
                  {result[key]?.rationale ||
                    copy("Add a target job to assess relevance.")}
                </p>
              </div>
            ),
          )}
          <p className="text-xs">
            {copy(
              "Overall = earned points ÷ assessed maximum × 100. Without a target job, relevance is excluded.",
            )}
          </p>
          <h3 className="font-semibold">{copy("Strengths")}</h3>
          <ul className="list-disc pl-5">
            {result.strengths.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
          <h3 className="font-semibold">{copy("Recommended improvements")}</h3>
          {result.recommendations.map((item, i) => (
            <AISuggestion
              key={`${reviewNumber}-${i}`}
              item={item}
              document={document}
              onApply={onApply}
              disabled={
                disabled ||
                busy ||
                reviewContext !== JSON.stringify({ target, language })
              }
            />
          ))}
          <h3 className="font-semibold">{copy("Details to add or verify")}</h3>
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
