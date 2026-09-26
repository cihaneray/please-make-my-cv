'use client';

import React from 'react';
import { Icons } from '@/components/Icons';
import { Language, useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-space-lg py-margin-desktop space-y-space-xl">
      {/* Settings Header */}
      <header className="flex flex-col gap-space-xs pb-space-lg border-b border-surface-container-high">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
          {t('settings')}
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">
          {t('settingsTitle')}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t('settingsSubtitle')}
        </p>
      </header>

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
        {/* Left Nav Overview */}
        <div className="flex flex-col gap-space-sm md:col-span-1">
          <div className="p-space-md rounded-lg bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {t('settings')}
            </span>
            <div className="text-[12px] text-secondary leading-relaxed">
              {t('saveSettings')}
            </div>
          </div>
        </div>

        {/* Right Settings Cards */}
        <div className="flex flex-col gap-space-lg md:col-span-2">
          {/* 1. Language & Localization Card */}
          <div className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-start justify-between border-b border-surface-container-high pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t('languageSectionTitle')}
                </span>
                <span className="text-[12px] text-secondary">
                  {t('languageSectionDesc')}
                </span>
              </div>
              <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container font-semibold uppercase text-secondary">
                {language.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* English Option */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                  language === 'en'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-surface-container-highest bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs">
                    🇬🇧
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t('englishLang')}
                    </span>
                    <span className="text-[11px] text-secondary">English</span>
                  </div>
                </div>
                {language === 'en' && (
                  <Icons.CheckCircle size={18} className="text-primary" />
                )}
              </button>

              {/* Turkish Option */}
              <button
                type="button"
                onClick={() => setLanguage('tr')}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                  language === 'tr'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-surface-container-highest bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs">
                    🇹🇷
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t('turkishLang')}
                    </span>
                    <span className="text-[11px] text-secondary">Türkçe</span>
                  </div>
                </div>
                {language === 'tr' && (
                  <Icons.CheckCircle size={18} className="text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Privacy & Data Architecture Card */}
          <div className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-start justify-between border-b border-surface-container-high pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t('privacySectionTitle')}
                </span>
                <span className="text-[12px] text-secondary">
                  {t('privacySectionDesc')}
                </span>
              </div>
              <span className="font-label-sm px-2 py-0.5 rounded bg-on-tertiary-container/10 font-semibold text-on-tertiary-container flex items-center gap-1">
                <Icons.CheckCircle size={12} />
                <span>{t('privacyStatus')}</span>
              </span>
            </div>

            <div className="text-[12.5px] text-on-surface-variant leading-relaxed">
              Your resume source code (YAML, JSON, Markdown), target job analyses, and achievements never leave this machine unless you explicitly configure an external AI endpoint.
            </div>
          </div>

          {/* 3. Theme & Workspace Aesthetic Card */}
          <div className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-start justify-between border-b border-surface-container-high pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t('themeSectionTitle')}
                </span>
                <span className="text-[12px] text-secondary">
                  {t('themeSectionDesc')}
                </span>
              </div>
              <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container font-semibold uppercase text-secondary">
                {t('currentTheme')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0F172A] border border-white shadow-sm" />
              <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-white shadow-sm" />
              <div className="w-6 h-6 rounded-full bg-[#3b82f6] border border-white shadow-sm" />
              <div className="w-6 h-6 rounded-full bg-[#059669] border border-white shadow-sm" />
              <span className="text-[11px] text-secondary pl-2">
                Minimalist Swiss editorial palette
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
