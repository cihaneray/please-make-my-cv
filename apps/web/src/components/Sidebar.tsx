"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SlidingIndicator } from "./SlidingIndicator";
import { Icons } from "./Icons";

export function Sidebar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useI18n();
  const items = [
    { label: t("home"), href: "/", icon: Icons.Home },
    { label: t("resumes"), href: "/resumes", icon: Icons.Document },
    { label: t("jobs"), href: "/jobs", icon: Icons.Jobs },
    { label: t("library"), href: "/library", icon: Icons.Library },
    { label: t("templates"), href: "/templates", icon: Icons.Templates },
    { label: t("settings"), href: "/settings", icon: Icons.Settings },
  ];
  return (
    <aside className="workspace-rail no-print">
      <Link
        href="/"
        className="rail-brand"
        aria-label={language === "tr" ? "CV Çalışma Alanı" : "CV Workspace"}
      >
        cv<span>.</span>
      </Link>
      <nav aria-label={language === "tr" ? "Çalışma alanı" : "Workspace"}>
        <SlidingIndicator active={pathname} variant="rail" />
        {items.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
              className={`rail-link ${active ? "is-active" : ""}`}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="rail-bottom">
        <Link
          className="rail-link"
          href="/import"
          aria-label={t("importCv")}
          title={t("importCv")}
        >
          <Icons.Upload size={20} />
          <span>{t("importCv")}</span>
        </Link>
        <button
          type="button"
          className="rail-language"
          aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
          onClick={() => setLanguage(language === "en" ? "tr" : "en")}
        >
          {language.toUpperCase()}
        </button>
      </div>
    </aside>
  );
}
