"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ResumeDocument } from "@/lib/types";
import { A4ResumePreview } from "./A4ResumePreview";
import { Icons } from "./Icons";
import styles from "./TranslationDraftDialog.module.css";

type Field = { path: (string | number)[]; label: string; value: string };
type Group = { title: string; fields: Field[] };

// Match the translator's narrative slots. Personal names, dates, IDs and technical terms
// remain intact while reviewers can edit every translated narrative, even if
// the model did not return a change for that field.
function narrativeGroups(document: ResumeDocument, tr: boolean): Group[] {
  const label = (en: string, turkish: string) => (tr ? turkish : en);
  const groups: Group[] = [];
  function add(
    title: string,
    item: object,
    path: (string | number)[],
    fields: [string, string][],
  ) {
    const values = item as Record<string, string | string[]>;
    const entries = fields.flatMap(([key, name]) =>
      Array.isArray(values[key])
        ? (values[key] as string[]).map((value, index) => ({
            path: [...path, key, index],
            label: `${name} ${index + 1}`,
            value,
          }))
        : [{ path: [...path, key], label: name, value: values[key] as string }],
    );
    if (entries.length) groups.push({ title, fields: entries });
  }
  add(
    label("Profile", "Profil"),
    document.profile,
    ["profile"],
    [["headline", label("Headline", "Başlık")]],
  );
  add(
    label("Summary", "Özet"),
    document,
    [],
    [["summary", label("Professional summary", "Profesyonel özet")]],
  );
  document.experience.forEach((item, index) =>
    add(
      `${label("Experience", "Deneyim")} ${index + 1} · ${item.company}`,
      item,
      ["experience", index],
      [
        ["position", label("Job title", "İş unvanı")],
        ["summary", label("Role summary", "Rol özeti")],
        ["bullets", label("Achievement", "Başarı")],
      ],
    ),
  );
  document.education.forEach((item, index) =>
    add(
      `${label("Education", "Eğitim")} ${index + 1} · ${item.institution}`,
      item,
      ["education", index],
      [
        ["degree", label("Degree", "Derece")],
        ["fieldOfStudy", label("Field of study", "Bölüm")],
        ["highlights", label("Highlight", "Öne çıkan")],
      ],
    ),
  );
  document.projects.forEach((item, index) =>
    add(
      `${label("Project", "Proje")} ${index + 1} · ${item.name}`,
      item,
      ["projects", index],
      [
        ["name", label("Project title", "Proje başlığı")],
        ["role", label("Role", "Rol")],
        ["bullets", label("Achievement", "Başarı")],
      ],
    ),
  );
  document.skills.forEach((item, index) =>
    add(
      `${label("Skills", "Beceriler")} ${index + 1}`,
      item,
      ["skills", index],
      [["category", label("Skill category", "Beceri kategorisi")]],
    ),
  );
  document.languages.forEach((item, index) =>
    add(
      `${label("Language", "Dil")} ${index + 1}`,
      item,
      ["languages", index],
      [
        ["language", label("Language", "Dil")],
        ["proficiency", label("Proficiency", "Seviye")],
      ],
    ),
  );
  document.customSections.forEach((section, index) => {
    add(
      `${label("Custom section", "Özel bölüm")} ${index + 1}`,
      section,
      ["customSections", index],
      [["title", label("Section title", "Bölüm başlığı")]],
    );
    section.items.forEach((item, itemIndex) =>
      add(
        `${section.title} · ${itemIndex + 1}`,
        item,
        ["customSections", index, "items", itemIndex],
        [
          ["title", label("Title", "Başlık")],
          ["subtitle", label("Subtitle", "Alt başlık")],
          ["description", label("Description", "Açıklama")],
          ["bullets", label("Highlight", "Öne çıkan")],
        ],
      ),
    );
  });
  return groups;
}

