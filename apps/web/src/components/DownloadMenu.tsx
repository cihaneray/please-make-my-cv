"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icons } from "./Icons";
import { useCopy } from "@/lib/copy";

export function DownloadMenu({
  disabled,
  download,
  onError,
}: {
  disabled: boolean;
  download: (format: "pdf" | "docx") => Promise<void>;
  onError: (message: string) => void;
}) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const start = async (format: "pdf" | "docx") => {
    setOpen(false);
    trigger.current?.focus();
    setBusy(true);
    try {
      await download(format);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : copy("Download failed."),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="download-control"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
        if (event.key === "ArrowDown" && !open) {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      <button
        type="button"
        className="editorial-button primary"
        ref={trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
      >
        <Icons.Download size={16} className="download-icon" />
        {copy(busy ? "Preparing download…" : "Download")}
        <span className="download-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          className="download-options"
          id={menuId}
          role="menu"
          aria-label={copy("Download format")}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]',
              ),
            );
            const current = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          <button type="button" role="menuitem" onClick={() => start("pdf")}>
            <strong>PDF</strong>
            <span>{copy("Preserves the preview layout")}</span>
          </button>
          <button type="button" role="menuitem" onClick={() => start("docx")}>
            <strong>Word (.docx)</strong>
            <span>
              {copy("Editable document with matching template styling")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
