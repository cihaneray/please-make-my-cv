"use client";
import React from "react";
import { ThemePicker } from "@/components/ThemeProvider";
import { AISettings } from "@/components/AISettings";
import { WorkspaceBackup } from "@/components/WorkspaceBackup";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/lib/i18n";
import { useCopy } from "@/lib/copy";
export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n();
  const copy = useCopy();
  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-space-lg py-margin-desktop space-y-space-xl">
      {/* Settings Header */}
      <header className="flex flex-col gap-space-xs pb-space-lg border-b border-surface-container-high">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
          {t("settings")}
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">
          {t("settingsTitle")}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t("settingsSubtitle")}
        </p>
      </header>
      <AISettings />
      <WorkspaceBackup />
      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
        {/* Left Column: Navigation & System Status */}
        <div className="flex flex-col gap-space-md md:col-span-1">
          {/* Quick Nav Panel */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-xs flex flex-col gap-2">
            <span className="font-label-sm uppercase tracking-wider text-secondary font-semibold px-2 pt-1">
              {t("settings")}
            </span>
            <nav className="flex flex-col gap-1">
              <a
                href="#language"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icons.Globe size={16} className="text-secondary" />
                <span>{t("navGeneral")}</span>
              </a>
              <a
                href="#privacy"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icons.Shield size={16} className="text-secondary" />
                <span>{t("navPrivacy")}</span>
              </a>
              <a
                href="#theme"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icons.Sparkles size={16} className="text-secondary" />
                <span>{t("navAesthetic")}</span>
              </a>
            </nav>
            <div className="mt-2 pt-3 border-t border-surface-container-high flex flex-col gap-2">
              {/* Autosave Pill */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50/90 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 leading-tight">
                <Icons.CheckCircle
                  size={14}
                  className="text-emerald-600 shrink-0"
                />
                <span>{t("saveSettings")}</span>
              </div>
              {/* Status info */}
              <div className="flex items-center justify-between text-[11px] text-secondary px-1 pt-1">
                <span>{t("systemStatus")}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container">
                  v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Right Column: Settings Cards */}
        <div className="flex flex-col gap-space-lg md:col-span-2">
          {/* 1. Language & Localization Card */}
          <div
            id="language"
            className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-xs flex flex-col gap-space-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-4">
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t("languageSectionTitle")}
                </span>
                <span className="text-[12.5px] text-secondary leading-normal">
                  {t("languageSectionDesc")}
                </span>
              </div>
              <span className="shrink-0 font-label-sm px-2.5 py-1 rounded-full bg-surface-container font-semibold uppercase text-secondary tracking-wider text-[11px] self-start sm:self-center border border-surface-container-highest">
                {language.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* English Option */}
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  language === "en"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-surface-container-highest bg-surface-container-low hover:bg-surface-container hover:border-surface-container-highest"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container-lowest border border-surface-container-high flex items-center justify-center text-sm shadow-xs">
                    🇬🇧
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t("englishLang")}
                    </span>
                    <span className="text-[11px] text-secondary">English</span>
                  </div>
                </div>
                {language === "en" && (
                  <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                    <Icons.Check size={12} />
                  </div>
                )}
              </button>
              {/* Turkish Option */}
              <button
                type="button"
                onClick={() => setLanguage("tr")}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  language === "tr"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-surface-container-highest bg-surface-container-low hover:bg-surface-container hover:border-surface-container-highest"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container-lowest border border-surface-container-high flex items-center justify-center text-sm shadow-xs">
                    🇹🇷
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t("turkishLang")}
                    </span>
                    <span className="text-[11px] text-secondary">Türkçe</span>
                  </div>
                </div>
                {language === "tr" && (
                  <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                    <Icons.Check size={12} />
                  </div>
                )}
              </button>
            </div>
          </div>
          {/* 2. Privacy & Data Architecture Card */}
          <div
            id="privacy"
            className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-xs flex flex-col gap-space-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-4">
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t("privacySectionTitle")}
                </span>
                <span className="text-[12.5px] text-secondary leading-normal">
                  {t("privacySectionDesc")}
                </span>
              </div>
              {/* Refined 'Aktif ve Güvenli' Badge */}
              <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs self-start sm:self-center whitespace-nowrap">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{t("privacyStatus")}</span>
              </div>
            </div>
            {/* Privacy Architecture Callout Box */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Icons.Shield size={18} />
              </div>
              <div className="flex flex-col gap-1.5 text-[12.5px] text-on-surface-variant leading-relaxed">
                <span className="font-semibold text-on-surface text-[13px]">
                  {t("localDataPromiseTitle")}
                </span>
                <p>{t("privacyDetails")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11.5px] text-secondary font-medium">
                  <span className="flex items-center gap-1.5">
                    <Icons.CheckCircle
                      size={13}
                      className="text-emerald-600 shrink-0"
                    />
                    <span>
                      {copy(
                        "Local processing · no legal compliance certification",
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icons.CheckCircle
                      size={13}
                      className="text-emerald-600 shrink-0"
                    />
                    <span>{copy("Storage configured by your local API")}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* 3. Theme & Workspace Aesthetic Card */}
          <div
            id="theme"
            className="p-space-xl rounded-xl bg-surface-container-lowest border border-surface-container-highest shadow-xs flex flex-col gap-space-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-4">
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  {t("themeSectionTitle")}
                </span>
                <span className="text-[12.5px] text-secondary leading-normal">
                  {t("themeSectionDesc")}
                </span>
              </div>
            </div>
            <ThemePicker />
          </div>
        </div>
      </div>
    </div>
  );
}
