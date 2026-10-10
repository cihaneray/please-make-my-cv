"use client";
import { ResumeDeleteDialog } from "@/components/ResumeDeleteDialog";
import { ResumeQuickReviewDialog } from "@/components/ResumeQuickReviewDialog";
import { useCopy } from "@/lib/copy";
import { notify } from "@/components/Notifications";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Icons } from "@/components/Icons";
import { api, errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ResumeSummary } from "@/lib/types";
import styles from "./resumes.module.css";

export default function ResumesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const copy = useCopy();
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeSummary | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ResumeSummary | null>(null);
  const { t } = useI18n();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await api.listResumes(true);
        setResumes(list);
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

  useEffect(() => {
    setFilterQuery(query);
  }, [query]);

  async function handleCreateNew() {
    try {
      const doc = await api.createResume({
        title: t("newResume"),
        targetRole: "",
      });
      router.push(`/resumes/${doc.metadata.id}`);
    } catch (err: unknown) {
      notify(`Could not create resume: ${errorMessage(err)}`);
    }
  }

  const filtered = resumes
    .filter((r) => r.isArchived === showDeleted)
    .filter(
      (r) =>
        r.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
        r.targetRole.toLowerCase().includes(filterQuery.toLowerCase()),
    );

  return (
    <div className="flex flex-col w-full">
      {reviewTarget && (
        <ResumeQuickReviewDialog
          resume={reviewTarget}
          onClose={() => setReviewTarget(null)}
        />
      )}
      {deleteTarget && (
        <ResumeDeleteDialog
          resume={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => {
            setResumes((current) =>
              deleteTarget.isArchived
                ? current.filter((r) => r.id !== id)
                : current.map((r) =>
                    r.id === id
                      ? { ...r, isArchived: true, revision: r.revision + 1 }
                      : r,
                  ),
            );
            api
              .listResumes(true)
              .then(setResumes)
              .catch((error) => notify(error.message));
          }}
        />
      )}
      <div className={styles.page}>
        <header className={styles.header}>
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
              {t("documents")}
            </span>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">
              {t("myResumes")}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t("myResumesSubtitle")}
            </p>
          </div>

          <div className={`resume-list-controls ${styles.controls}`}>
            <div className={styles.search}>
              <span className={styles.searchIcon}>
                <Icons.Search size={15} />
              </span>
              <input
                type="search"
                aria-label={t("filterResumes")}
                placeholder={t("filterResumes")}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <button
              type="button"
              onClick={handleCreateNew}
              className={styles.createButton}
            >
              <Icons.Add size={16} />
              <span>{t("createResume")}</span>
            </button>
          </div>
        </header>

        <div
          className={`resume-list-tabs ${styles.tabs}`}
          role="group"
          aria-label={copy("Document list")}
        >
          <button
            type="button"
            aria-pressed={!showDeleted}
            onClick={() => setShowDeleted(false)}
          >
            {copy("Active CVs")}{" "}
            <span>{resumes.filter((r) => !r.isArchived).length}</span>
          </button>
          <button
            type="button"
            data-empty={!resumes.some((r) => r.isArchived)}
            aria-pressed={showDeleted}
            onClick={() => setShowDeleted(true)}
          >
            {copy("Deleted documents")}{" "}
            <span>{resumes.filter((r) => r.isArchived).length}</span>
          </button>
        </div>
        {loading ? (
          <div className={styles.emptyState}>{t("loadingResumes")}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <p className="text-secondary font-body-md">{t("noResumesFound")}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((r) => (
              <div key={r.id} className={`resume-list-card ${styles.card}`}>
                {r.isArchived && (
                  <div className={styles.archivedNotice}>
                    <span>{copy("Deleted document")}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.patchMetadata(r.id, {
                            revision: r.revision,
                            isArchived: false,
                          });
                          setResumes(await api.listResumes(true));
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      {copy("Restore")}
                    </button>
                  </div>
                )}
                <div className={styles.cardBody}>
                  <Link href={`/resumes/${r.id}`} className={styles.title}>
                    {r.title}
                  </Link>

                  <span className={styles.role}>
                    {r.targetRole || t("statusGeneralProfile")}
                  </span>
                  <dl className={styles.metadata}>
                    <div>
                      <dt>{copy("Template")}</dt>
                      <dd>{r.templateId}</dd>
                    </div>
                    <div>
                      <dt>{copy("CV language")}</dt>
                      <dd>{(r.language || "en").toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt>{copy("Market")}</dt>
                      <dd>{r.targetMarket || "TR"}</dd>
                    </div>
                  </dl>
                </div>

                <div className={`resume-card-footer ${styles.footer}`}>
                  <div className={styles.provenance}>
                    <time dateTime={r.updatedAt}>
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </time>
                    <span>
                      {t("revLabel")} {r.revision}
                    </span>
                  </div>
                  <div className="resume-card-actions">
                    {!r.isArchived && (
                      <button
                        type="button"
                        className={`resume-card-review ${styles.reviewAction}`}
                        onClick={() => setReviewTarget(r)}
                        aria-label={`${copy("Review CV")}: ${r.title}`}
                      >
                        <Icons.Sparkles size={16} />
                        {copy("Review")}
                      </button>
                    )}
                    <a
                      href={api.getExportUrl(r.id, "pdf", true)}
                      className={styles.pdfAction}
                    >
                      {copy("Download PDF")}
                    </a>
                    <button
                      type="button"
                      className="resume-card-delete"
                      aria-label={`${copy(r.isArchived ? "Delete permanently" : "Delete CV")}: ${r.title}`}
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Icons.Delete size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
