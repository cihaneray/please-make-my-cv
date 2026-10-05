"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useCopy } from "@/lib/copy";
import { notify } from "./Notifications";
import { Icons } from "./Icons";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage } = useI18n();
  const copy = useCopy();
  const [creating, setCreating] = useState(false);
  const studio = /^\/resumes\/[^/]+$/.test(pathname);
  const pages = [
    ["/", t("home")],
    ["/resumes", t("resumes")],
    ["/jobs", t("jobs")],
    ["/library", t("library")],
    ["/templates", t("templates")],
    ["/settings", t("settings")],
  ];
  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const doc = await api.createResume({
        title: t("newResume"),
        targetRole: "",
      });
      router.push(`/resumes/${doc.metadata.id}`);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setCreating(false);
    }
  }
  return (
    <header className="workspace-header no-print">
      <div className="workspace-location">
        <select
          aria-label="Navigate workspace"
          className="mobile-navigation"
          value={
            studio
              ? "/resumes"
              : pages.some(([url]) => url === pathname)
                ? pathname
                : "/"
          }
          onChange={(e) => router.push(e.target.value)}
        >
          {pages.map(([url, label]) => (
            <option key={url} value={url}>
              {label}
            </option>
          ))}
        </select>
        <Link href="/" className="header-wordmark">
          CV Workspace
        </Link>
        <span className="header-divider">/</span>
        <span className="header-location">
          {studio
            ? copy("Document studio")
            : pages.find(([url]) => url === pathname)?.[1] || t("importCv")}
        </span>
      </div>
      <div className="header-actions">
        {!studio && (
          <label className="header-search">
            <Icons.Search size={16} />
            <input
              type="search"
              aria-label={copy("Search resumes")}
              placeholder={copy("Find a document…")}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  router.push(
                    `/resumes?q=${encodeURIComponent(e.currentTarget.value)}`,
                  );
              }}
            />
          </label>
        )}
        <button
          className="header-language"
          onClick={() => setLanguage(language === "en" ? "tr" : "en")}
          aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
        >
          {language.toUpperCase()}
        </button>
        {studio ? (
          <Link className="editorial-link" href="/resumes">
            {copy("All documents")} <Icons.ArrowRight size={14} />
          </Link>
        ) : (
          <button
            className="header-create"
            onClick={create}
            disabled={creating}
          >
            <Icons.Add size={16} />
            {creating ? t("saving") : t("newDocument")}
          </button>
        )}
      </div>
    </header>
  );
}
