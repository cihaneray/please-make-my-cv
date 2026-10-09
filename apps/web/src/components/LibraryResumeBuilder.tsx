"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { JobApplication, LibrarySnippet, ResumeDocument } from "@/lib/types";
import { Icons } from "./Icons";

const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "this",
  "that",
  "our",
  "you",
  "are",
  "your",
  "will",
  "have",
  "experience",
  "required",
  "ve",
  "ile",
  "bir",
  "için",
  "olan",
  "olarak",
  "deneyim",
  "aranıyor",
  "aranan",
  "bilgi",
]);

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i");
}

function containsPhrase(haystack: string, needle: string) {
  const isWord = (char: string) => /[\p{L}\p{N}+#]/u.test(char);
  let at = haystack.indexOf(needle);
  while (at >= 0) {
    if (
      (at === 0 || !isWord(haystack[at - 1])) &&
      (at + needle.length === haystack.length ||
        !isWord(haystack[at + needle.length]))
    )
      return true;
    at = haystack.indexOf(needle, at + 1);
  }
  return false;
}

export function rankLibraryEvidence(
  snippets: LibrarySnippet[],
  job: JobApplication,
) {
    ? job.requirements.map((term) => normalize(term.trim())).filter(Boolean)
        normalize(`${job.position} ${job.description}`).match(
          /[\p{L}\p{N}+#.]+/gu,
        ) || []
      ).filter((term) => term.length >= 3 && !stopWords.has(term));
  const uniqueTerms = [...new Set(terms)];
  return snippets
    .filter((snippet) => snippet.content.trim())
    .map((snippet) => {
      const searchable = normalize(
        [
          snippet.title,
          snippet.content,
          ...snippet.tags,
          ...snippet.targetRoles,
        ].join(" "),
      );
      const matches = uniqueTerms.filter((term) =>
        containsPhrase(searchable, term),
      );
      return { snippet, matches };
    })
    .sort(
      (a, b) =>
        b.matches.length - a.matches.length ||
        a.snippet.title.localeCompare(b.snippet.title),
    );
}

export default function LibraryResumeBuilder({
  snippets,
}: {
  snippets: LibrarySnippet[];
}) {
  const copy = useCopy();
  const { language } = useI18n();
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [jobId, setJobId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [deferProfile, setDeferProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .listJobs()
      .then((items) => {
        if (!cancelled)
          setJobs(items.filter((job) => job.status !== "archived"));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadAttempt]);

  const job = jobs.find((item) => item.id === jobId);
  const ranked = useMemo(
    () => (job ? rankLibraryEvidence(snippets, job) : []),
    [snippets, job],
  );
  const selected = ranked.filter(({ snippet }) =>
    selectedIds.includes(snippet.id),
  );
  const missingTerms =
    job?.requirements.filter(
      (term) =>
        !selected.some(({ matches }) =>
          matches.includes(normalize(term.trim())),
        ),
    ) || [];

  async function create(event: import("react").FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !job ||
      !selected.length ||
      busy ||
      createdId ||
      (!deferProfile && (!firstName.trim() || !lastName.trim()))
    )
      return;
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const title = `${job.position} · ${job.company}`.slice(0, 255);
    const doc: ResumeDocument = {
      metadata: {
        id: crypto.randomUUID(),
        schemaVersion: 1,
        title,
        targetRole: job.position,
        templateId: "minimal",
        language,
        targetMarket: "GLOBAL",
        tags: [],
        revision: 1,
        createdAt: now,
        updatedAt: now,
        parentResumeId: null,
        isArchived: false,
        targetJob: {
          position: job.position,
          company: job.company,
          description: [job.description, job.requirements.join(", ")]
            .filter(Boolean)
            .join("\n\n"),
        },
      },
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        headline: "",
        phone: "",
        location: "",
        website: "",
        linkedin: "",
        github: "",
        photo: "",
        links: [],
      },
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certifications: [],
      languages: [],
      customSections: [
        {
          id: crypto.randomUUID(),
          title: copy("Selected career achievements"),
          items: selected.map(({ snippet }) => ({
            id: crypto.randomUUID(),
            title: snippet.title,
            subtitle: "",
            date: "",
            description: snippet.content,
            bullets: [],
          })),
        },
      ],
      design: {
        sectionOrder: [
          "summary",
          "experience",
          "education",
          "projects",
          "skills",
          "certifications",
          "languages",
          "customSections",
        ],
        template: "minimal",
        fontFamily: "Inter",
        fontSize: "10pt",
        spacing: "normal",
        margins: "normal",
        accentColor: "#0F172A",
      },
      visibility: {
        showPhoto: false,
        showSummary: true,
        showExperience: true,
        showEducation: true,
        showProjects: true,
        showSkills: true,
        showCertifications: true,
        showLanguages: true,
      },
    };
    try {
      const created = await api.createResume({
        title,
        targetRole: job.position,
        initialData: doc,
      });
      setCreatedId(created.metadata.id);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="library-resume-builder"
      aria-label={copy("Create a CV from the library")}
    >
      <div className="library-builder-heading">
        <div>
          <h2>{copy("A focused CV from your career archive")}</h2>
          <p>
            {copy(
              "Choose a saved job, review matching snippets and create a separate draft.",
            )}
          </p>
        </div>
        <button
          type="button"
          className="library-secondary"
          disabled={busy}
          aria-expanded={open}
          aria-controls={`${prefix}-form`}
          onClick={() => setOpen(!open)}
        >
          <Icons.Document size={18} aria-hidden="true" />
          {copy(open ? "Close builder" : "Create a CV from the library")}
        </button>
      </div>
      {open && (
        <form
          id={`${prefix}-form`}
          className="library-builder-form"
          onSubmit={create}
          aria-busy={busy || loading}
        >
          <fieldset disabled={busy || !!createdId}>
            <label className="library-builder-field">
              <span>{copy("Saved target job")}</span>
              <select
                value={jobId}
                disabled={loading}
                onChange={(event) => {
                  setJobId(event.target.value);
                  setSelectedIds([]);
                  setError("");
                }}
              >
                <option value="">
                  {copy(loading ? "Loading jobs…" : "Choose a saved job")}
                </option>
                {jobs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.position} · {item.company}
                  </option>
                ))}
              </select>
            </label>
            {!loading && !jobs.length && (
              <p>
                {copy(
                  "Save a target job before creating a CV from the library.",
                )}{" "}
                <Link href="/jobs">{copy("Open target jobs")}</Link>
              </p>
            )}
            {job && (
              <>
                <p className="library-builder-notice">
                  {copy(
                    "Suggestions use text matches, not a proficiency score. Only selected original text is copied; employers, dates and qualifications are never invented.",
                  )}
                </p>
                <div className="library-builder-selection-heading">
                  <h3>{copy("Choose career evidence")}</h3>
                  <button
                    type="button"
                    className="library-secondary"
                    onClick={() =>
                      setSelectedIds(
                        ranked
                          .filter(({ matches }) => matches.length)
                          .map(({ snippet }) => snippet.id),
                      )
                    }
                  >
                    {copy("Select text matches")}
                  </button>
                  <span aria-live="polite">
                    {copy("Selected")}: {selected.length}
                  </span>
                </div>
                {!ranked.length && (
                  <p>{copy("Add a career snippet before creating a CV.")}</p>
                )}
                <div className="library-builder-evidence">
                  {ranked.map(({ snippet, matches }) => (
                    <label
                      className="library-builder-candidate"
                      key={snippet.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(snippet.id)}
                        onChange={(event) =>
                          setSelectedIds(
                            event.target.checked
                              ? [...selectedIds, snippet.id]
                              : selectedIds.filter((id) => id !== snippet.id),
                          )
                        }
                      />
                      <span>
                        <strong>{snippet.title}</strong>
                        <span className="library-builder-match">
                          {matches.length
                            ? `${copy("Text matches")}: ${matches.join(", ")}`
                            : copy(
                                "No direct text match; available for manual selection",
                              )}
                        </span>
                        <span className="library-builder-content">
                          {snippet.content}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {missingTerms.length > 0 && (
                  <p className="library-builder-notice">
                    {copy("Not mentioned in selected evidence")}:{" "}
                    {missingTerms.join(", ")}.{" "}
                    {copy(
                      "Review gaps yourself; missing terms will not be added to the CV.",
                    )}
                  </p>
                )}
                <h3>{copy("Personal details")}</h3>
                <div className="library-builder-profile">
                  <label className="library-builder-field">
                    <span>{copy("First name")}</span>
                    <input
                      value={firstName}
                      maxLength={100}
                      required={!deferProfile}
                      autoComplete="given-name"
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </label>
                  <label className="library-builder-field">
                    <span>{copy("Last name")}</span>
                    <input
                      value={lastName}
                      maxLength={100}
                      required={!deferProfile}
                      autoComplete="family-name"
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </label>
                  <label className="library-builder-field">
                    <span>{copy("Email (optional)")}</span>
                    <input
                      type="email"
                      value={email}
                      maxLength={254}
                      autoComplete="email"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                </div>
                <label className="library-builder-defer">
                  <input
                    type="checkbox"
                    checked={deferProfile}
                    onChange={(event) => setDeferProfile(event.target.checked)}
                  />
                  {copy(
                    "I will complete missing personal details in the editor.",
                  )}
                </label>
                <p className="library-builder-notice">
                  {copy(
                    "Selected snippets become a career achievements section. Complete employment history, education and contact details before exporting.",
                  )}
                </p>
                <button
                  type="submit"
                  className="library-primary"
                  disabled={
                    !selected.length ||
                    (!deferProfile && (!firstName.trim() || !lastName.trim()))
                  }
                >
                  {copy(busy ? "Creating draft…" : "Create selected CV draft")}
                </button>
              </>
            )}
          </fieldset>
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="library-secondary"
                disabled={busy || loading}
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                {copy("Reload saved jobs")}
              </button>
            </div>
          )}
          {createdId && (
            <div className="library-builder-result" role="status">
              <Icons.Check size={18} aria-hidden="true" />
              <p>
                {copy(
                  "Your separate draft is ready. Review and complete it before sending.",
                )}
              </p>
              <Link href={`/resumes/${createdId}`}>
                {copy("Open created CV")}
              </Link>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
