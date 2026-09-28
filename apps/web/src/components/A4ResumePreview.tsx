"use client";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { ResumeDocument } from "@/lib/types";
export function A4ResumePreview({ document }: { document: ResumeDocument }) {
  const copy = useCopy();

  const viewport = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(794);
  const [sheetHeight, setSheetHeight] = useState(1123);
  const [zoom, setZoom] = useState("fit");
  const sheetWidth = (210 * 96) / 25.4;
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
      className="flex-1 min-w-0 flex flex-col bg-surface-container p-4 overflow-auto"
    >
      <div className="workspace-tools flex flex-wrap gap-3 items-center mb-3 no-print">
        <button
          disabled={busy}
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
          {" "}
          {copy("Exact PDF pages")}{" "}
        </button>
        <button onClick={() => setPdf("")}> {copy("Live content")} </button>
        <span className="text-sm">
          {" "}
          {pdf ? "Print preview · A4" : "Live layout · A4 width"}{" "}
        </span>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.downloadPdf(document);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Generating…" : "Download PDF"}
        </button>
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
      {!pdf && (
        <label className="text-sm mb-3">
          Preview zoom{" "}
          <select
            aria-label="Preview zoom"
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
          >
            <option value="fit">
              Fit width (
              {Math.round(Math.min(1, availableWidth / sheetWidth) * 100)}%)
            </option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
          </select>
        </label>
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
            className="relative mx-auto bg-white shadow-sm"
            style={{ width: sheetWidth * scale, height: sheetHeight * scale }}
          >
            <iframe
              title="Resume document preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              onLoad={(event) => {
                const body =
                  event.currentTarget.contentDocument?.querySelector<HTMLElement>(
                    ".cv-page",
                  );
                if (body)
                  setSheetHeight(Math.max(1123, Math.ceil(body.scrollHeight)));
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
          </div>
        )}
      </div>
      <p className="text-xs mt-2">
        {" "}
        {copy(
          "Live layout preserves A4 width and margins; long documents continue vertically. Select Exact PDF pages to check actual page breaks before printing.",
        )}{" "}
      </p>
    </section>
  );
}
