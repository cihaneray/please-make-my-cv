"use client";
import { notify } from "@/components/Notifications";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Icons } from "@/components/Icons";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ResumeSummary } from "@/lib/types";

export default function ResumesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>("");

  useEffect(() => {
    setFilterQuery(new URLSearchParams(window.location.search).get("q") || "");
    async function load() {
      try {
        setLoading(true);
        const list = await api.listResumes(true);
        setResumes(list);
      } catch (err: any) {
        notify(
          "Could not load data. Check the API connection and reload to retry.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateNew() {
    try {
      const doc = await api.createResume({
        title: t("newResume"),
        targetRole: "Software Engineer",
      });
      router.push(`/resumes/${doc.metadata.id}`);
    } catch (err: any) {
      notify(`Could not create resume: ${err.message}`);
    }
  }

  const filtered = resumes.filter(
    (r) =>
      r.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.targetRole.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full">
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

          <div className="flex items-center gap-space-sm">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-secondary">
                <Icons.Search size={15} />
              </span>
              <input
                type="text"
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
                className="group flex flex-col justify-between p-space-lg rounded-lg bg-surface-container-lowest border border-surface-container-highest hover:shadow-md transition-all relative"
              >
                {r.isArchived && (
                  <div className="text-sm">
                    Archived{" "}
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
                      Restore
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary uppercase font-semibold">
                        {r.templateId}
                      </span>
                      <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface uppercase font-medium">
                        {(r.language || "en").toUpperCase()}
                      </span>
                      <span className="font-label-sm text-[11px] px-1.5 py-0.5 rounded bg-surface-container-highest text-primary font-semibold">
                        {r.targetMarket || "TR"}
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

                <div className="pt-space-md mt-space-md border-t border-surface-container-high flex items-center justify-between text-secondary font-body-sm">
                  <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-space-xs">
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
