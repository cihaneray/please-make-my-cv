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
      <div className="max-w-[1120px] w-full mx-auto px-space-lg py-margin-desktop space-y-space-xl">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-lg border-b border-surface-container-high">
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

          <div className="resume-list-controls flex items-center gap-space-sm">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-secondary">
                <Icons.Search size={15} />
              </span>
              <input
                type="search"
                aria-label={t("filterResumes")}
                placeholder={t("filterResumes")}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-body-sm rounded bg-surface-container text-on-surface placeholder:text-secondary outline-none focus:bg-surface-container-lowest transition-colors border border-surface-container-highest"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateNew}
              className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-md text-label-md hover:bg-inverse-surface transition-colors shadow-sm"
            >
              <Icons.Add size={16} />
              <span>{t("createResume")}</span>
            </button>
          </div>
        </header>

        <div
          className="resume-list-tabs"
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
          <div className="p-space-xl text-center text-secondary">
            {t("loadingResumes")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-space-xl text-center bg-surface-container-lowest rounded-lg border border-surface-container-highest">
            <p className="text-secondary font-body-md">{t("noResumesFound")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="resume-list-card group flex flex-col justify-between p-space-lg rounded-lg bg-surface-container-lowest border border-surface-container-highest hover:shadow-md transition-all relative"
              >
                {r.isArchived && (
                  <div className="text-sm">
                    {copy("Deleted document")}{" "}
                    <button
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
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary uppercase font-semibold">
                        {copy("Template")}: {r.templateId}
                      </span>
                      <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface uppercase font-medium">
                        {copy("CV language")}:{" "}
                        {(r.language || "en").toUpperCase()}
                      </span>
                      <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-highest text-primary font-semibold">
                        {copy("Market")}: {r.targetMarket || "TR"}
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-secondary">
                      {t("revLabel")} {r.revision}
                    </span>
                  </div>

                  <Link
                    href={`/resumes/${r.id}`}
                    className="font-headline-md text-headline-md text-on-surface hover:underline pt-2 truncate"
                  >
                    {r.title}
                  </Link>

                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {r.targetRole || t("statusGeneralProfile")}
                  </span>
                </div>

                <div className="resume-card-footer pt-space-md mt-space-md border-t border-surface-container-high text-secondary font-body-sm">
                  <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                  <div className="resume-card-actions">
                    {!r.isArchived && (
                      <button
                        type="button"
                        className="resume-card-review"
                        onClick={() => setReviewTarget(r)}
                        aria-label={`${copy("Review CV")}: ${r.title}`}
                      >
                        <Icons.Sparkles size={16} />
                        {copy("Review")}
                      </button>
                    )}
                    <Link
                      href={`/resumes/${r.id}`}
                      className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm transition-colors"
                    >
                      {t("editAction")}
                    </Link>
                    <a
                      href={api.getExportUrl(r.id, "pdf", true)}
                      className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm transition-colors"
                    >
                      {t("pdfAction")}
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
