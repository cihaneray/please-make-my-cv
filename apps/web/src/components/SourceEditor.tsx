'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { ResumeDocument } from '@/lib/types';
import { Icons } from './Icons';

interface SourceEditorProps {
  resumeId: string;
  revision: number;
  onDocumentUpdated: (doc: ResumeDocument) => void;
}

export function SourceEditor({ resumeId, revision, onDocumentUpdated }: SourceEditorProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<'yaml' | 'json' | 'markdown'>('yaml');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [validating, setValidating] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Fetch initial source representation
  useEffect(() => {
    let isCancelled = false;
    async function loadSource() {
      try {
        setLoading(true);
        const res = await api.getSource(resumeId, format);
        if (!isCancelled) {
          setCode(res.content);
          setErrors([]);
          setWarnings([]);
          setIsValid(true);
        }
      } catch (err: any) {
        if (!isCancelled) setErrors([err.message || 'Failed to load source code.']);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadSource();
    return () => {
      isCancelled = true;
    };
  }, [resumeId, format]);

  // Validate code with backend
  async function handleValidate(contentToValidate = code) {
    try {
      setValidating(true);
      const res = await api.validateSource(resumeId, format, contentToValidate);
      setIsValid(res.valid);
      setErrors(res.errors);
      setWarnings(res.warnings);
      return res.valid;
    } catch (err: any) {
      setIsValid(false);
      setErrors([err.message || 'Validation error']);
      return false;
    } finally {
      setValidating(false);
    }
  }

  // Apply source changes atomically
  async function handleApply() {
    try {
      setApplying(true);
      setErrors([]);
      const updatedDoc = await api.applySource(resumeId, format, code, revision);
      onDocumentUpdated(updatedDoc);
      alert('Source changes successfully applied and synchronized!');
    } catch (err: any) {
      setErrors([err.message || 'Failed to apply source changes.']);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-container-lowest h-full overflow-hidden select-text border-r border-surface-container-high">
      {/* Top Toolbar */}
      <div className="px-space-md py-space-sm bg-surface-container-lowest flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-container-high">
        <div className="flex items-center gap-space-sm">
          {/* Format Switcher */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg text-secondary font-label-sm text-label-sm">
            {(['yaml', 'json', 'markdown'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1 rounded font-semibold transition-colors uppercase ${
                  format === fmt
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'hover:text-on-surface'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-surface-container-highest" />

          <button
            type="button"
            onClick={() => handleValidate()}
            disabled={validating}
            className="h-7 px-space-sm flex items-center gap-1 rounded hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors"
          >
            <Icons.CheckCircle size={14} className="text-secondary" />
            <span>{validating ? t('validating') : t('validate')}</span>
          </button>
        </div>

        {/* Live Diagnostics & Apply Action */}
        <div className="flex items-center gap-space-md">
          {isValid ? (
            <span className="inline-flex items-center gap-1 text-on-tertiary-container text-label-sm font-medium">
              <Icons.CheckCircle size={14} />
              <span>{t('validSource')} ({format.toUpperCase()})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-error text-label-sm font-medium">
              <Icons.AlertCircle size={14} />
              <span>{t('syntaxIssues')}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleApply}
            disabled={applying || loading}
            className="h-7 px-space-md flex items-center gap-1 rounded bg-primary text-on-primary font-label-sm text-label-sm hover:bg-inverse-surface shadow-xs transition-colors font-medium disabled:opacity-50"
          >
            <Icons.Play size={13} />
            <span>{applying ? t('applying') : t('applyChanges')}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics Alerts */}
      {errors.length > 0 && (
        <div className="p-space-sm bg-error-container text-on-error-container text-[12px] flex flex-col gap-1 border-b border-error/20">
          <div className="font-semibold flex items-center gap-1">
            <Icons.AlertTriangle size={15} />
            <span>{t('validationErrors')}</span>
          </div>
          {errors.map((e, idx) => (
            <div key={idx} className="pl-4 font-mono">
              • {e}
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-space-sm bg-amber-50 text-amber-900 text-[12px] flex flex-col gap-1 border-b border-amber-200">
          <span className="font-semibold">{t('warnings')}</span>
          {warnings.map((w, idx) => (
            <div key={idx} className="pl-4">
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* Monospace Code Editor Area */}
      <div className="flex-1 w-full overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-secondary text-sm">
            {t('sourceLoading')}
          </div>
        ) : (
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            onBlur={() => handleValidate(code)}
            className="w-full h-full p-4 font-mono text-[12.5px] leading-relaxed bg-surface-container-lowest text-on-surface outline-none resize-none focus:ring-1 focus:ring-primary/20 border-0"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
