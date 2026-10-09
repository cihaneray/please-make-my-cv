"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCopy } from "@/lib/copy";
import { PdfImportReport } from "@/lib/types";
import { A4ResumePreview } from "./A4ResumePreview";
import { Icons } from "./Icons";

export function PDFImport() {
  const copy = useCopy(),
    router = useRouter();
  const generation = useRef(0);
  const [file, setFile] = useState<File | null>(null),
    [report, setReport] = useState<PdfImportReport | null>(null);
  const [busy, setBusy] = useState(false),
    [applying, setApplying] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState("");
  async function analyze() {
    if (!file || busy) return;
    const current = ++generation.current;
    setBusy(true);
    setReport(null);
    setReviewed(false);
    setError("");
    try {
      const result = await api.reviewPdfImport(file);
      if (current === generation.current) setReport(result);
    } catch (err) {
      if (current === generation.current)
        setError(
          err instanceof Error ? copy(err.message) : copy("PDF review failed."),
        );
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function apply() {
    if (
      !report?.valid ||
      !report.previewDocument ||
      !reviewed ||
      applying ||
      busy
    )
      return;
    setApplying(true);
    setError("");
    try {
      const result = await api.applyImport(report.previewDocument);
      router.push(`/resumes/${result.metadata.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy("Import failed."));
      setApplying(false);
    }
  }
  const titles: Record<string, string> = {
    text: "Selectable text",
    sections: "Section headings",
    contact: "Contact details",
    integrity: "Text integrity",
    length: "Page count",
  };
  return (
    <div className="pdf-import-module">
      <header className="pdf-import-heading">
        <span>
          <Icons.Document size={18} />
          {copy("Existing PDF CV")}
        </span>
        <h1>{copy("Review a PDF, then make it editable")}</h1>
        <p>
          {copy(
            "Check the original PDF with local ATS heuristics. Preview extracted content before creating a new CV. No AI provider is used.",
          )}
        </p>
      </header>
      <section className="pdf-import-upload" aria-label={copy("Upload PDF CV")}>
        <label>
          {copy("Choose a PDF CV")}
          <input
            type="file"
            accept=".pdf,application/pdf"
            disabled={applying}
            onChange={(e) => {
              generation.current++;
              setReport(null);
              setReviewed(false);
              setBusy(false);
              setError("");
              const next = e.target.files?.[0] || null;
              if (
                next &&
                (!next.name.toLowerCase().endsWith(".pdf") ||
                  next.size > 4 * 1024 * 1024)
              ) {
                setFile(null);
                setError(copy("Choose a PDF up to 4 MB."));
              } else setFile(next);
            }}
          />
        </label>
        <p>
          {copy(
            "Text-based PDF · up to 4 MB and 10 pages. Scanned files need OCR before import.",
          )}
        </p>
        <button
          type="button"
          className="pdf-import-primary"
          disabled={!file || busy || applying}
          onClick={analyze}
        >
          {busy ? copy("Reading PDF…") : copy("Review PDF and preview import")}
        </button>
      </section>
      {error && (
        <p className="pdf-import-error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <section
            className="pdf-import-report"
            aria-labelledby="pdf-score-title"
          >
            <div className="pdf-import-report-heading">
              <div>
                <h2 id="pdf-score-title">
                  {copy("Original PDF · ATS heuristic")}
                </h2>
                <p>
                  {report.filename} · {report.pageCount} {copy("pages")} ·{" "}
                  {report.wordCount} {copy("extracted words")}
                </p>
              </div>
              <strong className="pdf-import-score">
                {report.atsScore == null
                  ? copy("Not assessed")
                  : `${report.atsScore}/100`}
              </strong>
            </div>
            <p>
              {copy(
                "A transparent file-readability heuristic, not an external ATS score or a job-match prediction. It measures extracted text and recognized headings; columns and reading order still need your review.",
              )}
            </p>
            {report.checks.length > 0 && (
              <div className="pdf-import-checks">
                {report.checks.map((check) => (
                  <details key={check.code}>
                    <summary>
                      <span>{copy(titles[check.code] || check.code)}</span>
                      <strong>
                        {check.points} / {check.maximum}
                      </strong>
                    </summary>
                    <p>{copy(check.message)}</p>
                  </details>
                ))}
              </div>
            )}
            <div className="pdf-import-notices">
              {report.warnings.map((w) => (
                <p key={w}>{copy(w)}</p>
              ))}
            </div>
          </section>
          {report.extractedText && (
            <details className="pdf-import-text">
              <summary>{copy("Inspect extracted text")}</summary>
              <pre>{report.extractedText}</pre>
            </details>
          )}
          {report.previewDocument && (
            <section
              className="pdf-import-preview"
              aria-labelledby="pdf-draft-title"
            >
              <div className="pdf-import-preview-heading">
                <h2 id="pdf-draft-title">{copy("Editable draft preview")}</h2>
                <p>
                  {copy(
                    "This uses the app's CV layout. The PDF's original layout is not preserved. Ambiguous experience lines stay together so you can organize them in the editor.",
                  )}
                </p>
              </div>
              <div className="pdf-import-canvas">
                <A4ResumePreview document={report.previewDocument} />
              </div>
              <footer>
                <label>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    disabled={applying}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  {copy(
                    "I reviewed the extraction and will check the fields in the editor.",
                  )}
                </label>
                <button
                  type="button"
                  className="pdf-import-primary"
                  disabled={!reviewed || applying || busy}
                  onClick={apply}
                >
                  {applying ? copy("Working…") : copy("Create editable CV")}
                </button>
              </footer>
            </section>
          )}
        </>
      )}
    </div>
  );
}
