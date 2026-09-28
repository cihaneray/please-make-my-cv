"use client";
import { notify } from "@/components/Notifications";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Icons } from "./Icons";

export function Header() {
  const router = useRouter();
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);

  async function handleQuickNew() {
    try {
      setCreating(true);
      const newResume = await api.createResume({
        title: "New Resume",
        targetRole: "Software Engineer",
      });
      router.push(`/resumes/${newResume.metadata.id}`);
    } catch (err: any) {
      notify(`Could not create resume: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-highest z-40 flex items-center justify-between px-space-lg no-print">
      <select
        aria-label="Navigate workspace"
        className="mobile-navigation"
        defaultValue=""
        onChange={(e) => router.push(e.target.value)}
      >
        <option value="" disabled>
          Navigate
        </option>
        <option value="/">Home</option>
        <option value="/resumes">Resumes</option>
        <option value="/jobs">Jobs</option>
        <option value="/library">Library</option>
        <option value="/templates">Templates</option>
        <option value="/settings">Settings</option>
      </select>
      <div className="flex items-center gap-space-sm text-on-surface-variant w-80 max-w-md">
        <Icons.Search size={16} className="text-secondary" />
        <input
          type="text"
          aria-label="Search resumes"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              router.push(
                `/resumes?q=${encodeURIComponent(e.currentTarget.value)}`,
              );
          }}
          placeholder={t("searchPlaceholder")}
          className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-secondary"
        />
      </div>

      <div className="flex items-center gap-space-md">
        <Link
          href="/import"
          className="h-8 px-space-md flex items-center gap-space-xs rounded border border-surface-container-highest bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors"
        >
          <Icons.Upload size={14} className="text-secondary" />
          <span>{t("import")}</span>
        </Link>

        <button
          type="button"
          onClick={handleQuickNew}
          disabled={creating}
          className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-sm text-label-sm hover:bg-inverse-surface transition-colors shadow-sm disabled:opacity-50"
        >
          <Icons.Add size={15} />
          <span>{creating ? "..." : t("newDocument")}</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs">
          AV
        </div>
      </div>
    </header>
  );
}
