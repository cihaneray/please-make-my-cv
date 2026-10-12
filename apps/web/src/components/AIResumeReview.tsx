"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AISuggestion } from "./AISuggestion";
import { JobVariantBuilder } from "./JobVariantBuilder";
import { aiApi, AIConnection, AIReview, AIEdit } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { useCopy } from "@/lib/copy";
import { AIReviewHistory } from "./AIReviewHistory";
import { aiReviewHistoryApi } from "@/lib/ai-review-history";
import { AIMissingFacts } from "./AIMissingFacts";
import { useI18n } from "@/lib/i18n";
import styles from "./AIResumeReview.module.css";
import { SelectMenu } from "@/components/SelectMenu";
export function AIResumeReview({
  document,
  onApply,
  onNavigate,
  disabled = false,
}: {
  document: ResumeDocument;
  onApply: (edit: AIEdit) => void;
  onNavigate?: (edit: AIEdit) => void;
  disabled?: boolean;
}) {
  const copy = useCopy();
  const { language: uiLanguage } = useI18n();
  const tr = uiLanguage === "tr";
  type SuggestionStatus = "pending" | "applied" | "skipped";
  const [statuses, setStatuses] = useState<Record<number, SuggestionStatus>>(
    {},
  );
  const [filter, setFilter] = useState<"all" | SuggestionStatus>("all");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [historyError, setHistoryError] = useState("");
  const recommendationList = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<AIConnection | null>(null);
  const [target, setTarget] = useState(
    document.metadata.targetJob || {
      company: "",
      position: document.metadata.targetRole,
      description: "",
    },
  );
  const job = target.description;
  const jobDescription = job.trim()
    ? `Target role: ${target.position}\nCompany: ${target.company}\n${job}`
    : "";
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
      aria-label={copy("AI resume review")}
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
          {tr ? "Yapay zekayı etkinleştirmek için " : "Enable AI in "}
          <Link className="underline" href="/settings">
            {tr ? "Ayarlar > LLM bağlantısı" : "Settings > LLM connection"}
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
          aria-label={copy("Target job description (optional)")}
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
        <SelectMenu
          aria-label={copy("Feedback language")}
          className="block"
          disabled={busy}
          value={language}
          onValueChange={(value) => setLanguage(value as "en" | "tr")}
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </SelectMenu>
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
                jobDescription,
                language,
                pending.signal,
              );
              if (!pending.signal.aborted) {
                setStatuses({});
                setFilter("all");
                setResult(value);
                setReviewedInput(input);
                setReviewContext(JSON.stringify({ target, language }));
                setReviewNumber((value) => value + 1);
                setHistoryError("");
                void aiReviewHistoryApi
                  .saveReview({
                    document,
                    jobDescription,
                    language,
                    result: value,
                  })
                  .then(() => setHistoryRefresh((v) => v + 1))
                  .catch(() =>
                    setHistoryError(
                      tr
                        ? "İnceleme tamamlandı ancak geçmişe kaydedilemedi."
                        : "Review completed, but could not be saved to history.",
                    ),
                  );
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
            {copy("AI review score")}: {result.score}/100
          </h3>
          <p>{result.summary}</p>
          <p className="text-xs">{copy(result.notice)}</p>
          <div className={styles.overview}>
            <h4>
              {tr ? "Önerilen sonraki adımlar" : "Recommended next steps"}
            </h4>
            <p>
              {result.recommendations.length === 0
                ? tr
                  ? "Bu incelemede uygulanacak öneri bulunmadı."
                  : "No recommendations in this review."
                : tr
                  ? "Önce yüksek öncelikli önerileri inceleyin. Değişiklikler yalnızca onayınızla taslağa uygulanır."
                  : "Start with high priority suggestions. Changes are applied to the draft only with your approval."}
            </p>
            {result.recommendations
              .map((item, index) => ({ item, index }))
              .sort(
                (a, b) =>
                  ["high", "medium", "low"].indexOf(a.item.priority) -
                  ["high", "medium", "low"].indexOf(b.item.priority),
              )
              .slice(0, 3)
              .map(({ item, index }) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    setFilter("all");
                    requestAnimationFrame(() =>
                      recommendationList.current
                        ?.querySelector<HTMLElement>(
                          `[data-review-recommendation="${index}"]`,
                        )
                        ?.scrollIntoView({
                          block: "center",
                          behavior: window.matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
                            ? "auto"
                            : "smooth",
                        }),
                    );
                  }}
                >
                  {copy(item.section)} · {copy(`${item.priority} priority`)}
                </button>
              ))}
          </div>
          {(["clarity", "evidence", "completeness", "relevance"] as const).map(
            (key) => (
              <details key={key} className={styles.dimension}>
                <summary className="font-semibold capitalize">
                  {copy(key)}:{" "}
                  {result[key]
                    ? `${result[key]!.score}/25`
                    : copy("Not assessed")}
                </summary>
                <p className="text-sm">
                  {result[key]?.rationale ||
                    copy("Add a target job to assess relevance.")}
                </p>
              </details>
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
          <nav
            className={styles.filters}
            aria-label={tr ? "Öneri durumu" : "Suggestion status"}
          >
            {(["all", "pending", "applied", "skipped"] as const).map(
              (status) => (
                <button
                  type="button"
                  key={status}
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {
                    {
                      all: tr ? "Tümü" : "All",
                      pending: tr ? "Bekleyen" : "Pending",
                      applied: tr ? "Uygulanan" : "Applied",
                      skipped: tr ? "Atlanan" : "Skipped",
                    }[status]
                  }
                  <span>
                    {status === "all"
                      ? result.recommendations.length
                      : result.recommendations.filter(
                          (_, i) => (statuses[i] ?? "pending") === status,
                        ).length}
                  </span>
                </button>
              ),
            )}
          </nav>
          {result.recommendations.length > 0 &&
            filter !== "all" &&
            !result.recommendations.some(
              (_, i) => (statuses[i] ?? "pending") === filter,
            ) && (
              <p role="status">
                {tr
                  ? "Bu durumda öneri bulunmuyor."
                  : "No suggestions in this status."}
              </p>
            )}
          <div ref={recommendationList} className={styles.suggestions}>
            {result.recommendations.map((item, i) => (
              <div
                key={`${reviewNumber}-${i}`}
                data-review-recommendation={i}
                hidden={
                  filter !== "all" && (statuses[i] ?? "pending") !== filter
                }
              >
                <AISuggestion
                  key={`${reviewNumber}-${i}`}
                  onStatusChange={(status) =>
                    setStatuses((current) =>
                      current[i] === status
                        ? current
                        : { ...current, [i]: status },
                    )
                  }
                  onNavigate={onNavigate}
                  item={item}
                  document={document}
                  onApply={onApply}
                  disabled={
                    disabled ||
                    busy ||
                    reviewContext !== JSON.stringify({ target, language })
                  }
                />
              </div>
            ))}
          </div>
          <AIMissingFacts
            key={reviewNumber}
            document={document}
            questions={result.questions}
            jobDescription={jobDescription}
            language={language}
            contextKey={reviewContext}
            disabled={
              disabled ||
              busy ||
              !config?.enabled ||
              reviewContext !== JSON.stringify({ target, language })
            }
            onApply={onApply}
            onNavigate={onNavigate}
          />
        </div>
      )}
      {historyError && <p role="status">{historyError}</p>}
      <AIReviewHistory
        documentId={document.metadata.id}
        currentContext={{ jobDescription, language }}
        refreshKey={historyRefresh}
      />
    </section>
  );
}
