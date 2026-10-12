"use client";
import { useCopy } from "@/lib/copy";
import { notify } from "@/components/Notifications";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/Icons";
import { api, errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LibraryItemType, LibrarySnippet } from "@/lib/types";
import LibraryResumeBuilder from "@/components/LibraryResumeBuilder";
import { useAnchoredPopover } from "@/components/useAnchoredPopover";
import popoverStyles from "@/components/ActionPopover.module.css";

export default function LibraryPage() {
  const { t, language } = useI18n();
  const copy = useCopy();
  const [metrics, setMetrics] = useState<{
    atsAverage: number | null;
    resumeCount: number;
  } | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [technical, setTechnical] = useState("");
  const [concise, setConcise] = useState("");
  const [snippets, setSnippets] = useState<LibrarySnippet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadError =
    language === "tr"
      ? "Kütüphane yüklenemedi. API bağlantısını kontrol edip tekrar deneyin."
      : "Could not load the library. Check the API connection and try again.";
  const loadErrorRef = useRef(loadError);
  const loadGeneration = useRef(0);
  useEffect(() => {
    loadErrorRef.current = loadError;
  }, [loadError]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const {
    open: tagFilterOpen,
    setOpen: setTagFilterOpen,
    triggerRef: tagFilterTriggerRef,
    popupRef: tagFilterPopupRef,
  } = useAnchoredPopover({ width: 320, maxHeight: 420 });
  const [tagSearch, setTagSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddBox, setShowAddBox] = useState<boolean>(false);

  const snippetDialog = useRef<HTMLDialogElement>(null);
  const atsInfoRef = useRef<HTMLDetailsElement>(null);
  const tagSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeInfo = (event: PointerEvent | KeyboardEvent) => {
      const info = atsInfoRef.current;
      if (!info?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        info.open = false;
        info.querySelector("summary")?.focus();
      } else if (!info.contains(event.target as Node)) {
        info.open = false;
      }
    };
    document.addEventListener("pointerdown", closeInfo);
    document.addEventListener("keydown", closeInfo);
    return () => {
      document.removeEventListener("pointerdown", closeInfo);
      document.removeEventListener("keydown", closeInfo);
    };
  }, []);

  useEffect(() => {
    if (!tagFilterOpen) return;
    tagSearchRef.current?.focus();
  }, [tagFilterOpen]);

  useEffect(() => {
    if (!showAddBox) return;
    const dialog = snippetDialog.current;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      previousFocus?.focus();
      document.body.style.overflow = previousOverflow;
    };
  }, [showAddBox]);

  // New snippet state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newTags, setNewTags] = useState("");

  const loadSnippets = useCallback(async () => {
    const request = ++loadGeneration.current;
    try {
      setLoading(true);
      setLoadFailed(false);
      const data = await api.listSnippets();
      if (request !== loadGeneration.current) return;
      setSnippets(data);
      setLoaded(true);
    } catch {
      if (request !== loadGeneration.current) return;
      setLoadFailed(true);
      notify(loadErrorRef.current);
    } finally {
      if (request === loadGeneration.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const generation = loadGeneration;
    void loadSnippets();
    return () => {
      generation.current++;
    };
  }, [loadSnippets]);
  useEffect(() => {
    api
      .workspaceMetrics()
      .then(setMetrics)
      .catch(() => setMetricsError(true));
  }, []);

  async function handleCreateSnippet(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!newContent.trim()) {
      setFormError(copy("Enter an achievement before saving."));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const tagsList = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        title: newTitle.trim() || copy("Career Achievement"),
        content: newContent.trim(),
        category: newCategory,
        tags: tagsList,
        type:
          snippets.find((item) => item.id === editingId)?.type ||
          LibraryItemType.BULLET,
        variants: [
          ...(editingId
            ? (
                snippets.find((item) => item.id === editingId)?.variants || []
              ).filter((v) => !["technical", "concise"].includes(v.type))
            : []),
          ...(technical.trim()
            ? [
                {
                  id: crypto.randomUUID(),
                  type: "technical",
                  text: technical.trim(),
                },
              ]
            : []),
          ...(concise.trim()
            ? [
                {
                  id: crypto.randomUUID(),
                  type: "concise",
                  text: concise.trim(),
                },
              ]
            : []),
        ],
      };
      const created = editingId
        ? await api.updateSnippet(editingId, payload)
        : await api.createSnippet(payload);
      setSnippets(
        editingId
          ? snippets.map((item) => (item.id === editingId ? created : item))
          : [created, ...snippets],
      );
      setEditingId(null);
      setTechnical("");
      setConcise("");
      setNewCategory("General");
      setNewTags("");
      setShowAddBox(false);
      setNewTitle("");
      setNewContent("");
    } catch (err: unknown) {
      setFormError(
        `${copy("Could not save the snippet.")} ${errorMessage(err)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSnippet(id: string) {
    if (confirm(copy("Delete this career snippet from the library?"))) {
      try {
        await api.deleteSnippet(id);
        setSnippets(snippets.filter((s) => s.id !== id));
      } catch (err: unknown) {
        notify(`Delete failed: ${errorMessage(err)}`);
      }
    }
  }

  const filtered = snippets.filter((s) => {
    if (activeTag !== "all" && !s.tags.includes(activeTag)) return false;
    return [
      s.title,
      s.content,
      s.category,
      ...s.tags,
      ...s.variants.map((v) => v.text),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(searchQuery.trim().toLocaleLowerCase());
  });
  const tags = Array.from(new Set(snippets.flatMap((item) => item.tags))).sort(
    (a, b) => a.localeCompare(b),
  );
  const visibleTags = tags.filter((tag) =>
    tag.toLocaleLowerCase().includes(tagSearch.trim().toLocaleLowerCase()),
  );
  const activeTagCount =
    activeTag === "all"
      ? snippets.length
      : snippets.filter((item) => item.tags.includes(activeTag)).length;

  return (
    <div className="career-library flex flex-col w-full">
      {/* Library header */}
      <div className="library-header relative z-10 w-full bg-surface-container-lowest px-margin-desktop py-space-xl shadow-sm border-b border-surface-container-high">
        <div className="relative max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs max-w-2xl">
              <div className="flex items-center gap-space-sm">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary px-space-xs py-0.5 rounded bg-surface-container">
                  {copy("Career library")}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed-dim" />
                <span className="font-label-sm text-label-sm text-secondary">
                  {t("librarySubheading")}
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                {t("careerLibraryTitle")}
              </h1>
              <p className="font-body-md text-body-md text-secondary">
                {t("libraryDescription")}
              </p>
            </div>

            {/* Metric Pulse */}
            <div className="flex flex-col gap-space-sm w-full md:max-w-md">
              <div className="library-metric-card flex items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded border border-surface-container-highest">
                <div className="flex flex-col">
                  <span className="library-metric-label font-label-sm text-label-sm text-secondary uppercase">
                    {t("snippetsStored")}
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    {loaded ? snippets.length : "-"}
                  </span>
                </div>
                <div className="w-px h-6 bg-surface-container-highest" />
                <div className="flex flex-col">
                  <div className="library-ats-heading">
                    <span className="font-label-sm text-label-sm text-secondary uppercase">
                      {copy("Saved CV ATS average")}
                    </span>
                    <details ref={atsInfoRef} className="library-ats-info">
                      <summary aria-label={copy("About this score")}>
                        <span
                          className="library-ats-info-icon"
                          aria-hidden="true"
                        >
                          ?
                        </span>
                      </summary>
                      <p>
                        {metrics
                          ? `${metrics.resumeCount} ${copy("active resumes")}. `
                          : ""}
                        {copy(
                          "Internal ATS heuristic; not an external ATS endorsement.",
                        )}{" "}
                        {copy(
                          "Calculated from saved CVs, independently of your snippets. A full score does not guarantee job suitability.",
                        )}
                      </p>
                    </details>
                  </div>
                  <span className="font-headline-lg text-headline-lg text-on-tertiary-container">
                    {metricsError
                      ? copy("Analysis unavailable")
                      : metrics?.atsAverage == null
                        ? copy("Not assessed")
                        : `${metrics.atsAverage}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="library-body w-full max-w-7xl mx-auto px-margin-desktop py-space-xl">
        <div className="flex flex-col gap-space-md">
          {!loading && !loadFailed && (
            <LibraryResumeBuilder snippets={snippets} />
          )}
          <section
            className="library-toolbar"
            aria-label={copy("Search and filter snippets")}
          >
            <div className="library-toolbar-row">
              <div className="library-search">
                <Icons.Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label={t("searchSnippets")}
                  placeholder={t("searchSnippets")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="library-primary"
                disabled={saving}
                aria-expanded={showAddBox}
                aria-controls="library-snippet-dialog"
                onClick={() => {
                  setEditingId(null);
                  setNewTitle("");
                  setNewContent("");
                  setNewCategory("General");
                  setNewTags("");
                  setTechnical("");
                  setConcise("");
                  setFormError("");
                  setShowAddBox(!showAddBox);
                }}
              >
                <Icons.Add size={18} />
                <span>{t("addSnippet")}</span>
              </button>
            </div>
            <div className="library-tag-filter">
              <button
                ref={tagFilterTriggerRef}
                type="button"
                className={`library-tag-filter-trigger ${popoverStyles.tagTrigger}`}
                aria-expanded={tagFilterOpen}
                aria-haspopup="dialog"
                aria-controls="library-tag-filter-popover"
                popoverTarget="library-tag-filter-popover"
                onClick={(event) => {
                  event.preventDefault();
                  setTagFilterOpen((open) => !open);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setTagFilterOpen(true);
                  }
                }}
              >
                <span>
                  {copy("Tag")}:{" "}
                  {activeTag === "all" ? t("allTags") : activeTag}
                </span>
                <span className="library-tag-filter-count">
                  {loaded ? activeTagCount : "-"}
                </span>
                <Icons.Unfold size={16} aria-hidden="true" />
              </button>
              <div
                ref={tagFilterPopupRef}
                popover="auto"
                id="library-tag-filter-popover"
                className={`${popoverStyles.popup} ${popoverStyles.tagPopup}`}
                role="dialog"
                aria-label={copy("Filter by tag")}
                onKeyDown={(event) => {
                  const inSearch = event.target === tagSearchRef.current;
                  if (
                    !["ArrowDown", "ArrowUp", "Home", "End"].includes(
                      event.key,
                    ) ||
                    (inSearch && (event.key === "Home" || event.key === "End"))
                  )
                    return;
                  event.preventDefault();
                  const items = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ),
                  );
                  const current = items.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? items.length - 1
                        : current < 0
                          ? event.key === "ArrowUp"
                            ? items.length - 1
                            : 0
                          : (current +
                              (event.key === "ArrowDown" ? 1 : -1) +
                              items.length) %
                            items.length;
                  items[next]?.focus();
                }}
              >
                <label className="library-tag-filter-search-label">
                  <span>{copy("Search tags")}</span>
                  <input
                    ref={tagSearchRef}
                    className="library-tag-filter-search"
                    type="search"
                    value={tagSearch}
                    onChange={(event) => setTagSearch(event.target.value)}
                  />
                </label>
                <div className="library-tag-filter-options">
                  <button
                    type="button"
                    className="library-tag-filter-option"
                    aria-pressed={activeTag === "all"}
                    onClick={() => {
                      setActiveTag("all");
                      setTagFilterOpen(false);
                      tagFilterTriggerRef.current?.focus();
                    }}
                  >
                    <span>{t("allTags")}</span>
                    <span>{loaded ? snippets.length : "-"}</span>
                  </button>
                  {visibleTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="library-tag-filter-option"
                      aria-pressed={activeTag === tag}
                      onClick={() => {
                        setActiveTag(tag);
                        setTagFilterOpen(false);
                        tagFilterTriggerRef.current?.focus();
                      }}
                    >
                      <span>{tag}</span>
                      <span>
                        {
                          snippets.filter((item) => item.tags.includes(tag))
                            .length
                        }
                      </span>
                    </button>
                  ))}
                  {visibleTags.length === 0 && (
                    <p className="library-tag-filter-empty">
                      {copy("No tags match your search.")}
                    </p>
                  )}
                </div>
                {activeTag !== "all" && (
                  <button
                    type="button"
                    className="library-tag-filter-reset"
                    onClick={() => {
                      setActiveTag("all");
                      setTagFilterOpen(false);
                      tagFilterTriggerRef.current?.focus();
                    }}
                  >
                    {copy("Reset to all tags")}
                  </button>
                )}
              </div>
            </div>
          </section>
          {showAddBox && (
            <dialog
              ref={snippetDialog}
              id="library-snippet-dialog"
              className="library-dialog"
              aria-labelledby="library-form-title"
              onCancel={(event) => {
                event.preventDefault();
                if (!saving) setShowAddBox(false);
              }}
              onClick={(event) => {
                if (event.target !== event.currentTarget || saving) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                )
                  setShowAddBox(false);
              }}
            >
              <form
                id="library-snippet-form"
                className="library-snippet-form"
                onSubmit={handleCreateSnippet}
                aria-labelledby="library-form-title"
                aria-busy={saving}
              >
                <div className="library-form-heading">
                  <div>
                    <h2 id="library-form-title">
                      {editingId ? copy("Edit snippet") : t("newSnippetTitle")}
                    </h2>
                    <p>
                      {copy(
                        "Keep verified achievements here, then reuse them in your resumes.",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="library-icon-button"
                    aria-label={copy("Close")}
                    disabled={saving}
                    onClick={() => setShowAddBox(false)}
                  >
                    <Icons.Close size={18} />
                  </button>
                </div>
                <fieldset disabled={saving} className="library-form-grid">
                  <label className="library-field">
                    {copy("Snippet title")}
                    <input
                      placeholder={copy("e.g. Reduced API response time")}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </label>
                  <label className="library-field">
                    {copy("Category")}
                    <input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder={copy("e.g. Backend development")}
                    />
                  </label>
                  <label className="library-field library-field-wide">
                    {copy("Achievement")}
                    <textarea
                      required
                      rows={4}
                      placeholder={copy(
                        "Describe what you did, how you did it, and the measurable result.",
                      )}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                  </label>
                  <div className="library-variants-heading library-field-wide">
                    <h3>{copy("Alternative wording")}</h3>
                    <p>
                      {copy(
                        "Optional versions of the same achievement. Add only details you can verify.",
                      )}
                    </p>
                  </div>
                  <label className="library-field">
                    {copy("Technical variant (optional)")}
                    <textarea
                      rows={3}
                      placeholder={copy(
                        "Emphasize the tools, methods, and technical impact.",
                      )}
                      value={technical}
                      onChange={(e) => setTechnical(e.target.value)}
                    />
                  </label>
                  <label className="library-field">
                    {copy("Concise variant (optional)")}
                    <textarea
                      rows={3}
                      placeholder={copy(
                        "Summarize the achievement in one short sentence.",
                      )}
                      value={concise}
                      onChange={(e) => setConcise(e.target.value)}
                    />
                  </label>
                  <label className="library-field library-field-wide">
                    {copy("Tags")}
                    <input
                      aria-describedby="library-tags-hint"
                      placeholder="Python, PostgreSQL, Docker"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                    />
                  </label>
                  <p
                    id="library-tags-hint"
                    className="library-field-wide library-hint"
                  >
                    {copy(
                      "Separate tags with commas. Use them to find this achievement later.",
                    )}
                  </p>
                </fieldset>
                {formError && (
                  <p role="alert" className="library-form-error">
                    {formError}
                  </p>
                )}
                <div className="library-form-actions">
                  <button
                    type="button"
                    className="library-secondary"
                    disabled={saving}
                    onClick={() => setShowAddBox(false)}
                  >
                    {copy("Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="library-primary"
                    disabled={saving}
                  >
                    <Icons.Check size={16} />
                    {saving ? copy("Working…") : t("saveSnippet")}
                  </button>
                </div>
              </form>
            </dialog>
          )}

          {/* Snippets List */}
          {loading ? (
            <div className="p-space-xl text-center text-secondary">
              {copy("Loading snippets…")}
            </div>
          ) : loadFailed ? (
            <div
              role="alert"
              className="p-space-xl text-center text-secondary bg-surface-container-lowest rounded border border-surface-container-highest"
            >
              <p>{loadError}</p>
              <button
                type="button"
                className="library-secondary"
                onClick={() => void loadSnippets()}
              >
                {copy("Try again")}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-space-xl text-center text-secondary bg-surface-container-lowest rounded border border-surface-container-highest">
              {snippets.length === 0
                ? copy(
                    "Your library is empty. Add achievements, projects or skills from your CV to reuse them.",
                  )
                : t("noSnippetsFound")}
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm">
              {filtered.map((snip) => (
                <div key={snip.id} className="library-snippet-card">
                  <div className="library-card-header">
                    <div className="library-card-title">
                      <Icons.Quote size={16} className="text-secondary" />
                      <span className="font-headline-md text-on-surface font-semibold">
                        {snip.title || copy("Career Achievement")}
                      </span>
                      <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary text-[10px] uppercase font-bold">
                        {snip.category}
                      </span>
                    </div>

                    <div className="library-card-actions">
                      <button
                        type="button"
                        className="library-secondary"
                        disabled={saving}
                        onClick={() => {
                          setFormError("");
                          setEditingId(snip.id);
                          setNewTitle(snip.title);
                          setNewContent(snip.content);
                          setNewTags(snip.tags.join(", "));
                          setNewCategory(snip.category);
                          setTechnical(
                            snip.variants.find((v) => v.type === "technical")
                              ?.text || "",
                          );
                          setConcise(
                            snip.variants.find((v) => v.type === "concise")
                              ?.text || "",
                          );
                          setShowAddBox(true);
                        }}
                      >
                        {copy("Edit snippet")}
                      </button>
                      <button
                        aria-label={copy("Delete snippet")}
                        disabled={saving}
                        type="button"
                        onClick={() => handleDeleteSnippet(snip.id)}
                        className="library-icon-button library-delete"
                      >
                        <Icons.Delete size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="library-card-content">{snip.content}</p>

                  {/* Variants display */}
                  {snip.variants && snip.variants.length > 0 && (
                    <div className="library-card-variants">
                      <span className="font-label-sm text-[11px] text-secondary font-medium">
                        {copy("Alternative wording")}
                      </span>
                      {snip.variants.map((v) => (
                        <div key={v.id} className="library-card-variant">
                          <span className="font-semibold uppercase text-[10px] text-on-surface-variant w-16 shrink-0">
                            {copy(v.type)}:
                          </span>
                          <span className="text-on-surface">{v.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="library-card-tags">
                    {snip.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-surface-container text-secondary"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
