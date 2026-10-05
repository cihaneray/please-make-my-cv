"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";

/** A non-interactive first-page cover from the same renderer as the editor. */
export function DocumentCover({ id }: { id: string }) {
  const copy = useCopy();
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [html, setHtml] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setHtml("");
    setError(false);
    api
      .getResume(id)
      .then((doc) => api.preview(doc, controller.signal))
      .then((value) => {
        if (!cancelled) setHtml(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);
  return (
    <div className="document-cover" ref={viewport} aria-hidden="true">
      {html && width > 0 ? (
        <iframe
          title="Document cover"
          tabIndex={-1}
          sandbox=""
          srcDoc={html}
          style={{
            width: 794,
            height: 1123,
            transform: `scale(${width / 794})`,
            transformOrigin: "top left",
          }}
        />
      ) : (
        <div className="cover-placeholder">
          {error ? copy("Preview unavailable") : copy("Loading preview…")}
        </div>
      )}
    </div>
  );
}
