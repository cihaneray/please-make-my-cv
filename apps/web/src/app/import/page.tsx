"use client";
import { PDFImport } from "@/components/PDFImport";
import { useCopy } from "@/lib/copy";
import { notify } from "@/components/Notifications";

import { useRouter } from "next/navigation";
import React, { useState, useRef } from "react";
import { A4ResumePreview } from "@/components/A4ResumePreview";
import { Icons } from "@/components/Icons";
import { api, errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ResumeDocument } from "@/lib/types";
import styles from "./import.module.css";

const importCopy = {
  en: {
    guide:
      "Upload or paste content to see normalized A4 canvas preview before importing.",
    structure: "Detected Resume Structure",
    name: "Name",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    custom: "Custom",
    roles: "roles",
    entries: "entries",
    competencies: "competencies",
    items: "items",
    sections: "sections",
  },
  tr: {
    guide:
      "İçe aktarmadan önce düzenlenmiş A4 önizlemesini görmek için içerik yükleyin veya yapıştırın.",
    structure: "Algılanan Özgeçmiş Yapısı",
    name: "Ad",
    experience: "Deneyim",
    education: "Eğitim",
    skills: "Yetkinlikler",
    projects: "Projeler",
    custom: "Özel",
    roles: "pozisyon",
    entries: "kayıt",
    competencies: "yetkinlik",
    items: "öğe",
    sections: "bölüm",
  },
};

