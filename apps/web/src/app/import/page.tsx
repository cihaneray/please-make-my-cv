'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { A4ResumePreview } from '@/components/A4ResumePreview';
import { api } from '@/lib/api';
import { ResumeDocument } from '@/lib/types';

export default function ImportPage() {
  const router = useRouter();
  const [content, setContent] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<ResumeDocument | null>(null);
  const [detectedFmt, setDetectedFmt] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sectionSummary, setSectionSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);

  // File drop handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      runPreview(text);
    };
    reader.readAsText(file);
  }

  async function runPreview(textToPreview = content) {
    if (!textToPreview.trim()) return;
    try {
      setLoading(true);
      setErrors([]);
      const res = await api.previewImport(textToPreview);
      setDetectedFmt(res.detectedFormat);
      setWarnings(res.warnings);
      setErrors(res.errors);
      setPreviewDoc(res.previewDocument);
      setSectionSummary(res.sectionSummary);
    } catch (err: any) {
      setErrors([err.message || 'Import preview failed.']);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!previewDoc) return;
    try {
      setApplying(true);
      const imported = await api.applyImport(previewDoc);
      router.push(`/resumes/${imported.metadata.id}`);
    } catch (err: any) {
      alert(`Import apply failed: ${err.message}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top Header */}
      <div className="h-12 w-full bg-surface-container-lowest flex items-center justify-between px-space-lg shrink-0 border-b border-surface-container-high no-print">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span className="font-headline-md text-headline-md font-semibold">
            Import & Normalize Resume
          </span>
          {detectedFmt && (
            <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container uppercase text-secondary font-semibold">
              Format: {detectedFmt}
            </span>
          )}
        </div>

        {previewDoc && (
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="h-8 px-space-lg flex items-center gap-1.5 rounded-lg bg-primary text-on-primary font-label-md shadow hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">check</span>
            <span>{applying ? 'Importing...' : 'Confirm & Save to Workspace'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Side: Input & Parsing Stage */}
        <div className="w-[500px] bg-surface-container-lowest flex flex-col p-space-lg gap-space-md border-r border-surface-container-high overflow-y-auto no-print">
          {/* File Upload Box */}
          <div className="flex flex-col gap-2">
            <label className="font-label-sm text-secondary uppercase font-semibold">
              Upload Resume File (.json, .yaml, .yml, .md)
            </label>
            <input
              type="file"
              accept=".json,.yaml,.yml,.md,.markdown"
              onChange={handleFileUpload}
              className="file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-label-sm file:font-semibold file:bg-surface-container file:text-on-surface hover:file:bg-surface-container-high cursor-pointer text-body-sm text-secondary"
            />
          </div>

          <div className="flex items-center gap-2 text-secondary text-[11px]">
            <div className="h-px bg-surface-container-high flex-1" />
            <span>OR PASTE RAW CONTENT</span>
            <div className="h-px bg-surface-container-high flex-1" />
          </div>

          {/* Paste Raw Content */}
          <div className="flex flex-col flex-1 gap-2">
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste raw YAML, JSON, or Markdown resume text here..."
              className="w-full h-64 p-3 rounded-lg bg-surface-container-low font-mono text-[12px] leading-relaxed outline-none border border-surface-container-highest resize-none focus:bg-surface-container-lowest"
            />

            <button
              type="button"
              onClick={() => runPreview(content)}
              disabled={loading || !content.trim()}
              className="h-8 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing Content...' : 'Parse & Generate Preview'}
            </button>
          </div>

          {/* Parsing Diagnostics */}
          {errors.length > 0 && (
            <div className="p-3 rounded bg-error-container text-on-error-container text-[12px] flex flex-col gap-1">
              <span className="font-semibold">Parse Errors:</span>
              {errors.map((err, idx) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 rounded bg-amber-50 text-amber-900 text-[12px] flex flex-col gap-1">
              <span className="font-semibold">Warnings / Migrations:</span>
              {warnings.map((w, idx) => (
                <div key={idx}>• {w}</div>
              ))}
            </div>
          )}

          {/* Section Summary */}
          {previewDoc && (
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 border border-surface-container-highest">
              <span className="font-label-sm text-secondary uppercase font-semibold">
                Detected Resume Structure
              </span>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>Name: <strong>{previewDoc.profile.firstName} {previewDoc.profile.lastName}</strong></div>
                <div>Experience: <strong>{sectionSummary.experience || 0} roles</strong></div>
                <div>Education: <strong>{sectionSummary.education || 0} entries</strong></div>
                <div>Skills: <strong>{sectionSummary.skills || 0} competencies</strong></div>
                <div>Projects: <strong>{sectionSummary.projects || 0} items</strong></div>
                <div>Custom: <strong>{sectionSummary.customSections || 0} sections</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Normalized Preview */}
        {previewDoc ? (
          <A4ResumePreview document={previewDoc} />
        ) : (
          <div className="flex-1 bg-surface-container flex items-center justify-center text-secondary text-body-md">
            Upload or paste content to see normalized A4 canvas preview before importing.
          </div>
        )}
      </div>
    </div>
  );
}
