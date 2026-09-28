"use client";
import { notify } from "@/components/Notifications";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  RESUME_TEMPLATES,
  SAMPLE_PREVIEW_RESUME,
} from "@/features/resume-templates";

export default function TemplatesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>("minimal");
  const [creating, setCreating] = useState<boolean>(false);

  async function handleUseTemplate(templateId: string) {
    try {
      setCreating(true);
      const newResume = await api.createResume({
        title: `Resume (${templateId.toUpperCase()})`,
        templateId: templateId,
      });
      router.push(`/resumes/${newResume.metadata.id}`);
    } catch (err: any) {
      notify(`Failed to create resume: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-[1180px] w-full mx-auto px-space-lg py-margin-desktop space-y-space-xl">
        <header className="flex flex-col gap-space-xs pb-space-lg border-b border-surface-container-high">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
            {t("gallery")}
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">
            {t("resumeTemplates")}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t("templatesSubtitle")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {RESUME_TEMPLATES.map((tmpl) => {
            const isSelected = selectedId === tmpl.id;
            const Renderer = tmpl.renderer;
            const previewDoc = {
              ...SAMPLE_PREVIEW_RESUME,
              design: {
                ...SAMPLE_PREVIEW_RESUME.design,
                template: tmpl.id,
                accentColor: tmpl.defaultAccentColor,
                fontFamily: tmpl.defaultFontFamily,
              },
            };

            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedId(tmpl.id)}
                className={`p-space-lg rounded-xl bg-surface-container-lowest border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-primary ring-1 ring-primary/20 shadow-md"
                    : "border-surface-container-highest hover:border-outline-variant shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-space-sm">
                  {/* Real Scaled A4 Preview */}
                  <div className="h-56 w-full rounded-lg bg-surface-container-low border border-surface-container-highest overflow-hidden relative shadow-inner flex justify-center items-start pt-2">
                    <div
                      className="resume-paper text-on-surface w-[595px] origin-top bg-white p-7 shadow-sm pointer-events-none select-none"
                      style={{
                        transform: "scale(0.38)",
                        minHeight: "842px",
                      }}
                    >
                      <Renderer document={previewDoc} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-headline-md text-on-surface font-semibold">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-surface-container text-secondary">
                      {t("a4Ready")}
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-secondary leading-relaxed">
                    {tmpl.description}
                  </p>

                  <div className="pt-2 text-[11px] text-on-surface-variant font-medium">
                    <span className="text-secondary">{t("bestFor")} </span>
                    {tmpl.recommendedFor}
                  </div>
                </div>

                <div className="pt-space-lg mt-space-md border-t border-surface-container-high flex items-center justify-between">
                  <span className="font-label-sm text-secondary capitalize">
                    {tmpl.id}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(tmpl.id);
                    }}
                    disabled={creating}
                    className="px-3 py-1.5 rounded bg-primary text-on-primary font-label-sm hover:bg-inverse-surface transition-colors shadow-xs"
                  >
                    {t("useTemplate")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
