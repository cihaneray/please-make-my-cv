"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icons } from "./Icons";
import { useCopy } from "@/lib/copy";
import { useAnchoredPopover } from "./useAnchoredPopover";
import styles from "./ActionPopover.module.css";
import selectStyles from "./SelectMenu.module.css";

export function DownloadMenu({
  disabled,
  download,
  onError,
  onAnonymous,
}: {
  disabled: boolean;
  download: (format: "pdf" | "docx") => Promise<void>;
  onError: (message: string) => void;
  onAnonymous?: () => void;
}) {
  const copy = useCopy();
  const {
    open,
    setOpen,
    triggerRef: trigger,
    popupRef,
  } = useAnchoredPopover({ align: "right" });
  const [busy, setBusy] = useState(false);
  const initialFocus = useRef<"first" | "last">("first");
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const items =
      popupRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      );
    items?.[initialFocus.current === "last" ? items.length - 1 : 0]?.focus();
  }, [open, popupRef]);
  useEffect(() => {
    if (disabled || busy) setOpen(false);
  }, [disabled, busy, setOpen]);
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
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
        if (
          (event.key === "ArrowDown" || event.key === "ArrowUp") &&
          !open &&
          !disabled &&
          !busy
        ) {
          event.preventDefault();
          initialFocus.current = event.key === "ArrowUp" ? "last" : "first";
          setOpen(true);
        }
      }}
    >
      <button
        type="button"
        className={`${selectStyles.trigger} ${styles.downloadTrigger}`}
        ref={trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        popoverTarget={menuId}
        disabled={disabled || busy}
        onClick={(event) => {
          event.preventDefault();
          initialFocus.current = "first";
          setOpen(!open);
        }}
      >
        <Icons.Download size={16} className="download-icon" />
        {copy(busy ? "Preparing download…" : "Download")}
        <svg
          className={selectStyles.chevron}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      <div
        ref={popupRef}
        popover="auto"
        className={styles.popup}
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
        {onAnonymous && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
              onAnonymous();
            }}
          >
            <strong>{copy("Anonymous PDF")}</strong>
            <span>{copy("Review a copy with personal details removed")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
