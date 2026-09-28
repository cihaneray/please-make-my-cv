"use client";
import { useCopy } from "@/lib/copy";
import React, { useState, useEffect } from "react";
import yaml from "js-yaml";
import { api } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
export function SourceEditor({
  document,
  onDocumentUpdated,
  onPendingChange,
}: {
  document: ResumeDocument;
  onDocumentUpdated: (doc: ResumeDocument) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const copy = useCopy();

  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [code, setCode] = useState(() => yaml.dump(document));
  const [recovered, setRecovered] = useState<{
    format: "yaml" | "json";
    code: string;
  } | null>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem(`cv-source-${document.metadata.id}`);
      if (value) setRecovered(JSON.parse(value));
    } catch {
      /* Recovery is optional. */
    }
  }, [document.metadata.id]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!pending)
      setCode(
        format === "json"
          ? JSON.stringify(document, null, 2)
          : yaml.dump(document),
      );
  }, [document, format, pending]);

  async function validate(apply: boolean) {
    setBusy(true);
    if (apply) onPendingChange(true);
    try {
      const result = await api.validateSource(
        document.metadata.id,
        format,
        code,
      );
      if (!result.valid || !result.normalizedDocument)
        throw new Error(result.errors.join("\n"));
      setError(result.warnings.join("\n"));
      if (apply) {
        const updated = {
          ...result.normalizedDocument,
          metadata: {
            ...result.normalizedDocument.metadata,
            id: document.metadata.id,
            revision: document.metadata.revision,
          },
        };
        onDocumentUpdated(updated);
        setPending(false);
        onPendingChange(false);
        localStorage.removeItem(`cv-source-${document.metadata.id}`);
      }
    } catch (e) {
      if (apply) onPendingChange(pending);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="flex-1 flex flex-col min-w-0 p-4"
      aria-label="Source editor"
    >
      {recovered && (
        <p>
          {" "}
          {copy("Unapplied source recovered.")}{" "}
          <button
            onClick={() => {
              setCode(recovered.code);
              setFormat(recovered.format);
              setPending(true);
              onPendingChange(true);
              setRecovered(null);
            }}
          >
            {" "}
            {copy("Recover source")}{" "}
          </button>
          <button
            onClick={() => {
              setRecovered(null);
              localStorage.removeItem(`cv-source-${document.metadata.id}`);
            }}
          >
            {" "}
            {copy("Discard recovered source")}{" "}
          </button>
        </p>
      )}
      <div className="flex gap-3 mb-3">
        <select
          aria-label="Source format"
          disabled={pending || busy}
          value={format}
          onChange={(e) => {
            const value = e.target.value as "yaml" | "json";
            setFormat(value);
            setCode(
              value === "json"
                ? JSON.stringify(document, null, 2)
                : yaml.dump(document),
            );
          }}
        >
          <option value="yaml">YAML</option>
          <option value="json">JSON</option>
        </select>
        <button disabled={busy} onClick={() => validate(false)}>
          {" "}
          {copy("Validate")}{" "}
        </button>
        <button disabled={busy} onClick={() => validate(true)}>
          {" "}
          {copy("Apply to draft")}{" "}
        </button>
      </div>
      <p className="text-xs mb-2">
        {" "}
        {copy(
          "Apply source changes to the draft before switching tabs. Save stores the draft. Markdown is available through Import and Export because it cannot preserve every field.",
        )}{" "}
      </p>
      <textarea
        disabled={busy}
        aria-label="Resume source"
        spellCheck={false}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setPending(true);
          onPendingChange(true);
          setError("Not yet validated");
          try {
            localStorage.setItem(
              `cv-source-${document.metadata.id}`,
              JSON.stringify({ format, code: e.target.value }),
            );
          } catch {
            setError("Draft storage unavailable; keep a copy before leaving.");
          }
        }}
        className="flex-1 min-h-[400px] font-mono text-sm p-3"
      />
      <p role="status" className="whitespace-pre-wrap">
        {error ||
          (pending ? "Unapplied source changes" : "Source matches draft")}
      </p>
    </section>
  );
}
