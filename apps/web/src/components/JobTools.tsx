"use client";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { DocumentCover } from "./DocumentCover";
import { SlidingIndicator } from "./SlidingIndicator";
import { ApplicationPreparation } from "./ApplicationPreparation";
import { ApplicationEvidence } from "./ApplicationEvidence";
import { JobTailoring } from "./JobTailoring";
import { JobEmailDrafts } from "./JobEmailDrafts";
import { Icons } from "./Icons";
import { SelectMenu } from "@/components/SelectMenu";
import {
  JobApplication,
  ResumeDocument,
  ResumeSummary,
  JobMatchAnalysis,
  JobStatus,
} from "@/lib/types";

type Tab = "overview" | "listing" | "documents";
const tabs: Tab[] = ["overview", "listing", "documents"];
const tabNames = {
  overview: "Overview",
  listing: "Job details",
  documents: "Documents",
};
export function JobTools({
  job,
  resumes,
  onSaved,
  onMatch,
  matchResult,
  matching,
  onStatusChange,
}: {
  job: JobApplication;
  resumes: ResumeSummary[];
  onSaved: (job: JobApplication) => void;
  onMatch: (match: JobMatchAnalysis) => void;
  matchResult: JobMatchAnalysis | null;
  matching: boolean;
  onStatusChange: (status: JobStatus) => Promise<void>;
}) {
  const copy = useCopy();
  const { language, getJobStatusLabel } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  const tablist = useRef<HTMLDivElement>(null);
  const [snapshotState, setSnapshotState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [draft, setDraft] = useState<JobApplication>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`job-draft-${job.id}`) || "null",
      );
      return saved?.id === job.id && Array.isArray(saved.requirements)
        ? { ...job, ...saved }
        : job;
    } catch {
      return job;
    }
  });
  const [requirements, setRequirements] = useState(
    draft.requirements.join("\n"),
  );
  const editable = (value: JobApplication) =>
    JSON.stringify([
      value.company,
      value.position,
      value.location,
      value.url,
      value.description,
      value.notes,
      value.interviewAt,
      value.followUpDate,
      value.coverLetter,
      value.linkedResumeId,
      value.requirements,
    ]);
  const draftWithRequirements = useMemo(
    () => ({
      ...draft,
      requirements: requirements
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
    }),
    [draft, requirements],
  );
  const dirty = editable(draftWithRequirements) !== editable(job);
  useEffect(() => {
    setDraft((previous) => ({
      ...previous,
      status: job.status,
      timeline: job.timeline,
      updatedAt: job.updatedAt,
    }));
  }, [job.status, job.timeline, job.updatedAt]);
  useEffect(() => {
    try {
      if (dirty)
        localStorage.setItem(
          `job-draft-${job.id}`,
          JSON.stringify(draftWithRequirements),
        );
      else localStorage.removeItem(`job-draft-${job.id}`);
    } catch {
      /* Editing still works when browser storage is unavailable. */
    }
  }, [dirty, job.id, draftWithRequirements]);
  const [snapshots, setSnapshots] = useState<
    Array<{ id: string; createdAt: string; document: ResumeDocument }>
  >([]);
  const [message, setMessage] = useState("");
  const [letterLanguage, setLetterLanguage] = useState<"en" | "tr">("en");
  const [letterAI, setLetterAI] = useState(false);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      /* Actions set their own messages; keep generated draft guidance. */
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const linkedResume = resumes.find((row) => row.id === draft.linkedResumeId);
  const comparedResume = resumes.find(
    (row) => row.id === matchResult?.resumeId,
  );
  let jobUrl = "";
  try {
    const parsed = new URL(job.url);
    if (["https:", "http:"].includes(parsed.protocol)) jobUrl = parsed.href;
  } catch {
    /* Empty or invalid links stay as editable text. */
  }
  const formatDate = (value: string, time = false) =>
    value
      ? new Date(time ? value : `${value}T00:00`).toLocaleString(
          language === "tr" ? "tr-TR" : "en-GB",
          time
            ? { dateStyle: "medium", timeStyle: "short" }
            : { dateStyle: "medium" },
        )
      : copy("Not scheduled");
  const switchTab = (next: Tab, focus = false) => {
    setTab(next);
    if (focus)
      tablist.current
        ?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
        ?.focus();
  };
  const save = () =>
    run(async () => {
      const updated = await api.updateJob(job.id, {
        company: draft.company,
        position: draft.position,
        location: draft.location,
        url: draft.url,
        description: draft.description,
        notes: draft.notes,
        interviewAt: draft.interviewAt,
        followUpDate: draft.followUpDate,
        coverLetter: draft.coverLetter,
        linkedResumeId: draft.linkedResumeId,
        requirements: draftWithRequirements.requirements,
      });
      onSaved(updated);
      setMessage(copy("Saved"));
    });
  return (
    <article
      className="application-dossier"
      aria-label={copy("Application dossier")}
    >
      <header className="dossier-header">
        <div>
          <span className="editorial-eyebrow">
            {copy("Application dossier")}
          </span>
          <h2>{job.position}</h2>
          <p>
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="dossier-header-links">
            {jobUrl && (
              <a
                href={jobUrl}
                target="_blank"
                rel="noreferrer"
                className="editorial-link"
              >
                {copy("Open job listing")} <Icons.ArrowRight size={14} />
              </a>
            )}
            {linkedResume ? (
              <a
                className="editorial-link"
                href={`/resumes/${linkedResume.id}`}
              >
                <Icons.Document size={14} />
                {linkedResume.title}
              </a>
            ) : (
              <button
                type="button"
                className="editorial-link"
                onClick={() => switchTab("documents")}
              >
                {copy("Link a CV")}
              </button>
            )}
          </div>
        </div>
        <label className="dossier-status-label">
          {copy("Application status")}
          <SelectMenu
            aria-label={copy("Application status")}
            value={job.status}
            disabled={busy}
            onValueChange={(value) =>
              run(() => onStatusChange(value as JobStatus))
            }
          >
            {Object.values(JobStatus).map((status) => (
              <option key={status} value={status}>
                {getJobStatusLabel(status)}
              </option>
            ))}
          </SelectMenu>
        </label>
      </header>
      <div className="dossier-dates">
        <div>
          <span>{copy("Interview")}</span>
          <strong>{formatDate(draft.interviewAt, true)}</strong>
        </div>
        <div>
          <span>{copy("Follow-up")}</span>
          <strong>{formatDate(draft.followUpDate)}</strong>
        </div>
        <div>
          <span>{copy("Linked resume")}</span>
          <strong>{linkedResume?.title || copy("None")}</strong>
        </div>
      </div>
      <div
        className="dossier-tabs"
        ref={tablist}
        role="tablist"
        aria-label={copy("Application sections")}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = tabs.indexOf(tab);
          switchTab(
            event.key === "Home"
              ? tabs[0]
              : event.key === "End"
                ? tabs[2]
                : tabs[(index + (event.key === "ArrowRight" ? 1 : 2)) % 3],
            true,
          );
        }}
      >
        <SlidingIndicator active={tab} variant="tab" />
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`job-${job.id}-tab-${key}`}
            aria-controls={`job-${job.id}-panel-${key}`}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            data-tab={key}
            onClick={() => switchTab(key)}
          >
            {copy(tabNames[key])}
          </button>
        ))}
      </div>
      <div
        className="dossier-panel"
        role="tabpanel"
        id={`job-${job.id}-panel-overview`}
        aria-labelledby={`job-${job.id}-tab-overview`}
        hidden={tab !== "overview"}
        tabIndex={0}
      >
        <ApplicationPreparation
          job={job}
          dirty={dirty}
          onDocuments={() => switchTab("documents")}
        />
        <JobTailoring key={`tailoring-${job.id}`} job={job} dirty={dirty} />
        <JobEmailDrafts key={`email-${job.id}`} job={job} dirty={dirty} />
        <section
          className="dossier-match"
          aria-label={copy("CV match")}
          aria-busy={matching}
        >
          <div className="dossier-section-heading">
            <h3>{copy("CV match")}</h3>
            <span className="dossier-score">
              {matching
                ? copy("Calculating…")
                : matchResult?.matchScore == null
                  ? copy("Not assessed")
                  : `${matchResult.matchScore}%`}
            </span>
          </div>
          <p>
            {(matchResult?.summary ? copy(matchResult.summary) : "") ||
              copy(
                "Link a CV to compare the requirements in this application.",
              )}
          </p>
          {comparedResume && (
            <small>
              {copy("Compared CV")}: {comparedResume.title}
            </small>
          )}
          <p className="dossier-hint">
            {copy(
              "Matching checks explicit terms; it does not verify experience or predict hiring outcomes.",
            )}
          </p>
          {!!matchResult?.missingSkills.length && (
            <div className="dossier-gaps">
              <span>{copy("Missing requirements")}</span>
              {matchResult.missingSkills.map((skill) => (
                <span className="requirement-gap" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>
        {matchResult && (
          <ApplicationEvidence
            key={job.id}
            jobId={job.id}
            result={matchResult}
          />
        )}
        {!!matchResult?.sectionFeedback.length && (
          <section className="dossier-insights">
            <h3>{copy("Match insights")}</h3>
            {matchResult.sectionFeedback.map((feedback, index) => (
              <div key={index}>
                <strong>{copy(feedback.section)}</strong>
                <p>{copy(feedback.message)}</p>
                <p>{copy(feedback.recommendation)}</p>
              </div>
            ))}
          </section>
        )}
        <section className="dossier-planning">
          <h3>{copy("Dates and notes")}</h3>
          <fieldset disabled={busy} className="dossier-form-grid">
            <label>
              {copy("Interview date and time")}
              <input
                type="datetime-local"
                value={draft.interviewAt || ""}
                onChange={(e) =>
                  setDraft({ ...draft, interviewAt: e.target.value })
                }
              />
            </label>
            <label>
              {copy("Follow-up date")}
              <input
                type="date"
                value={draft.followUpDate || ""}
                onChange={(e) =>
                  setDraft({ ...draft, followUpDate: e.target.value })
                }
              />
            </label>
            <label className="dossier-wide">
              {copy("Notes")}
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
          </fieldset>
        </section>
        <section aria-label={copy("Application timeline")}>
          <h3>{copy("Application timeline")}</h3>
          {!job.timeline.length && (
            <p>
              {copy("No recorded status history for this older application.")}
            </p>
          )}
          <ol>
            {job.timeline.map((event) => (
              <li key={event.id}>
                <time dateTime={event.createdAt}>
                  {new Date(event.createdAt).toLocaleString(
                    language === "tr" ? "tr-TR" : "en-GB",
                  )}
                </time>{" "}
                · {copy(event.status)}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div
        className="dossier-panel"
        role="tabpanel"
        id={`job-${job.id}-panel-listing`}
        aria-labelledby={`job-${job.id}-tab-listing`}
        hidden={tab !== "listing"}
        tabIndex={0}
      >
        <div className="dossier-section-heading">
          <h3>{copy("Job details")}</h3>
          <span className="editorial-eyebrow">{copy("Saved listing")}</span>
        </div>
        <fieldset disabled={busy} className="dossier-form-grid">
          {(["company", "position", "location", "url"] as const).map((key) => (
            <label key={key}>
              {copy(key.charAt(0).toUpperCase() + key.slice(1))}
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="dossier-wide">
            {copy("Description")}
            <textarea
              rows={8}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label className="dossier-wide">
            {copy("Requirements to compare (one per line)")}
            <textarea
              rows={5}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={copy("Add requirements from any occupation")}
            />
          </label>
          <div className="dossier-wide">
            <button
              className="editorial-button"
              type="button"
              disabled={!draft.linkedResumeId || !requirements.trim()}
              onClick={() =>
                run(async () => {
                  onMatch(
                    await api.matchJob(
                      job.id,
                      draft.linkedResumeId!,
                      draftWithRequirements.requirements,
                    ),
                  );
                  switchTab("overview");
                })
              }
            >
              {copy("Compare these requirements")}
            </button>
          </div>
        </fieldset>
      </div>
      <div
        className="dossier-panel"
        role="tabpanel"
        id={`job-${job.id}-panel-documents`}
        aria-labelledby={`job-${job.id}-tab-documents`}
        hidden={tab !== "documents"}
        tabIndex={0}
      >
        <section className="dossier-cv">
          <div>
            <h3>{copy("Application CV")}</h3>
            <label>
              {copy("Linked resume")}
              <SelectMenu
                aria-label={copy("Linked resume")}
                disabled={busy}
                value={draft.linkedResumeId || ""}
                onValueChange={(value) =>
                  setDraft({ ...draft, linkedResumeId: value || null })
                }
              >
                <option value="">{copy("None")}</option>
                {resumes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title}
                  </option>
                ))}
              </SelectMenu>
            </label>
            {linkedResume ? (
              <>
                <p>{linkedResume.title}</p>
                <a
                  className="editorial-link"
                  href={`/resumes/${linkedResume.id}`}
                >
                  {copy("Open editor")} <Icons.ArrowRight size={14} />
                </a>
              </>
            ) : (
              <p className="dossier-hint">
                {copy("Choose the CV you want to use for this application.")}
              </p>
            )}
          </div>
          {tab === "documents" && linkedResume && (
            <a
              className="dossier-cv-cover"
              aria-label={`${copy("Open editor")}: ${linkedResume.title}`}
              href={`/resumes/${linkedResume.id}`}
            >
              <DocumentCover key={linkedResume.id} id={linkedResume.id} />
            </a>
          )}
        </section>
        <fieldset disabled={busy}>
          <section className="letter-document">
            <h3>{copy("Cover letter")}</h3>
            <label>
              {copy("Letter language")}
              <SelectMenu
                aria-label={copy("Letter language")}
                value={letterLanguage}
                onValueChange={(value) =>
                  setLetterLanguage(value as "en" | "tr")
                }
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </SelectMenu>
            </label>
            <label>
              <input
                type="checkbox"
                checked={letterAI}
                onChange={(e) => setLetterAI(e.target.checked)}
              />
              {copy("Use configured AI connection")}
            </label>
            <p>
              {copy(
                "Local drafts quote CV evidence. AI sends the saved CV without contact fields and the saved job description to your configured provider.",
              )}
            </p>
            <button
              type="button"
              disabled={!draft.linkedResumeId}
              onClick={() =>
                run(async () => {
                  if (dirty) {
                    setMessage(
                      copy(
                        "Save the job first to generate from the current requirements.",
                      ),
                    );
                    return;
                  }
                  if (
                    draft.coverLetter.trim() &&
                    !confirm(copy("Replace the existing letter draft?"))
                  )
                    return;
                  const result = await api.coverLetter(
                    job.id,
                    draft.linkedResumeId!,
                    letterLanguage,
                    letterAI,
                  );
                  setDraft((previous) => ({
                    ...previous,
                    coverLetter: result.text,
                  }));
                  setMessage(copy(result.notice));
                })
              }
            >
              {copy("Generate letter draft")}
            </button>
            <label>
              {copy("Letter text")}
              <textarea
                rows={10}
                value={draft.coverLetter || ""}
                onChange={(e) =>
                  setDraft({ ...draft, coverLetter: e.target.value })
                }
              />
            </label>
            <button
              type="button"
              disabled={!draft.coverLetter}
              onClick={() => {
                const blob = new Blob([draft.coverLetter], {
                  type: "text/plain;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement("a");
                a.href = url;
                a.download = "cover-letter.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              {copy("Download letter")}
            </button>
          </section>
        </fieldset>
        <section className="dossier-snapshots">
          <div className="dossier-section-heading">
            <h3>{copy("Submitted copies")}</h3>
            <button
              className="editorial-button"
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setSnapshotState("loading");
                  try {
                    const response = await fetch(
                      `/api/jobs/${job.id}/snapshots`,
                    );
                    if (!response.ok)
                      throw new Error(copy("Could not load submitted copies"));
                    setSnapshots(await response.json());
                    setSnapshotState("loaded");
                  } catch (error) {
                    setSnapshotState("error");
                    throw error;
                  }
                })
              }
            >
              {copy(
                snapshotState === "loading"
                  ? "Loading…"
                  : "Load submitted copies",
              )}
            </button>
          </div>
          {snapshotState === "idle" && (
            <p className="dossier-hint">
              {copy(
                "Saved copies capture the CV as it was when the application was submitted.",
              )}
            </p>
          )}
          {snapshotState === "loaded" && !snapshots.length && (
            <p className="dossier-hint">{copy("No submitted copies yet.")}</p>
          )}
          <div className="submitted-copy-list">
            {snapshots.map((row) => (
              <div key={row.id}>
                <Icons.Document size={24} />
                <div>
                  <strong>{row.document.metadata.title}</strong>
                  <time dateTime={row.createdAt}>
                    {new Date(row.createdAt).toLocaleString(
                      language === "tr" ? "tr-TR" : "en-GB",
                    )}
                  </time>
                </div>
                <button
                  type="button"
                  className="editorial-button"
                  disabled={busy}
                  onClick={() => run(() => api.downloadPdf(row.document))}
                >
                  {copy("Download submitted copy")} <Icons.Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <footer className="dossier-savebar">
        <div role="status">
          <span className={`draft-state ${dirty ? "is-dirty" : ""}`}>
            {copy(
              dirty ? "Unsaved job draft · stored in this browser" : "Saved",
            )}
          </span>
          {message && <p>{message}</p>}
        </div>
        <button
          type="button"
          className="editorial-button primary"
          disabled={busy || !dirty}
          onClick={save}
        >
          <Icons.Save size={16} />
          {copy(busy ? "Working…" : "Save job")}
        </button>
      </footer>
    </article>
  );
}
