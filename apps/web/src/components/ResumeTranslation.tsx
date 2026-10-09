"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ResumeDocument } from "@/lib/types";

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
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const fingerprint = JSON.stringify(document);
  const latest = useRef(fingerprint);
  const pending = useRef(sourcePending);
  useLayoutEffect(() => {
    latest.current = fingerprint;
    pending.current = sourcePending;
  }, [fingerprint, sourcePending]);
  useEffect(() => {
    setPreview(null);
    setError("");
  }, [fingerprint, sourcePending]);

  async function translate() {
    setBusy(true);
    setError("");
    setPreview(null);
    setCreated(null);
    const source = fingerprint;
    try {
      const result = await onTranslate(structuredClone(document), target);
      if (latest.current !== source || pending.current) return;
      setPreview(result);
      setTitle(
        `${document.metadata.title.slice(0, 250)} — ${target.toUpperCase()}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(index: number, text: string) {
    if (!preview) return;
    const next = structuredClone(preview);
    next.changes[index].translated = text;
    const parts = next.changes[index].path.split(".");
    let node = next.document as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1))
      node = node[part] as Record<string, unknown>;
    node[parts[parts.length - 1]] = text;
    setPreview(next);
  }
  async function create() {
    if (!preview || sourcePending) return;
    setBusy(true);
    setError("");
    try {
      const copy = structuredClone(preview.document);
      copy.metadata.parentResumeId = document.metadata.id;
      const result = await onCreate(copy, title.trim(), preview.targetLanguage);
      setCreated(result.metadata.id);
      setPreview(null);
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
        <select
          value={target}
          disabled={busy}
          onChange={(e) => {
            setTarget(e.target.value as "en" | "tr");
            setPreview(null);
          }}
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </select>
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
          <p>
            {tr
              ? "Gerçekleri, anlamı ve teknik terimleri kontrol edin. Yapay zekâ hata yapabilir."
              : "Check facts, meaning and technical terms. AI can make mistakes."}
          </p>
          {preview.changes.map((change, index) => (
            <label key={change.path}>
              <span>{change.path}</span>
              <blockquote>{change.original}</blockquote>
              <textarea
                aria-label={`${tr ? "Çeviri" : "Translation"}: ${change.path}`}
                value={change.translated}
                disabled={busy}
                onChange={(e) => edit(index, e.target.value)}
              />
            </label>
          ))}
          {preview.changes.length === 0 && (
            <p>
              {tr
                ? "Metin değişikliği bulunamadı."
                : "No text changes were returned."}
            </p>
          )}
          <label>
            {tr ? "Yeni CV adı" : "New CV title"}
            <input
              value={title}
              disabled={busy}
              maxLength={255}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy || sourcePending || !title.trim()}
            onClick={create}
          >
            {tr
              ? "Onayla ve ayrı CV oluştur"
              : "Confirm and create separate CV"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPreview(null)}
          >
            {tr ? "Vazgeç" : "Discard preview"}
          </button>
        </div>
      )}
    </details>
  );
}
