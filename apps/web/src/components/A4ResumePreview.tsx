"use client";
import { sectionOrder } from "@/lib/section-order";
import { Icons } from "./Icons";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { PdfCheckReport, ResumeDocument } from "@/lib/types";
export function A4ResumePreview({
  document,
  onSelectSection,
  activeSection,
  disabled = false,
}: {
  document: ResumeDocument;
  onSelectSection?: (section: string) => void;
  activeSection?: string;
  disabled?: boolean;
}) {
  const copy = useCopy();

  const frame = useRef<HTMLIFrameElement>(null);
  const contentObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => contentObserver.current?.disconnect(), []);
  const selection = useRef({ onSelectSection, activeSection, disabled });
  useEffect(() => {
    selection.current = { onSelectSection, activeSection, disabled };
  }, [onSelectSection, activeSection, disabled]);
  function highlight() {
    frame.current?.contentDocument
      ?.querySelectorAll<HTMLElement>("[data-studio-section]")
      .forEach((el) => {
        el.classList.toggle(
          "studio-selected",
          el.dataset.studioSection === selection.current.activeSection &&
            !selection.current.disabled,
        );
        el.setAttribute("aria-disabled", String(selection.current.disabled));
        el.setAttribute(
          "aria-label",
          copy("Edit section") +
            ": " +
            (el.querySelector("h2")?.textContent || copy("Profile")),
        );
      });
  }
  useEffect(highlight, [activeSection, disabled, copy]);
  function prepareFrame(element: HTMLIFrameElement) {
    const content = element.contentDocument;
    if (!content || !onSelectSection) return;
    const style = content.createElement("style");
    style.textContent = `
      [data-studio-section] { cursor: pointer; border-radius: 2px; transition: outline-color .15s; }
      [data-studio-section]:hover, [data-studio-section]:focus-visible { outline: 2px solid #597a64; outline-offset: 6px; }
      [data-studio-section].studio-selected { outline: 1px dashed #597a64; outline-offset: 6px; }
      [data-studio-section][aria-disabled="true"] { cursor: default; outline: none; }
      @media (prefers-reduced-motion: reduce) { [data-studio-section] { transition: none; } }
    `;
    content.head.appendChild(style);
    const keys = sectionOrder(document).filter(
      (key) => key !== "customSections",
    );
    const visible = keys.filter((key) => {
      const value = document[key as keyof ResumeDocument];
      const flag = ("show" +
        key[0].toUpperCase() +
        key.slice(1)) as keyof ResumeDocument["visibility"];
      return (
        document.visibility[flag] &&
        (typeof value === "string" || Array.isArray(value)) &&
        value.length > 0
      );
    });
    const sections = Array.from(
      content.querySelectorAll<HTMLElement>(".cv-page > section"),
    );
    const header = content.querySelector<HTMLElement>(".cv-page > header");
    const targets = [
      ...(header ? [{ element: header, key: "profile" }] : []),
      ...sections.map((element, i) => ({
        element,
        key: element.dataset.studioSection || visible[i] || "customSections",
      })),
    ];
    targets.forEach(({ element: target, key }) => {
      target.dataset.studioSection = key;
      target.tabIndex = 0;
      target.setAttribute("role", "button");
      target.setAttribute(
        "aria-label",
        copy("Edit section") +
          ": " +
          (target.querySelector("h2")?.textContent || copy("Profile")),
      );
      target.addEventListener("click", (event) => {
        if (selection.current.disabled) return;
        event.preventDefault();
        selection.current.onSelectSection?.(key);
      });
      target.addEventListener("keydown", (event) => {
        if (selection.current.disabled || !["Enter", " "].includes(event.key))
          return;
        event.preventDefault();
        selection.current.onSelectSection?.(key);
      });
    });
    highlight();
  }
  const viewport = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(794);
  const [sheetHeight, setSheetHeight] = useState(1123);
  const [zoom, setZoom] = useState("fit");
  const sheetWidth = (210 * 96) / 25.4;
  const pageHeight = (297 * 96) / 25.4;
  // A one-pixel tolerance avoids counting rounding of a single A4 sheet as overflow.
  const estimatedPages = Math.max(1, Math.ceil((sheetHeight - 1) / pageHeight));
  const scale =
    zoom === "fit" ? Math.min(1, availableWidth / sheetWidth) : Number(zoom);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const latest = useRef(document);
  useEffect(() => {
    latest.current = document;
  }, [document]);
  const [html, setHtml] = useState("");
  const [pdf, setPdf] = useState("");
  useEffect(() => {
    setPdf("");
  }, [document]);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf);
    },
    [pdf],
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<PdfCheckReport | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    setCheck(null);
  }, [document]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .preview(document, controller.signal)
        .then((value) => {
          setHtml(value);
          setError("");
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [document, retry]);
  return (
    <section
      aria-label="Resume preview"
      className="document-canvas flex-1 min-w-0 flex flex-col overflow-auto"
    >
      <div className="canvas-toolbar no-print">
        <div className="canvas-toolbar-controls">
          <button
            disabled={busy || disabled}
            aria-pressed={!!pdf}
            onClick={async () => {
              setBusy(true);
              try {
                const blob = await api.pdfBlob(document);
                setError("");
                if (latest.current === document)
                  setPdf(URL.createObjectURL(blob));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? copy("Generating…") : copy("Exact PDF pages")}
          </button>
          <button aria-pressed={!pdf} onClick={() => setPdf("")}>
            {copy("Live content")}
          </button>
        </div>
        {!pdf && html && (
          <span
            className="live-page-count"
            role="status"
            data-testid="live-page-count"
            title={copy(
              "Estimated page boundaries. Exact PDF pages shows final pagination.",
            )}
          >
            ≈ {estimatedPages} {copy(estimatedPages === 1 ? "page" : "pages")}
          </span>
        )}
        {!pdf && (
          <label>
            {copy("Preview zoom")}{" "}
            <select
              aria-label="Preview zoom"
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
            >
              <option value="fit">
                {copy("Fit width")} (
                {Math.round(Math.min(1, availableWidth / sheetWidth) * 100)}%)
              </option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
            </select>
          </label>
        )}
      </div>
      <div className="canvas-check no-print">
        <button
          disabled={checking || disabled}
          onClick={async () => {
            setChecking(true);
            try {
              const result = await api.checkPdf(document);
              if (latest.current === document) setCheck(result);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setChecking(false);
            }
          }}
        >
          <Icons.CheckCircle size={14} />
          {copy(checking ? "Checking PDF…" : "Check PDF output")}
        </button>
        {check && (
          <div role="status" className="canvas-check-result">
            <p>
              {copy("Pages")}: {check.pageCount}
            </p>
            {!check.issues.length && (
              <p>{copy("No automated PDF issues found.")}</p>
            )}
            <ul>
              {check.issues.map((issue, i) => (
                <li key={i}>
                  {issue.page ? `${copy("Page")} ${issue.page}: ` : ""}
                  {copy(issue.message)}
                </li>
              ))}
            </ul>
            <p className="text-xs">{copy(check.notice)}</p>
          </div>
        )}
      </div>
      {error && (
        <div role="alert">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>
            {" "}
            {copy("Retry")}{" "}
          </button>
        </div>
      )}
      <div
        ref={viewport}
        className="w-full min-w-0"
        data-testid="preview-viewport"
      >
        {pdf ? (
          <iframe
            title="Resume document preview"
            src={`${pdf}#view=FitH`}
            className="bg-white border rounded w-full min-h-[750px]"
          />
        ) : (
          <div
            className="canvas-paper relative mx-auto bg-white"
            style={{ width: sheetWidth * scale, height: sheetHeight * scale }}
          >
            <iframe
              ref={frame}
              title="Resume document preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              onLoad={(event) => {
                prepareFrame(event.currentTarget);
                contentObserver.current?.disconnect();
                const content = event.currentTarget.contentDocument;
                const body = content?.querySelector<HTMLElement>(".cv-page");
                if (body && content) {
                  const measure = () => {
                    if (frame.current?.contentDocument !== content) return;
                    setSheetHeight(
                      Math.max(1123, Math.ceil(body.scrollHeight)),
                    );
                  };
                  measure();
                  contentObserver.current = new ResizeObserver(measure);
                  contentObserver.current.observe(body);
                  void content.fonts.ready.then(measure);
                }
              }}
              style={{
                width: sheetWidth,
                height: sheetHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
                maxWidth: "none",
              }}
              className="absolute top-0 left-0 bg-white"
            />
            {Array.from({ length: estimatedPages - 1 }, (_, index) => (
              <div
                key={index}
                className="live-page-boundary no-print"
                data-testid="live-page-boundary"
                style={{ top: (index + 1) * pageHeight * scale }}
                aria-hidden="true"
              >
                <span>
                  {copy("Page")} {index + 2}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="canvas-note">
        {onSelectSection && !pdf && (
          <span>{copy("Select a section on the page to edit it.")} </span>
        )}{" "}
        {copy(
          "Dashed lines mark approximate A4 page boundaries. Select Exact PDF pages to check actual page breaks before printing.",
        )}{" "}
      </p>
    </section>
  );
}
