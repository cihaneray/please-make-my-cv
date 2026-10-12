"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ResumeDocument } from "@/lib/types";
import { TranslationDraftDialog } from "./TranslationDraftDialog";
import { SelectMenu } from "@/components/SelectMenu";

export interface TranslationPreview {
  document: ResumeDocument;
  targetLanguage: "en" | "tr";
  changes: { path: string; original: string; translated: string }[];
}

export default function ResumeTranslation({
  document,
  sourcePending,
  language,
  onTranslate,
  onCreate,
}: {
  document: ResumeDocument;
  sourcePending: boolean;
  language: "en" | "tr";
  onTranslate: (
    document: ResumeDocument,
    targetLanguage: "en" | "tr",
  ) => Promise<TranslationPreview>;
  onCreate: (
    document: ResumeDocument,
    title: string,
    targetLanguage: "en" | "tr",
  ) => Promise<ResumeDocument>;
}) {
  const tr = language === "tr";
  const [target, setTarget] = useState<"en" | "tr">(
    document.metadata.language === "tr" ? "en" : "tr",
  );
  const [preview, setPreview] = useState<TranslationPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  // Saving advances metadata; only source content affects the translation.
  const fingerprint = JSON.stringify({
    id: document.metadata.id,
    language: document.metadata.language,
    profile: document.profile,
    summary: document.summary,
    experience: document.experience,
    education: document.education,
    projects: document.projects,
    skills: document.skills,
    certifications: document.certifications,
    languages: document.languages,
    customSections: document.customSections,
  });
  const latest = useRef(fingerprint);
  const pending = useRef(sourcePending);
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const sourceVersion = useRef(0);
  useLayoutEffect(() => {
    sourceVersion.current += 1;
    latest.current = fingerprint;
    pending.current = sourcePending;
  }, [fingerprint, sourcePending]);
  const stale = !!preview && previewSource !== fingerprint;
  useEffect(() => {
    setPreview(null);
    setOpen(false);
    setPreviewSource(null);
    setError("");
  }, [document.metadata.id]);

  async function translate() {
    setBusy(true);
    setError("");
    setPreview(null);
    setCreated(null);
    const source = fingerprint;
    const version = sourceVersion.current;
    try {
      const result = await onTranslate(structuredClone(document), target);
      if (
        latest.current !== source ||
        pending.current ||
        sourceVersion.current !== version
      )
        return;
      setPreviewSource(source);
      setPreview(structuredClone(result));
      setOpen(true);
      setTitle(
        `${document.metadata.title.slice(0, 250)} - ${target.toUpperCase()}`,
      );
    } catch (e) {
      if (
        latest.current === source &&
        !pending.current &&
        sourceVersion.current === version
      )
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!preview || pending.current || busy || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const copy = structuredClone(preview.document);
      copy.metadata.parentResumeId = document.metadata.id;
      copy.metadata.language = preview.targetLanguage;
      const result = await onCreate(copy, title.trim(), preview.targetLanguage);
      setCreated(result.metadata.id);
      setPreview(null);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="document-tool resume-translation">
      <summary>{tr ? "CV dilini çevir" : "Translate CV language"}</summary>
      <p>
        {tr
          ? "Mevcut taslağı bağlı yapay zekâ modeline gönderir. Çeviriyi inceleyip düzenleyin; onayladığınızda ayrı bir CV oluşturulur."
          : "Send the current draft to your connected AI model. Review and edit the translation; confirming creates a separate CV."}
      </p>
      <label>
        {tr ? "Hedef dil" : "Target language"}
        <SelectMenu
          value={target}
          disabled={busy}
          onValueChange={(value) => {
            setTarget(value as "en" | "tr");
            setPreview(null);
            setOpen(false);
          }}
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </SelectMenu>
      </label>
      <button
        type="button"
        disabled={busy || sourcePending}
        onClick={translate}
      >
        {busy
          ? tr
            ? "İşleniyor…"
            : "Working…"
          : tr
            ? "Çeviri önizlemesi oluştur"
            : "Preview translation"}
      </button>
      {sourcePending && (
        <p>
          {tr
            ? "Önce kaynak değişikliklerini uygulayın."
            : "Apply pending source changes first."}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {created && (
        <p role="status">
          <a href={`/resumes/${created}`} target="_blank" rel="noreferrer">
            {tr ? "Çevrilmiş CV’yi aç" : "Open translated CV"}
          </a>
        </p>
      )}
      {preview && (
        <div className="translation-preview">
          {stale && (
            <p role="status">
              {tr
                ? "Kaynak CV değişti. Düzenlediğiniz çeviri taslağı saklandı; son değişiklikleri içermeyebilir. Taslağı inceleyerek kullanabilir veya yeni çeviri oluşturabilirsiniz."
                : "The source CV changed. Your edited translation draft is kept and may omit the latest changes. Review and use this draft, or generate a new translation."}
            </p>
          )}
          <button
            type="button"
            disabled={busy || sourcePending}
            onClick={() => setOpen(true)}
          >
            {tr ? "Çeviri taslağını aç" : "Open translation draft"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setPreview(null);
              setOpen(false);
            }}
          >
            {tr ? "Çeviri taslağını sil" : "Discard translation draft"}
          </button>
          {open && (
            <TranslationDraftDialog
              document={preview.document}
              title={title}
              language={language}
              busy={busy}
              createDisabled={sourcePending}
              stale={stale}
              error={error}
              onEdit={(edited) =>
                setPreview((current) =>
                  current ? { ...current, document: edited } : null,
                )
              }
              onTitle={setTitle}
              onClose={() => setOpen(false)}
              onCreate={create}
            />
          )}
        </div>
      )}
    </details>
  );
}
