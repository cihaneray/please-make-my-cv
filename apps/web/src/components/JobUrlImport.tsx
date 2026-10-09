"use client";

import { useState } from "react";

export interface JobUrlPreview {
  sourceUrl: string;
  company: string;
  position: string;
  description: string;
  extraction: "structured" | "text";
  warnings: string[];
}

export default function JobUrlImport({
  language,
  onImport,
  onApply,
}: {
  language: "en" | "tr";
  onImport: (url: string) => Promise<JobUrlPreview>;
  onApply: (preview: JobUrlPreview) => void;
}) {
  const tr = language === "tr";
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<JobUrlPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      setPreview(await onImport(url.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="job-url-import">
      <summary>{tr ? "İlan bağlantısından al" : "Import from job URL"}</summary>
      <p>
        {tr
          ? "Herkese açık bir ilan sayfasını okuyun, alanları düzenleyin ve forma aktarın."
          : "Read a public job page, edit the extracted fields, and transfer them to the form."}
      </p>
      <label>
        {tr ? "İlan URL’si" : "Job URL"}
        <input
          type="url"
          value={url}
          maxLength={2048}
          placeholder="https://example.com/jobs/role"
          disabled={busy}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(null);
          }}
        />
      </label>
      <button type="button" disabled={busy || !url.trim()} onClick={load}>
        {busy
          ? tr
            ? "Okunuyor…"
            : "Reading…"
          : tr
            ? "İlanı önizle"
            : "Preview job"}
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div>
          <p>
            {tr
              ? "Eklemeye geçmeden önce metni kontrol edin. Şirket ve pozisyon eksikse doldurun."
              : "Check the text before adding the job. Fill in the company and position if missing."}
          </p>
          <label>
            {tr ? "Şirket" : "Company"}
            <input
              value={preview.company}
              maxLength={255}
              onChange={(e) =>
                setPreview({ ...preview, company: e.target.value })
              }
            />
          </label>
          <label>
            {tr ? "Pozisyon" : "Position"}
            <input
              value={preview.position}
              maxLength={255}
              onChange={(e) =>
                setPreview({ ...preview, position: e.target.value })
              }
            />
          </label>
          <label>
            {tr ? "İlan metni" : "Job description"}
            <textarea
              value={preview.description}
              maxLength={20000}
              onChange={(e) =>
                setPreview({ ...preview, description: e.target.value })
              }
            />
          </label>
          <button
            type="button"
            disabled={
              !preview.company.trim() ||
              !preview.position.trim() ||
              !preview.description.trim()
            }
            onClick={() => {
              onApply(preview);
              setPreview(null);
            }}
          >
            {tr ? "Alanları forma aktar" : "Use fields in form"}
          </button>
          <button type="button" onClick={() => setPreview(null)}>
            {tr ? "Vazgeç" : "Discard preview"}
          </button>
        </div>
      )}
    </details>
  );
}
