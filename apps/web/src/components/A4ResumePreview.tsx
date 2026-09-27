'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [pageBreaks, setPageBreaks] = useState<number[]>([0]);
  const measureRef = useRef<HTMLDivElement>(null);

  const templateId = document.design?.template || document.metadata?.templateId || 'minimal';
  const templateDef = getResumeTemplate(templateId);
  const TemplateRenderer = templateDef.renderer;

  const isTr = (document.metadata?.language || 'en') === 'tr';
  const fullName = `${document.profile?.firstName || ''} ${document.profile?.lastName || ''}`.trim() || (isTr ? 'Ad Soyad' : 'Your Name');

  // Height and margin calculations based on A4 standard 595px x 842px (72 DPI)
  const margins = document.design?.margins || 'normal';
  const paddingY =
    margins === 'compact' ? 24 :
    margins === 'spacious' ? 42 : 32;

  const marginsClass =
    margins === 'compact' ? 'px-6 py-6' :
    margins === 'spacious' ? 'px-11 py-10' : 'px-9 py-8';

  const footerHeight = 36;
  const runningHeaderHeight = 26;

  // Usable vertical space inside an 842px A4 sheet
  const availablePage1 = 842 - (paddingY * 2) - footerHeight;
  const availableSubsequent = 842 - (paddingY * 2) - footerHeight - runningHeaderHeight;

  // Measure content and calculate optimal, non-destructive page break points
  useEffect(() => {
    if (!measureRef.current) return;

    const measure = () => {
      const container = measureRef.current;
      if (!container) return;

      const totalHeight = container.scrollHeight;

      if (totalHeight <= availablePage1) {
        setPageBreaks([0]);
        return;
      }

      const breaks: number[] = [0];
      let currentStart = 0;
      let currentLimit = availablePage1;

      // Find all breakable candidate elements
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>('[data-cv-entry="true"], [data-cv-section="true"]')
      );

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;

        // Skip items before current page
        if (top < currentStart) continue;

        // Check if item exceeds current page limit
        if (bottom - currentStart > currentLimit) {
          let breakPoint = top;

          // Check if item is inside a section; if it's the first item, don't orphan the section heading
          const parentSection = el.closest<HTMLElement>('[data-cv-section="true"]');
          if (parentSection && parentSection !== el) {
            const heading = parentSection.querySelector<HTMLElement>('[data-cv-heading="true"]');
            if (heading) {
              const headingTop = heading.offsetTop;
              const headingBottom = headingTop + heading.offsetHeight;
              if (headingTop >= currentStart && headingBottom - currentStart <= currentLimit) {
                const firstEntry = parentSection.querySelector<HTMLElement>('[data-cv-entry="true"]');
                if (firstEntry === el) {
                  breakPoint = headingTop;
                }
              }
            }
          }

          // Ensure advance to prevent infinite loop
          if (breakPoint <= currentStart) {
            breakPoint = top > currentStart ? top : currentStart + currentLimit;
          }

          breaks.push(breakPoint);
          currentStart = breakPoint;
          currentLimit = availableSubsequent;
        }
      }

      setPageBreaks(breaks.length > 0 ? breaks : [0]);
    };

    // Run measurement with slight frame delay to ensure typography fonts are settled
    const timeout = setTimeout(measure, 40);
    return () => clearTimeout(timeout);
  }, [document, margins, templateId, availablePage1, availableSubsequent]);

  const zoomScale = zoom / 100;
  const totalPages = pageBreaks.length;

  return (
    <div className="flex-1 bg-surface-container relative overflow-auto flex flex-col items-center justify-start p-space-lg pb-24 select-text min-h-full print:p-0 print:bg-white print:overflow-visible">
      {/* Offscreen Measurement Canvas (Used purely for DOM height calculations) */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className={`w-[595px] ${marginsClass} invisible pointer-events-none absolute -left-[99999px] top-0`}
        style={{
          fontFamily: document.design?.fontFamily,
        }}
      >
        <TemplateRenderer document={document} />
      </div>

      {/* Scaled A4 Sheets Stack */}
      <div
        className="flex flex-col items-center gap-6 my-4 transition-transform duration-150 origin-top print:gap-0 print:my-0 print:transform-none"
        style={{
          transform: `scale(${zoomScale})`,
        }}
      >
        {pageBreaks.map((startOffset, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;
          const pageAvailableHeight = isFirstPage ? availablePage1 : availableSubsequent;

          return (
            <React.Fragment key={pageIndex}>
              {/* Discrete A4 Page Sheet */}
              <div
                className={`w-[595px] h-[842px] max-h-[842px] bg-white rounded-sm shadow-2xl ${marginsClass} flex flex-col justify-between shrink-0 a4-sheet border border-neutral-200/50 relative overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0 print:w-full print:h-auto print:max-h-none`}
              >
                {/* Running Header on Page 2+ */}
                {!isFirstPage && (
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pb-2 mb-2 border-b border-neutral-200/60 shrink-0 select-none">
                    <span className="font-medium text-neutral-700">{fullName}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                      {isTr ? `Sayfa ${pageIndex + 1}` : `Page ${pageIndex + 1}`}
                    </span>
                  </div>
                )}

                {/* Windowed Template Content for Current Page */}
                <div
                  className="w-full flex-1 overflow-hidden relative"
                  style={{ height: `${pageAvailableHeight}px` }}
                >
                  <div
                    style={{
                      position: 'relative',
                      top: `-${startOffset}px`,
                      width: '100%',
                    }}
                  >
                    <TemplateRenderer document={document} />
                  </div>
                </div>

                {/* Running Footer on Each Page */}
                <div className="flex items-center justify-between text-neutral-400 text-[9.5px] pt-3 border-t border-neutral-200/60 mt-2 shrink-0 select-none print:hidden">
                  <span>{fullName} — {templateDef.name}</span>
                  <span className="font-mono">
                    {isTr ? `Sayfa ${pageIndex + 1} / ${totalPages}` : `Page ${pageIndex + 1} of ${totalPages}`}
                  </span>
                </div>
              </div>

              {/* Visual Page Break Indicator between sheets (Screen-only) */}
              {!isLastPage && (
                <div className="flex items-center gap-3 text-[11px] font-medium text-neutral-400 select-none no-print my-1">
                  <div className="w-12 h-px bg-neutral-300" />
                  <span>
                    {isTr
                      ? `Sayfa Sonu (${pageIndex + 1} / ${totalPages})`
                      : `Page Break (${pageIndex + 1} of ${totalPages})`}
                  </span>
                  <div className="w-12 h-px bg-neutral-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Floating Bottom Preview Controls */}
      <div className="sticky bottom-4 mt-6 flex items-center gap-1.5 bg-surface-container-lowest/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg z-30 select-none no-print border border-surface-container-highest">
        {/* Page Count Badge */}
        <div className="text-[11px] font-medium text-secondary px-2 border-r border-surface-container-high pr-2.5">
          {totalPages} {isTr ? (totalPages > 1 ? 'Sayfa' : 'Sayfa') : (totalPages > 1 ? 'Pages' : 'Page')}
        </div>

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="w-6 h-6 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title={t('zoomOut')}
        >
          <Icons.Minus size={14} />
        </button>

        <span className="text-[11px] font-medium px-1 text-on-surface w-10 text-center font-mono">
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
          className="px-2.5 py-1 rounded text-[11px] font-medium text-primary hover:bg-surface-container transition-colors flex items-center gap-1"
        >
          <Icons.Print size={14} />
          <span>{t('print')}</span>
        </button>
      </div>
    </div>
  );
}