export function TranslationDraftDialog({
  document,
  title,
  language,
  busy,
  createDisabled = false,
  stale = false,
  error,
  onEdit,
  onTitle,
  onClose,
  onCreate,
}: {
  document: ResumeDocument;
  title: string;
  language: "en" | "tr";
  busy: boolean;
  createDisabled?: boolean;
  stale?: boolean;
  error: string;
  onEdit: (document: ResumeDocument) => void;
  onTitle: (title: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const tr = language === "tr";
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const noteId = useId();
  const [section, setSection] = useState("all");
  const groups = narrativeGroups(document, tr);
  const sectionName = (group: Group) =>
    String(group.fields[0]?.path[0] ?? "summary");
  const sections = [
    ["profile", tr ? "Profil" : "Profile"],
    ["summary", tr ? "Özet" : "Summary"],
    ["experience", tr ? "Deneyim" : "Experience"],
    ["education", tr ? "Eğitim" : "Education"],
    ["projects", tr ? "Projeler" : "Projects"],
    ["skills", tr ? "Beceriler" : "Skills"],
    ["languages", tr ? "Diller" : "Languages"],
    ["customSections", tr ? "Özel bölümler" : "Custom sections"],
  ].filter(([key]) => groups.some((group) => sectionName(group) === key));
  const [view, setView] = useState<"preview" | "edit">("preview");
  useEffect(() => {
    const element = dialog.current;
    const returnFocus = window.document.activeElement as HTMLElement | null;
    const overflow = window.document.body.style.overflow;
    element?.showModal();
    window.document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      window.document.body.style.overflow = overflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);
  function edit(field: Field, value: string) {
    const next = structuredClone(document);
    let node = next as unknown as Record<string | number, unknown>;
    for (const part of field.path.slice(0, -1))
      node = node[part] as typeof node;
    node[field.path[field.path.length - 1]] = value;
    onEdit(next);
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={noteId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], iframe, [tabindex="0"]',
          ),
        ).filter(
          (element) =>
            element.getClientRects().length > 0 &&
            !element.closest("fieldset:disabled"),
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && event.target === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && event.target === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={`document-popover ${styles.content}`}>
        <header className={styles.header}>
          <div>
            <h2 id={headingId}>
              {tr ? "Çevrilmiş CV’yi inceleyin" : "Review translated CV"}
            </h2>
            <p id={noteId}>
              {tr
                ? "Gerçekleri, anlamı ve teknik terimleri kontrol edin. Düzenlemeler ayrı çeviri taslağında tutulur."
                : "Check facts, meaning and technical terms. Edits stay in this separate translation draft."}
            </p>
          </div>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            aria-label={
              tr ? "Çeviri önizlemesini kapat" : "Close translation preview"
            }
          >
            <Icons.Close size={18} />
          </button>
        </header>
        <nav
          className={styles.views}
          aria-label={tr ? "Çeviri görünümü" : "Translation view"}
        >
          <button
            type="button"
            aria-pressed={view === "preview"}
            onClick={() => setView("preview")}
          >
            {tr ? "Tam CV önizlemesi" : "Full CV preview"}
          </button>
          <button
            type="button"
            aria-pressed={view === "edit"}
            onClick={() => setView("edit")}
          >
            {tr ? "Çeviriyi düzenle" : "Edit translation"}
          </button>
        </nav>
        <div className={styles.body}>
          {view === "preview" ? (
            <A4ResumePreview document={document} disabled={busy} />
          ) : (
            <div className={styles.editor}>
              <p>
                {tr
                  ? "İsimler, tarihler, bağlantılar ve teknik beceriler tam CV önizlemesinde korunur."
                  : "Names, dates, links and technical skills are preserved in the full CV preview."}
              </p>
              <nav
                className={styles.sections}
                aria-label={tr ? "Çeviri bölümleri" : "Translation sections"}
              >
                {[["all", tr ? "Tümü" : "All"], ...sections].map(
                  ([key, name]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={section === key}
                      onClick={() => setSection(key)}
                    >
                      {name}
                    </button>
                  ),
                )}
              </nav>
              <div className={styles.groups}>
                {groups
                  .filter(
                    (group) =>
                      section === "all" || sectionName(group) === section,
                  )
                  .map((group) => (
                    <fieldset
                      key={group.fields[0].path.join(".")}
                      disabled={busy}
                      aria-label={group.title}
                      className={
                        group.fields.every(
                          (field) =>
                            ![
                              "summary",
                              "bullets",
                              "highlights",
                              "description",
                            ].some((key) => field.path.includes(key)),
                        )
                          ? styles.compactGroup
                          : styles.fullGroup
                      }
                    >
                      <h3>{group.title}</h3>
                      {group.fields.map((field) => {
                        const multiline = [
                          "summary",
                          "bullets",
                          "highlights",
                          "description",
                        ].some((key) => field.path.includes(key));
                        return (
                          <label key={field.path.join(".")}>
                            <span>{field.label}</span>
                            {multiline ? (
                              <textarea
                                rows={field.value.length > 100 ? 4 : 2}
                                value={field.value}
                                onChange={(event) =>
                                  edit(field, event.target.value)
                                }
                              />
                            ) : (
                              <input
                                value={field.value}
                                onChange={(event) =>
                                  edit(field, event.target.value)
                                }
                              />
                            )}
                          </label>
                        );
                      })}
                    </fieldset>
                  ))}
              </div>
            </div>
          )}
        </div>
        <footer className={styles.footer}>
          {stale && (
            <p role="status">
              {tr
                ? "Bu taslak, kaynak CV’nin önceki metnine dayanıyor. Oluşturmadan önce son değişiklikleri kontrol edin."
                : "This draft is based on earlier source text. Check the latest changes before creating a CV from it."}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <label>
            {tr ? "Yeni CV adı" : "New CV title"}
            <input
              value={title}
              disabled={busy}
              maxLength={255}
              onChange={(event) => onTitle(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={onClose}>
              {tr ? "Kapat ve taslağı sakla" : "Close and keep draft"}
            </button>
            <button
              type="button"
              disabled={busy || createDisabled || !title.trim()}
              onClick={onCreate}
            >
              {busy
                ? tr
                  ? "Oluşturuluyor…"
                  : "Creating…"
                : stale
                  ? tr
                    ? "Saklanan taslaktan ayrı CV oluştur"
                    : "Create separate CV from kept draft"
                  : tr
                    ? "Onayla ve ayrı CV oluştur"
                    : "Confirm and create separate CV"}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
