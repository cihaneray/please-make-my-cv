"use client";
import { notify } from "@/components/Notifications";

import { JobAgenda } from "@/components/JobAgenda";
import JobUrlImport from "@/components/JobUrlImport";
import { JobTools } from "@/components/JobTools";
import { JobDeleteDialog } from "@/components/JobDeleteDialog";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/Icons";
import { api, errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  JobApplication,
  JobMatchAnalysis,
  JobStatus,
  ResumeSummary,
} from "@/lib/types";

export default function JobsPage() {
  const copy = useCopy();
  const { language, t, getJobStatusLabel } = useI18n();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchAnalysis | null>(null);
  const selectedId = useRef<string | null>(null);
  useEffect(() => {
    selectedId.current = selectedJob?.id || null;
  }, [selectedJob?.id]);
  const [matchError, setMatchError] = useState(false);
  const [matching, setMatching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [jobToDelete, setJobToDelete] = useState<JobApplication | null>(null);

  // New job form state
  const [newCompany, setNewCompany] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState<JobStatus>("saved" as JobStatus);
  const [linkedResume, setLinkedResume] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [jobList, resumeList] = await Promise.all([
          api.listJobs(),
          api.listResumes(),
        ]);
        setJobs(jobList);
        setResumes(resumeList);
        if (jobList.length > 0) {
          setSelectedJob(jobList[0]);
        }
      } catch (err: unknown) {
        notify(
          "Could not load data. Check the API connection and reload to retry.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Whenever selectedJob or linked resume changes, run Match analysis!
  useEffect(() => {
    if (!selectedJob) return;
    const resumeIdToMatch =
      selectedJob.linkedResumeId || (resumes[0] ? resumes[0].id : null);
    setMatchResult(null);
    setMatching(false);
    setMatchError(false);
    if (!resumeIdToMatch) return;

    let cancelled = false;
    setMatchResult(null);
    async function runMatch() {
      try {
        setMatching(true);
        const res = await api.matchJob(selectedJob!.id, resumeIdToMatch!);
        if (!cancelled) setMatchResult(res);
      } catch (err) {
        if (!cancelled) setMatchError(true);
      } finally {
        if (!cancelled) setMatching(false);
      }
    }

    runMatch();
    return () => {
      cancelled = true;
    };
  }, [selectedJob, resumes]);

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany || !newPosition) return;
    try {
      const created = await api.createJob({
        company: newCompany,
        position: newPosition,
        description: newDesc,
        url: newUrl,
        location: newLocation,
        status: newStatus,
        linkedResumeId: linkedResume || (resumes[0] ? resumes[0].id : null),
      });
      setJobs([created, ...jobs]);
      setSelectedJob(created);
      setShowAddModal(false);
      setNewCompany("");
      setNewPosition("");
      setNewDesc("");
      setNewUrl("");
      setNewLocation("");
    } catch (err: unknown) {
      notify(`Create job failed: ${errorMessage(err)}`);
    }
  }

  async function handleStatusChange(status: JobApplication["status"]) {
    if (!selectedJob) return;
    try {
      const updated = await api.updateJob(selectedJob.id, { status });
      setSelectedJob((previous) =>
        previous?.id === updated.id ? updated : previous,
      );
      setJobs((items) => items.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: unknown) {
      notify(`Status update failed: ${errorMessage(err)}`);
    }
  }

  function nextDate(job: JobApplication) {
    if (["archived", "rejected"].includes(job.status)) return null;
    const entries = [
      job.interviewAt && { label: "Interview", date: job.interviewAt },
      job.followUpDate && {
        label: "Follow-up",
        date: `${job.followUpDate}T00:00`,
      },
    ].filter(Boolean) as { label: string; date: string }[];
    entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      entries.find((entry) => new Date(entry.date) >= today) || entries.at(-1)
    );
  }
  return (
    <div className="applications-workspace">
      <header className="applications-heading">
        <div>
          <span className="editorial-eyebrow">
            {copy("Your career workspace")}
          </span>
          <h1>{copy("Application files")}</h1>
          <p>
            {copy(
              "A clear view of every opportunity, and the story you send with it.",
            )}
          </p>
        </div>
        <button
          type="button"
          className="editorial-button primary"
          onClick={() => setShowAddModal(true)}
        >
          <Icons.Add size={16} />
          {t("addNewJob")}
        </button>
      </header>
      <div className="applications-layout">
        <aside
          className="applications-index"
          aria-label={copy("Application list")}
        >
          <div className="applications-index-heading">
            <h2>{t("targetJobsList")}</h2>
            <span>{jobs.length}</span>
          </div>
          {loading ? (
            <p className="applications-empty">{t("loadingJobs")}</p>
          ) : !jobs.length ? (
            <p className="applications-empty">{t("noJobsAdded")}</p>
          ) : (
            <div className="application-list">
              {jobs.map((job) => {
                const date = nextDate(job);
                return (
                  <button
                    type="button"
                    className={`application-index-row ${selectedJob?.id === job.id ? "is-selected" : ""}`}
                    key={job.id}
                    aria-pressed={selectedJob?.id === job.id}
                    onClick={() => setSelectedJob(job)}
                  >
                    <span className="application-index-top">
                      <span className="application-monogram">
                        {job.company.charAt(0)}
                      </span>
                      <span className="application-index-company">
                        {job.company}
                      </span>
                      <span
                        className={`application-status status-${job.status}`}
                      >
                        {getJobStatusLabel(job.status)}
                      </span>
                    </span>
                    <strong>{job.position}</strong>
                    <span className="application-index-location">
                      {job.location || t("remote")}
                    </span>
                    {date && (
                      <span className="application-index-date">
                        {copy(date.label)} ·{" "}
                        {new Date(date.date).toLocaleDateString(
                          language === "tr" ? "tr-TR" : "en-GB",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </aside>
        <div className="application-stage">
          {selectedJob ? (
            <>
              <div className="application-file-actions">
                <button
                  type="button"
                  className="editorial-button application-delete-button"
                  onClick={() => setJobToDelete(selectedJob)}
                >
                  <Icons.Delete size={16} />
                  {copy("Delete job")}
                </button>
              </div>
              <JobTools
                key={selectedJob.id}
                job={selectedJob}
                resumes={resumes}
                matchResult={
                  matchResult?.jobId === selectedJob.id ? matchResult : null
                }
                matching={matching}
                onStatusChange={handleStatusChange}
                onSaved={(updated) => {
                  setSelectedJob((previous) =>
                    previous?.id === updated.id ? updated : previous,
                  );
                  setJobs((items) =>
                    items.map((item) =>
                      item.id === updated.id ? updated : item,
                    ),
                  );
                }}
                onMatch={(result) => {
                  if (selectedId.current === result.jobId)
                    setMatchResult(result);
                }}
              />
              {matchError && (
                <p role="alert">
                  {copy(
                    "Could not compare requirements. Save the job or compare again to retry.",
                  )}
                </p>
              )}
            </>
          ) : (
            <div className="application-stage-empty">
              <Icons.Jobs size={32} />
              <h2>{t("selectJobToInspect")}</h2>
              <p>{copy("Choose an application to open its file.")}</p>
            </div>
          )}
        </div>
      </div>
      {!loading && <JobAgenda jobs={jobs} onSelect={setSelectedJob} />}
      {jobToDelete && (
        <JobDeleteDialog
          job={jobToDelete}
          onClose={() => setJobToDelete(null)}
          onDeleted={(id) => {
            const remaining = jobs.filter((job) => job.id !== id);
            setJobs(remaining);
            if (selectedId.current === id) {
              selectedId.current = remaining[0]?.id || null;
              setSelectedJob(remaining[0] || null);
              setMatchResult(null);
              setMatchError(false);
              setMatching(false);
            }
            try {
              localStorage.removeItem(`job-draft-${id}`);
              localStorage.removeItem(`job-email-${id}`);
            } catch {
              // A successful deletion also works when browser storage is unavailable.
            }
            notify(copy("Job deleted. Your CVs are unchanged."));
          }}
        />
      )}
      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateJob}
            className="job-create-form w-full max-w-lg bg-surface-container-lowest p-space-xl rounded-xl shadow-xl flex flex-col gap-space-md border border-surface-container-highest"
          >
            <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
              <span className="font-headline-md font-semibold">
                {t("addNewTargetJob")}
              </span>
              <button
                aria-label="Close"
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-secondary hover:text-on-surface"
              >
                <Icons.Close size={18} />
              </button>
            </div>

            <JobUrlImport
              language={language}
              onImport={api.importJobUrl}
              onApply={(values) => {
                setNewCompany(values.company);
                setNewPosition(values.position);
                setNewDesc(values.description);
                setNewUrl(values.sourceUrl);
              }}
            />
            <label className="career-tool-field">
              <span>{copy("Job listing URL (optional)")}</span>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </label>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">
                {t("companyName")}
              </label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="e.g. Stripe, Linear, Vercel"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">
                {t("positionTitle")}
              </label>
              <input
                type="text"
                required
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="e.g. Staff Software Engineer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">
                {t("location")}
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="San Francisco, CA or Remote"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">
                {t("jobDescriptionRequirements")}
              </label>
              <textarea
                rows={4}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="p-2 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest resize-none"
                placeholder={t("jobDescPlaceholder")}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded text-label-sm text-secondary hover:bg-surface-container"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-primary text-on-primary text-label-sm font-medium hover:bg-inverse-surface"
              >
                {t("saveAndAnalyze")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
