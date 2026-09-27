'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal Swiss',
    category: 'Design Systems & Product',
    description: 'Understated editorial layout inspired by Swiss modernist typography, active whitespace, and razor-sharp delineation lines.',
    recommendedFor: 'Product Designers, UI/UX Specialists, Design Technologists',
    accent: '#0F172A',
  },
  {
    id: 'technical',
    name: 'Technical Architecture',
    category: 'Engineering & Cloud',
    description: 'Dense, structured information architecture optimized for deep technical stacks, cloud certifications, and bulleted system outcomes.',
    recommendedFor: 'Backend Architects, Staff Engineers, DevOps, Cloud Developers',
    accent: '#131B2E',
  },
  {
    id: 'professional',
    name: 'Executive Editorial',
    category: 'Leadership & Strategy',
    description: 'High-contrast typography with balanced executive summary presentation designed for director and VP level visibility.',
    recommendedFor: 'Engineering Managers, Product Leads, Technical Directors',
    accent: '#1E293B',
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>('minimal');
  const [creating, setCreating] = useState<boolean>(false);

  async function handleUseTemplate(templateId: string) {
    try {
      setCreating(true);
      const newResume = await api.createResume({
        title: `Resume (${templateId.toUpperCase()})`,
        templateId: templateId,
      });
      router.push(`/resumes/${newResume.metadata.id}`);
    } catch (err: any) {
      alert(`Failed to create resume: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-[1120px] w-full mx-auto px-space-lg py-margin-desktop space-y-space-xl">
        <header className="flex flex-col gap-space-xs pb-space-lg border-b border-surface-container-high">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
            {t('gallery')}
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">
            {t('resumeTemplates')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('templatesSubtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedId(tmpl.id)}
                className={`p-space-lg rounded-xl bg-surface-container-lowest border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/20 shadow-md'
                    : 'border-surface-container-highest hover:border-outline-variant shadow-sm'
                }`}
              >
                <div className="flex flex-col gap-space-sm">
                  {/* Visual mockup banner */}
                  <div className="h-40 rounded-lg bg-surface-container-low p-4 flex flex-col justify-between border border-surface-container-highest">
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-16 rounded bg-neutral-300" />
                      <div className="h-2 w-8 rounded bg-neutral-200" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-neutral-200" />
                      <div className="h-1.5 w-4/5 rounded bg-neutral-200" />
                      <div className="h-1.5 w-2/3 rounded bg-neutral-200" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-3 w-8 rounded-full bg-neutral-300" />
                      <div className="h-3 w-10 rounded-full bg-neutral-300" />
                      <div className="h-3 w-8 rounded-full bg-neutral-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-headline-md text-on-surface font-semibold">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-surface-container text-secondary">
                      {t('a4Ready')}
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-secondary leading-relaxed">
                    {tmpl.description}
                  </p>

                  <div className="pt-2 text-[11px] text-on-surface-variant font-medium">
                    <span className="text-secondary">{t('bestFor')} </span>
                    {tmpl.recommendedFor}
                  </div>
                </div>

                <div className="pt-space-lg mt-space-md border-t border-surface-container-high flex items-center justify-between">
                  <span className="font-label-sm text-secondary capitalize">{tmpl.id} theme</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(tmpl.id);
                    }}
                    disabled={creating}
                    className="px-3 py-1.5 rounded bg-primary text-on-primary font-label-sm hover:bg-inverse-surface transition-colors shadow-xs"
                  >
                    {t('useTemplate')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
