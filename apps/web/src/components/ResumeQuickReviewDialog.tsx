"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { aiApi, api, errorMessage, AIConnection, AIReview } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { JobApplication, ResumeDocument, ResumeSummary } from "@/lib/types";
import { Icons } from "./Icons";
import { aiReviewHistoryApi } from "@/lib/ai-review-history";
import { SelectMenu } from "@/components/SelectMenu";

export function ResumeQuickReviewDialog({
  resume,
  onClose,
}: {
  resume: ResumeSummary;
  onClose: () => void;
}) {
  const copy = useCopy();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [document, setDocument] = useState<ResumeDocument | null>(null);
  const [config, setConfig] = useState<AIConnection | null>(null);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [jobId, setJobId] = useState("");
  const [language, setLanguage] = useState<"en" | "tr">(
    resume.language === "tr" ? "tr" : "en",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [jobError, setJobError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [result, setResult] = useState<AIReview | null>(null);
  const [reviewedContext, setReviewedContext] = useState("");
  const reviewContext = JSON.stringify({ jobId, language });

  useEffect(() => {
    let active = true;
    const element = dialog.current;
    const focus = window.document.activeElement as HTMLElement | null;
    const overflow = window.document.body.style.overflow;
    element?.showModal();
    window.document.body.style.overflow = "hidden";
    Promise.all([api.getResume(resume.id), aiApi.settings()])
      .then(([value, settings]) => {
        if (active) {
          setDocument(value);
          setConfig(settings);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    api
      .listJobs()
      .then((value) => {
        if (active) setJobs(value.filter((job) => job.status !== "archived"));
      })
      .catch((err: unknown) => {
        if (active) setJobError(errorMessage(err));
      });
    return () => {
      active = false;
      controller.current?.abort();
      element?.close();
      window.document.body.style.overflow = overflow;
      focus?.focus();
    };
  }, [resume.id]);

  const selectedJob = jobs.find((job) => job.id === jobId);
  const emptyJob =
    !!selectedJob &&
    !selectedJob.description.trim() &&
    !selectedJob.requirements.length;

  async function review() {
    if (!document || !config?.enabled || busy || emptyJob) return;
    const pending = new AbortController();
    controller.current = pending;
    setBusy(true);
    setError("");
    const jobDescription = selectedJob
      ? `Target role: ${selectedJob.position}\nCompany: ${selectedJob.company}\n${selectedJob.description}\nRequirements: ${selectedJob.requirements.join(", ")}`
      : "";
    try {
      const value = await aiApi.review(
        document,
        jobDescription,
        language,
        pending.signal,
      );
      if (!pending.signal.aborted) {
        setResult(value);
        setReviewedContext(reviewContext);
        setHistoryError("");
        void aiReviewHistoryApi
          .saveReview({ document, jobDescription, language, result: value })
          .catch(() =>
            setHistoryError(
              copy("Review completed, but could not be saved to history."),
            ),
          );
      }
    } catch (err: unknown) {
      if (!pending.signal.aborted) setError(errorMessage(err));
    } finally {
      if (!pending.signal.aborted) setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="resume-quick-review-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="quick-review-heading">
        <div>
          <span className="quick-review-eyebrow">
            {copy("AI resume coach")}
          </span>
          <h2 id={titleId}>{copy("Review saved CV")}</h2>
          <p>{resume.title}</p>
        </div>
        <button
          type="button"
          aria-label={copy("Close review")}
          onClick={onClose}
        >
          <Icons.Close size={20} />
        </button>
      </div>
      <p>
        {copy(
          "Review the saved document without changing it. Open the editor to make changes after reviewing suggestions.",
        )}
      </p>
      {loading && <p role="status">{copy("Loading…")}</p>}
      {!loading && document && config && (
        <>
          {config.enabled ? (
            <p className="quick-review-provider">
              <strong>{config.model}</strong>{" "}
              {copy(
                "Review sends career content to the configured provider. Contact fields are omitted; free text may still identify you.",
              )}
            </p>
          ) : (
            <p>
              {copy("Enable AI reviews in Settings before starting.")}{" "}
              <Link href="/settings">{copy("Settings")}</Link>
            </p>
          )}
          <div className="quick-review-options">
            <label>
              <span>{copy("Review target")}</span>
              <SelectMenu
                value={jobId}
                disabled={busy}
                onValueChange={(value) => setJobId(value)}
              >
                <option value="">{copy("General CV review")}</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.position} · {job.company}
                  </option>
                ))}
              </SelectMenu>
            </label>
            <label>
              <span>{copy("Feedback language")}</span>
              <SelectMenu
                value={language}
                disabled={busy}
                onValueChange={(value) => setLanguage(value as "en" | "tr")}
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </SelectMenu>
            </label>
          </div>
          {jobError && (
            <p role="status">
              {copy(
                "Saved jobs could not be loaded. General review is still available.",
              )}{" "}
              {jobError}
            </p>
          )}
          {emptyJob && (
            <p role="status">
              {copy(
                "Add a description or requirements to this job before reviewing against it.",
              )}
            </p>
          )}
          <div className="quick-review-actions">
            <button
              type="button"
              className="ai-review-primary"
              disabled={busy || !config.enabled || emptyJob}
              onClick={review}
            >
              {copy(busy ? "Reviewing…" : "Start AI review")}
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => {
                  controller.current?.abort();
                  setBusy(false);
                }}
              >
                {copy("Cancel")}
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <div className="ai-review-error" role="alert">
          <strong>{copy("Review could not be completed")}</strong>
          <p>{error}</p>
        </div>
      )}
      {historyError && <p role="status">{historyError}</p>}
      {result && (
        <section
          className="quick-review-result"
          aria-label={copy("AI review results")}
        >
          {reviewedContext !== reviewContext && (
            <p role="status">
              {copy(
                "Draft or review options changed. Run a new review for an updated score.",
              )}
            </p>
          )}
          <div className="quick-review-score">
            <strong>
              {result.score}
              <small>/100</small>
            </strong>
            <div>
              <h3>{copy("AI review score")}</h3>
              <p>{result.summary}</p>
            </div>
          </div>
          <p>{copy(result.notice)}</p>
          <div className="quick-review-dimensions">
            {(
              ["clarity", "evidence", "completeness", "relevance"] as const
            ).map((key) => (
              <div key={key}>
                <h4>
                  {copy(key)} ·{" "}
                  {result[key]
                    ? `${result[key].score}/25`
                    : copy("Not assessed")}
                </h4>
                <p>
                  {result[key]?.rationale ||
                    copy("Add a target job to assess relevance.")}
                </p>
              </div>
            ))}
          </div>
          <p>
            {copy(
              "Overall = earned points ÷ assessed maximum × 100. Without a target job, relevance is excluded.",
            )}
          </p>
          <h3>{copy("Strengths")}</h3>
          <ul>
            {result.strengths.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
          <h3>{copy("Recommended improvements")}</h3>
          {result.recommendations.length === 0 && (
            <p>{copy("No recommendations in this review.")}</p>
          )}
          {result.recommendations.map((item, index) => (
            <article className="quick-review-recommendation" key={index}>
              <h4>
                {copy(item.section)} · {copy(`${item.priority} priority`)}
              </h4>
              <p>{item.advice}</p>
              {item.evidence && (
                <p>
                  <strong>{copy("Evidence")}: </strong>
                  {item.evidence}
                </p>
              )}
              {item.suggestedText && (
                <blockquote>{item.suggestedText}</blockquote>
              )}
            </article>
          ))}
          {result.questions.length > 0 && (
            <>
              <h3>{copy("Details to add or verify")}</h3>
              <ul>
                {result.questions.map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            </>
          )}
          <Link
            className="quick-review-editor-link"
            href={`/resumes/${resume.id}`}
          >
            {copy("Open editor to make changes")}
          </Link>
        </section>
      )}
    </dialog>
  );
}
