"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentCover } from "@/components/DocumentCover";
import { Icons } from "@/components/Icons";
import { notify } from "@/components/Notifications";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { JobApplication, ResumeSummary } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { t, language, getJobStatusLabel } = useI18n();
  const copy = useCopy();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([api.listResumes(), api.listJobs()])
      .then(([documents, applications]) => {
        if (cancelled) return;
        setResumes(
          documents
            .filter((r) => !r.isArchived)
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
        );
        setJobs(
          applications
            .filter((j) => j.status !== "archived")
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
        );
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const doc = await api.createResume({
        title: t("newResume"),
        targetRole: "",
      });
      router.push(`/resumes/${doc.metadata.id}`);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setCreating(false);
    }
  }
  const latest = resumes[0];
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  return (
    <div className="editorial-home">
      <header className="desk-heading">
        <div>
          <p className="editorial-eyebrow">{copy("YOUR PERSONAL STUDIO")}</p>
          <h1>
            {copy("A little space.")}
            <br />
            <em>{copy("A clearer story.")}</em>
          </h1>
          <p className="desk-intro">
            {copy("Shape your experience into a document that feels like you.")}
          </p>
        </div>
        <Link href="/import" className="editorial-link">
          <Icons.Upload size={16} />
          {t("importCv")}
        </Link>
      </header>
      {error ? (
        <div role="alert" className="desk-message">
          {error}
          <button
            className="editorial-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            {copy("Retry")}
          </button>
        </div>
      ) : loading ? (
        <div role="status" className="desk-loading">
          {t("loadingResumes")}
        </div>
      ) : latest ? (
        <section className="desk-feature" aria-label={copy("Continue working")}>
          <div className="feature-story">
            <p className="editorial-eyebrow">
              <span className="accent-dot" />
              {copy("ON YOUR DESK")}
            </p>
            <h2>{latest.title}</h2>
            <p className="feature-role">
              {latest.targetRole || t("statusGeneralProfile")}
            </p>
            <p className="feature-description">
              {copy("Your latest document, ready for its next chapter.")}
            </p>
            <div className="document-facts">
              <span>
                {latest.language.toUpperCase()} / {latest.targetMarket}
              </span>
              <span>{latest.templateId}</span>
              <span>
                {copy("Revision")} {latest.revision}
              </span>
            </div>
            <Link
              href={`/resumes/${latest.id}`}
              className="editorial-button primary"
            >
              {copy("Continue editing")}
              <Icons.ArrowRight size={17} />
            </Link>
            <span className="feature-updated">
              {t("lastEdited")} · {date(latest.updatedAt)}
            </span>
          </div>
          <Link
            className="feature-document"
            href={`/resumes/${latest.id}`}
            aria-label={`${t("openStudio")}: ${latest.title}`}
          >
            <span className="document-corner">
              01 / {copy("LATEST DOCUMENT")}
            </span>
            <DocumentCover id={latest.id} />
          </Link>
        </section>
      ) : (
        <section className="desk-empty">
          <p className="editorial-eyebrow">{copy("A FRESH PAGE")}</p>
          <h2>{copy("Every story starts somewhere.")}</h2>
          <p>
            {copy(
              "Start a CV or bring an existing document into your workspace.",
            )}
          </p>
          <button
            className="editorial-button primary"
            onClick={create}
            disabled={creating}
          >
            <Icons.Add size={18} />
            {t("createFirstResume")}
          </button>
        </section>
      )}
      {!loading && !error && (
        <>
          <section
            className="document-shelf"
            aria-label={copy("Your documents")}
          >
            <div className="editorial-section-heading">
              <div>
                <span className="editorial-eyebrow">
                  02 / {copy("THE COLLECTION")}
                </span>
                <h2>
                  {copy("Your documents")} <span>{resumes.length}</span>
                </h2>
              </div>
              <Link href="/resumes" className="editorial-link">
                {t("viewAll")}
                <Icons.ArrowRight size={15} />
              </Link>
            </div>
            <div className="document-shelf-grid">
              {resumes.slice(0, 3).map((resume) => (
                <Link
                  className="shelf-document"
                  key={resume.id}
                  href={`/resumes/${resume.id}`}
                >
                  <div className="shelf-paper">
                    <DocumentCover id={resume.id} />
                  </div>
                  <h3>{resume.title}</h3>
                  <p>{resume.targetRole || t("statusGeneralProfile")}</p>
                  <span>
                    {resume.language.toUpperCase()} · {date(resume.updatedAt)}
                  </span>
                </Link>
              ))}
              <button
                className="shelf-new"
                onClick={create}
                disabled={creating}
              >
                <span className="shelf-new-paper">
                  <Icons.Add size={30} />
                  <span>{copy("Room for a new story")}</span>
                </span>
                <strong>{t("newResume")}</strong>
                <span>{copy("Begin with a blank page")}</span>
              </button>
            </div>
          </section>
          <section className="desk-applications" aria-label={t("recentJobs")}>
            <div className="editorial-section-heading">
              <div>
                <span className="editorial-eyebrow">
                  03 / {copy("WHAT’S NEXT")}
                </span>
                <h2>{copy("Stories in motion")}</h2>
              </div>
              <Link className="editorial-link" href="/jobs">
                {t("manageTracker")}
                <Icons.ArrowRight size={15} />
              </Link>
            </div>
            {jobs.length ? (
              jobs.slice(0, 4).map((job, i) => (
                <Link
                  key={job.id}
                  href={`/jobs?selected=${job.id}`}
                  className="application-line"
                >
                  <span className="application-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{job.position}</h3>
                    <p>{job.company}</p>
                  </div>
                  <span className="application-status">
                    {getJobStatusLabel(job.status)}
                  </span>
                  <Icons.ArrowRight size={17} />
                </Link>
              ))
            ) : (
              <p className="desk-muted">
                {copy(
                  "Add a target job to start shaping your next application.",
                )}
              </p>
            )}
          </section>
          <footer className="desk-footer">
            <span>CV WORKSPACE</span>
            <span>{copy("Thoughtfully written. Entirely yours.")}</span>
          </footer>
        </>
      )}
    </div>
  );
}
