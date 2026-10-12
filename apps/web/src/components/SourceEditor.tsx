"use client";
import { useCopy } from "@/lib/copy";
import React, { useState, useEffect, useRef } from "react";
import yaml from "js-yaml";
import { currentDraftTabId } from "@/lib/resume-recovery";
import { api, errorMessage } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
import { SelectMenu } from "@/components/SelectMenu";
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
  const ownKey = useRef("");
  const recoveredKey = useRef("");
  useEffect(() => {
    ownKey.current = `cv-source-${document.metadata.id}-${currentDraftTabId()}`;
    setRecovered(null);
    try {
      const keys = Object.keys(localStorage).filter(
        (key) =>
          key === `cv-source-${document.metadata.id}` ||
          key.startsWith(`cv-source-${document.metadata.id}-`),
      );
      let newest = 0;
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (
          value &&
          sessionStorage.getItem(`cv-source-dismissed-${key}`) !== value
        ) {
          const parsed: unknown = JSON.parse(value);
          if (
            parsed &&
            typeof parsed === "object" &&
            "format" in parsed &&
            "code" in parsed &&
            (parsed.format === "yaml" || parsed.format === "json") &&
            typeof parsed.code === "string"
          ) {
            const timestamp =
              "updatedAt" in parsed ? Number(parsed.updatedAt) || 0 : 0;
            if (timestamp >= newest) {
              newest = timestamp;
              recoveredKey.current = key;
              setRecovered({ format: parsed.format, code: parsed.code });
            }
          }
        }
      }
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

  const sourceDraft = useRef<string | null>(null);
  const flushSource = () => {
    if (!sourceDraft.current || !ownKey.current) return;
    try {
      localStorage.setItem(ownKey.current, sourceDraft.current);
    } catch {
      setError(copy("Draft storage unavailable; keep a copy before leaving."));
    }
  };
  useEffect(() => {
    sourceDraft.current = pending
      ? JSON.stringify({ format, code, updatedAt: Date.now() })
      : null;
    const timer = setTimeout(flushSource, 400);
    return () => clearTimeout(timer);
    // The callback reads the latest draft from a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, format, code]);
  useEffect(() => {
    window.addEventListener("pagehide", flushSource);
    return () => {
      flushSource();
      window.removeEventListener("pagehide", flushSource);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        localStorage.removeItem(ownKey.current);
        sourceDraft.current = null;
      }
    } catch (e) {
      if (apply) onPendingChange(pending);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="flex-1 flex flex-col min-w-0 p-4"
      aria-label={copy("Source editor")}
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
              const raw = localStorage.getItem(recoveredKey.current);
              if (raw)
                sessionStorage.setItem(
                  `cv-source-dismissed-${recoveredKey.current}`,
                  raw,
                );
            }}
          >
            {" "}
            {copy("Discard recovered source")}{" "}
          </button>
        </p>
      )}
      <div className="flex gap-3 mb-3">
        <SelectMenu
          aria-label={copy("Source format")}
          disabled={pending || busy}
          value={format}
          onValueChange={(value) => {
            const selectedFormat = value as "yaml" | "json";
            setFormat(selectedFormat);
            setCode(
              selectedFormat === "json"
                ? JSON.stringify(document, null, 2)
                : yaml.dump(document),
            );
          }}
        >
          <option value="yaml">YAML</option>
          <option value="json">JSON</option>
        </SelectMenu>
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
        aria-label={copy("Resume source")}
        spellCheck={false}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setPending(true);
          onPendingChange(true);
          setError("Not yet validated");
        }}
        className="flex-1 min-h-[400px] font-mono text-sm p-3"
      />
      <p role="status" className="whitespace-pre-wrap">
        {copy(
          error ||
            (pending ? "Unapplied source changes" : "Source matches draft"),
        )}
      </p>
    </section>
  );
}
