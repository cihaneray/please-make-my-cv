"use client";
import React, { useEffect, useState } from "react";
import { ThemePicker } from "@/components/ThemeProvider";
import { AISettings } from "@/components/AISettings";
import { WorkspaceBackup } from "@/components/WorkspaceBackup";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/lib/i18n";
import { useCopy } from "@/lib/copy";
import { version } from "../../../package.json";

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n();
  const copy = useCopy();
  const [active, setActive] = useState("language");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActive(visible[visible.length - 1].target.id);
      },
      { rootMargin: "-90px 0px -50% 0px", threshold: 0 },
    );
    [
      "language",
      "theme",
      "privacy",
      "ai-connection",
      "workspace-backup",
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  const sections = [
    { id: "language", label: t("navGeneral"), icon: Icons.Globe },
    { id: "theme", label: t("navAesthetic"), icon: Icons.Settings },
    { id: "privacy", label: t("navPrivacy"), icon: Icons.Shield },
    {
      id: "ai-connection",
      label: copy("LLM connection"),
      icon: Icons.Sparkles,
    },
    {
      id: "workspace-backup",
      label: copy("Workspace backup"),
      icon: Icons.Document,
    },
  ];
  return (
    <div className="settings-page">
      <header className="settings-page-heading">
        <span>{t("settings")}</span>
        <h1>{t("settingsTitle")}</h1>
        <p>{t("settingsSubtitle")}</p>
      </header>
      <div className="settings-layout">
        <aside className="settings-navigation">
          <h2>{copy("On this page")}</h2>
          <nav aria-label={copy("Settings sections")}>
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                onClick={() => setActive(id)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="settings-navigation-footer">
            <p>
              <Icons.CheckCircle size={15} />
              {copy("Language and theme are saved in this browser.")}
            </p>
            <span>
              {copy("Version")} <code>v{version}</code>
            </span>
          </div>
        </aside>
        <div className="settings-sections">
          <section
            id="language"
            className="settings-card"
            aria-labelledby="settings-language-title"
          >
            <div className="settings-card-heading">
              <div>
                <h2 id="settings-language-title">
                  {t("languageSectionTitle")}
                </h2>
                <p>{t("languageSectionDesc")}</p>
              </div>
              <span className="settings-badge">{language.toUpperCase()}</span>
            </div>
            <div className="settings-language-options">
              {(
                [
                  {
                    value: "en",
                    code: "EN",
                    title: t("englishLang"),
                    subtitle: "English",
                  },
                  {
                    value: "tr",
                    code: "TR",
                    title: t("turkishLang"),
                    subtitle: "Türkçe",
                  },
                ] as const
              ).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={language === option.value}
                  onClick={() => setLanguage(option.value)}
                  className="settings-language-option"
                >
                  <span className="settings-language-code" aria-hidden="true">
                    {option.code}
                  </span>
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.subtitle}</small>
                  </span>
                  <span className="settings-selection-mark" aria-hidden="true">
                    {language === option.value && <Icons.Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section
            id="theme"
            className="settings-card"
            aria-labelledby="settings-theme-title"
          >
            <div className="settings-card-heading">
              <div>
                <h2 id="settings-theme-title">
                  {copy("Workspace appearance")}
                </h2>
                <p>
                  {copy(
                    "Choose the appearance that feels comfortable while editing.",
                  )}
                </p>
              </div>
            </div>
            <ThemePicker />
          </section>
          <section
            id="privacy"
            className="settings-card"
            aria-labelledby="settings-privacy-title"
          >
            <div className="settings-card-heading">
              <div>
                <h2 id="settings-privacy-title">{copy("Your data and AI")}</h2>
                <p>
                  {copy(
                    "Where your documents are stored and when content is shared.",
                  )}
                </p>
              </div>
              <Icons.Shield
                size={22}
                className="settings-heading-icon"
                aria-hidden="true"
              />
            </div>
            <div className="settings-privacy-items">
              <div>
                <span className="settings-privacy-icon">
                  <Icons.Document size={19} />
                </span>
                <div>
                  <h3>{copy("Workspace storage")}</h3>
                  <p>
                    {copy(
                      "CVs and photos are stored by your configured API. Protect the database and exported backup files.",
                    )}
                  </p>
                </div>
              </div>
              <div>
                <span className="settings-privacy-icon">
                  <Icons.Sparkles size={19} />
                </span>
                <div>
                  <h3>{copy("AI on request")}</h3>
                  <p>
                    {copy(
                      "When AI is enabled, requested reviews send career content to the selected provider. CV photos and contact fields are excluded; free text may still contain personal details.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
          <div id="ai-connection">
            <AISettings />
          </div>
          <div id="workspace-backup">
            <WorkspaceBackup />
          </div>
        </div>
      </div>
    </div>
  );
}