export default function ImportPage() {
  const router = useRouter();
  const copy = useCopy();
  const [mode, setMode] = useState<"source" | "pdf">("source");
  const { t, language } = useI18n();
  const text = importCopy[language];
  const generation = useRef(0);
  const [validatedContent, setValidatedContent] = useState("");
  const [content, setContent] = useState<string>("");
  const [previewDoc, setPreviewDoc] = useState<ResumeDocument | null>(null);
  const [detectedFmt, setDetectedFmt] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sectionSummary, setSectionSummary] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);

  // File drop handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(["Maximum file size is 5 MB."]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      runPreview(text);
    };
    reader.readAsText(file);
  }

  async function runPreview(textToPreview = content) {
    const request = ++generation.current;
    setPreviewDoc(null);
    setValidatedContent("");
    if (!textToPreview.trim()) return;
    try {
      setLoading(true);
      setErrors([]);
      const res = await api.previewImport(textToPreview);
      if (request !== generation.current) return;
      setValidatedContent(textToPreview);
      setDetectedFmt(res.detectedFormat);
      setWarnings(res.warnings);
      setErrors(res.errors);
      setPreviewDoc(res.previewDocument);
      setSectionSummary(res.sectionSummary);
    } catch (err: unknown) {
      setErrors([errorMessage(err) || "Import preview failed."]);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }

  async function handleApply() {
    if (!previewDoc || loading || validatedContent !== content) return;
    try {
      setApplying(true);
      const imported = await api.applyImport(previewDoc);
      router.push(`/resumes/${imported.metadata.id}`);
    } catch (err: unknown) {
      notify(`Import apply failed: ${errorMessage(err)}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <nav className="import-mode-tabs" aria-label={copy("Import method")}>
        <button
          type="button"
          aria-pressed={mode === "source"}
          onClick={() => setMode("source")}
        >
          {copy("JSON / YAML / Markdown")}
        </button>
        <button
          type="button"
          aria-pressed={mode === "pdf"}
          onClick={() => setMode("pdf")}
        >
          {copy("PDF · ATS review and import")}
        </button>
      </nav>
      {mode === "pdf" ? (
        <PDFImport />
      ) : (
        <div className={`${styles.source} flex flex-col w-full`}>
          {/* Top Header */}
          <div
            className={`${styles.header} h-12 w-full bg-surface-container-lowest flex items-center justify-between px-space-lg shrink-0 border-b border-surface-container-high no-print`}
          >
            <div className="flex items-center gap-space-sm">
              <Icons.Upload size={18} />
              <span className="font-headline-md text-headline-md font-semibold">
                {t("importTitle")}
              </span>
              {detectedFmt && (
                <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container uppercase text-secondary font-semibold">
                  {t("formatLabel")} {detectedFmt}
                </span>
              )}
            </div>

            {previewDoc && (
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || loading || validatedContent !== content}
                className="h-8 px-space-lg flex items-center gap-1.5 rounded-lg bg-primary text-on-primary font-label-md shadow hover:bg-primary-container transition-all"
              >
                <Icons.Check size={15} />
                <span>{applying ? "..." : t("confirmAndSave")}</span>
              </button>
            )}
          </div>

          <div className={`${styles.columns} flex flex-1 w-full`}>
            {/* Left Side: Input & Parsing Stage */}
            <div
              className={`${styles.input} bg-surface-container-lowest flex flex-col p-space-lg gap-space-md border-surface-container-high no-print`}
            >
              {/* File Upload Box */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary uppercase font-semibold">
                  {t("uploadResumeFile")}
                </label>
                <input
                  type="file"
                  accept=".json,.yaml,.yml,.md,.markdown"
                  onChange={handleFileUpload}
                  className="file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-label-sm file:font-semibold file:bg-surface-container file:text-on-surface hover:file:bg-surface-container-high cursor-pointer text-body-sm text-secondary"
                />
              </div>

              <div className="flex items-center gap-2 text-secondary text-[11px]">
                <div className="h-px bg-surface-container-high flex-1" />
                <span>{t("orPasteRaw")}</span>
                <div className="h-px bg-surface-container-high flex-1" />
              </div>

              {/* Paste Raw Content */}
              <div className="flex flex-col flex-1 gap-2">
                <textarea
                  rows={12}
                  value={content}
                  onChange={(e) => {
                    generation.current++;
                    setContent(e.target.value);
                    setPreviewDoc(null);
                    setValidatedContent("");
                    setLoading(false);
                  }}
                  placeholder={t("pasteRawPlaceholder")}
                  className="w-full h-64 p-3 rounded-lg bg-surface-container-low font-mono text-[12px] leading-relaxed outline-none border border-surface-container-highest resize-none focus:bg-surface-container-lowest"
                />

                <button
                  type="button"
                  onClick={() => runPreview(content)}
                  disabled={loading || !content.trim()}
                  className="h-8 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors disabled:opacity-50"
                >
                  {loading ? t("analyzingContent") : t("parseAndPreview")}
                </button>
              </div>

              {/* Parsing Diagnostics */}
              {errors.length > 0 && (
                <div className="p-3 rounded bg-error-container text-on-error-container text-[12px] flex flex-col gap-1">
                  <span className="font-semibold">{t("parseErrors")}</span>
                  {errors.map((err, idx) => (
                    <div key={idx}>• {copy(err)}</div>
                  ))}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-3 rounded bg-amber-50 text-amber-900 text-[12px] flex flex-col gap-1">
                  <span className="font-semibold">
                    {t("warningsMigrations")}
                  </span>
                  {warnings.map((w, idx) => (
                    <div key={idx}>• {copy(w)}</div>
                  ))}
                </div>
              )}

              {/* Section Summary */}
              {previewDoc && (
                <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 border border-surface-container-highest">
                  <span className="font-label-sm text-secondary uppercase font-semibold">
                    {text.structure}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      {text.name}:{" "}
                      <strong>
                        {previewDoc.profile.firstName}{" "}
                        {previewDoc.profile.lastName}
                      </strong>
                    </div>
                    <div>
                      {text.experience}:{" "}
                      <strong>
                        {sectionSummary.experience || 0} {text.roles}
                      </strong>
                    </div>
                    <div>
                      {text.education}:{" "}
                      <strong>
                        {sectionSummary.education || 0} {text.entries}
                      </strong>
                    </div>
                    <div>
                      {text.skills}:{" "}
                      <strong>
                        {sectionSummary.skills || 0} {text.competencies}
                      </strong>
                    </div>
                    <div>
                      {text.projects}:{" "}
                      <strong>
                        {sectionSummary.projects || 0} {text.items}
                      </strong>
                    </div>
                    <div>
                      {text.custom}:{" "}
                      <strong>
                        {sectionSummary.customSections || 0} {text.sections}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Live Normalized Preview */}
            <div className={styles.preview}>
              {previewDoc ? (
                <A4ResumePreview document={previewDoc} />
              ) : (
                <div
                  className={`${styles.guide} bg-surface-container flex items-center justify-center text-secondary text-body-md`}
                >
                  {text.guide}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
