'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ResumeDocument } from '@/lib/types';
import { getResumeTemplate } from '@/features/resume-templates';
import { Icons } from './Icons';

interface A4ResumePreviewProps {
  document: ResumeDocument;
}

export function A4ResumePreview({ document }: A4ResumePreviewProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState<number>(100);

  const templateId = document.design?.template || document.metadata?.templateId || 'minimal';
  const templateDef = getResumeTemplate(templateId);
  const TemplateRenderer = templateDef.renderer;

  const isTr = (document.metadata?.language || 'en') === 'tr';
  const fullName = `${document.profile?.firstName || ''} ${document.profile?.lastName || ''}`.trim() || (isTr ? 'Ad Soyad' : 'Your Name');

  const marginsClass =
    document.design?.margins === 'compact' ? 'p-6 sm:p-7' :
    document.design?.margins === 'spacious' ? 'p-10 sm:p-12' : 'p-8 sm:p-10';

  const zoomScale = zoom / 100;

  return (
    <div className="flex-1 bg-surface-container relative overflow-auto flex flex-col items-center justify-start p-space-lg pb-24 select-text min-h-full print:p-0 print:bg-white print:overflow-visible">
      {/* A4 Sheet Presentation Wrapper */}
      <div
        className={`w-[595px] min-h-[842px] bg-white rounded-sm shadow-2xl ${marginsClass} flex flex-col justify-between my-8 shrink-0 transition-transform duration-150 origin-top a4-sheet border border-neutral-200/50 print:border-none print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 print:transform-none`}
        style={{
          transform: `scale(${zoomScale})`,
        }}
      >
        {/* Template Rendered Content */}
        <div className="w-full flex-1">
          <TemplateRenderer document={document} />
        </div>

        {/* Subtle Footer line */}
        <div className="flex items-center justify-between text-neutral-400 text-[9.5px] pt-6 border-t border-neutral-200/60 mt-6 select-none print:hidden">
          <span>{fullName} — {templateDef.name}</span>
          <span>A4 · 1 / 1</span>
        </div>
      </div>

      {/* Floating Bottom Preview Controls */}
      <div className="sticky bottom-4 mt-6 flex items-center gap-1 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg z-30 select-none no-print border border-surface-container-highest">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="w-6 h-6 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title={t('zoomOut')}
        >
          <Icons.Minus size={14} />
        </button>

        <span className="text-[11px] font-medium px-2 text-on-surface w-12 text-center">
          {zoom}%
        </span>

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(150, z + 10))}
          className="w-6 h-6 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title={t('zoomIn')}
        >
          <Icons.Add size={14} />
        </button>

        <div className="w-px h-3.5 bg-surface-container-high mx-1" />

        <button
          type="button"
          onClick={() => setZoom(100)}
          className="px-2 py-0.5 rounded text-[11px] text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          {t('reset')}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-2 py-0.5 rounded text-[11px] font-medium text-primary hover:bg-surface-container transition-colors flex items-center gap-1"
        >
          <Icons.Print size={14} />
          <span>{t('print')}</span>
        </button>
      </div>
    </div>
  );
}
