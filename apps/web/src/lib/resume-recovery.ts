"use client";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "./copy";
import { api } from "./api";
import { ResumeDocument } from "./types";

let tabId = "";
export function currentDraftTabId() {
  return (tabId ||= crypto.randomUUID());
}
type Envelope = { version: 1; updatedAt: number; document: ResumeDocument };
export function useResumeRecovery(
  doc: ResumeDocument | null,
  dirty: boolean,
  id: string,
  loaded: boolean,
  notify: (message: string) => void,
) {
  const copy = useCopy();
  const [recovery, setRecovery] = useState<ResumeDocument | null>(null);
  const ownKey = useRef("");
  const pending = useRef<Envelope | null>(null);
  const selected = useRef<{ key: string; raw: string } | null>(null);
  useEffect(() => {
    currentDraftTabId();
    pending.current = null;
    selected.current = null;
    setRecovery(null);
    ownKey.current = `cv-draft-${id}-${tabId}`;
    const flush = () => {
      try {
        if (pending.current)
          localStorage.setItem(ownKey.current, JSON.stringify(pending.current));
      } catch {
        notify(copy("Local draft recovery is unavailable. Save regularly."));
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [id, notify, copy]);
  useEffect(() => {
    if (!loaded || doc?.metadata.id !== id) return;
    let cancelled = false;
    async function load() {
      try {
        const entries: (Envelope & { key: string; raw: string })[] = [];
        for (const key of Object.keys(localStorage)) {
          if (key !== `cv-draft-${id}` && !key.startsWith(`cv-draft-${id}-`))
            continue;
          const raw = localStorage.getItem(key);
          if (!raw || sessionStorage.getItem(`cv-dismissed-${key}`) === raw)
            continue;
          let value;
          try {
            value = JSON.parse(raw);
          } catch {
            notify(copy("Could not read the recovered draft."));
            continue;
          }
          const document = value?.version === 1 ? value.document : value;
          if (
            !document?.metadata ||
            document.metadata.id !== id ||
            document.metadata.schemaVersion !== 1
          ) {
            notify(
              copy(
                "The recovered draft is invalid or uses an unsupported version.",
              ),
            );
            continue;
          }
          const result = await api.previewImport(
            JSON.stringify(document),
            "json",
          );
          if (result.valid && result.previewDocument)
            entries.push({
              key,
              raw,
              version: 1,
              updatedAt: Number(value.updatedAt) || 0,
              document: result.previewDocument,
            });
          else
            notify(
              copy(
                "The recovered draft is invalid or uses an unsupported version.",
              ),
            );
        }
        const candidate = entries.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (
          !cancelled &&
          candidate &&
          JSON.stringify(candidate.document) !== JSON.stringify(doc)
        ) {
          selected.current = { key: candidate.key, raw: candidate.raw };
          setRecovery(candidate.document);
        }
      } catch {
        if (!cancelled) notify(copy("Could not read the recovered draft."));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Only inspect recovery once the server document is loaded, not on each edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loaded, notify, copy]);
  useEffect(() => {
    if (!loaded || !doc || doc.metadata.id !== id) return;
    pending.current = dirty
      ? { version: 1, updatedAt: Date.now(), document: doc }
      : null;
    const timer = setTimeout(() => {
      try {
        if (pending.current)
          localStorage.setItem(ownKey.current, JSON.stringify(pending.current));
        else localStorage.removeItem(ownKey.current);
      } catch {
        notify(copy("Local draft recovery is unavailable. Save regularly."));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [doc, dirty, id, loaded, notify, copy]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (
        event.key?.startsWith(`cv-draft-${id}-`) &&
        event.key !== ownKey.current &&
        event.newValue
      )
        notify(
          copy(
            "Another tab has a separate draft for this CV. Saving uses revision checks.",
          ),
        );
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [id, notify, copy]);
  function dismiss() {
    try {
      if (selected.current)
        sessionStorage.setItem(
          `cv-dismissed-${selected.current.key}`,
          selected.current.raw,
        );
    } catch {
      /* Keep the in-memory dismissal. */
    }
    setRecovery(null);
  }
  return { recovery, dismiss };
}
