"use client";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { AnonymousExport } from "@/components/AnonymousExport";
import { DownloadMenu } from "@/components/DownloadMenu";
import { EditorCommands } from "@/components/EditorCommands";
import { useDraftHistory } from "@/lib/draft-history";
import { sectionOrder, moveItem } from "@/lib/section-order";
import { ReorderControls } from "@/components/ReorderControls";
import { ResumeDesignPanel } from "@/components/ResumeDesignPanel";
import { SlidingIndicator } from "@/components/SlidingIndicator";
import { MotionList } from "@/components/MotionList";
import { notify } from "@/components/Notifications";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { A4ResumePreview } from "@/components/A4ResumePreview";
import { Icons } from "@/components/Icons";
import { ResumeReviewPanel } from "@/components/ResumeReviewPanel";
import {
  BulletListEditor,
  EditorField,
  EditorListField,
} from "@/components/BulletListEditor";
import { DateFields } from "@/components/DateFields";
import { StructuredSectionEditor } from "@/components/StructuredSectionEditor";
import { ResumeChanges } from "@/components/ResumeChanges";
import { useUnsavedNavigation } from "@/lib/unsaved-navigation";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { ResumeConflict } from "@/components/ResumeConflict";
import { useResumeRecovery } from "@/lib/resume-recovery";
import { useCopy } from "@/lib/copy";
import { DocumentTools } from "@/components/DocumentTools";
import { SourceEditor } from "@/components/SourceEditor";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeAnalysisReport,
  ResumeDocument,
  SkillGroup,
} from "@/lib/types";
export default function ResumeStudioPage() {
  const routeParams = useParams();
  const resumeId = (routeParams?.id as string) || "";
  const { t } = useI18n();
  const copy = useCopy();
  const [mobileView, setMobileView] = useState("edit");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const {
    document: doc,
    setDocument: setDoc,
    undo,
    redo,
    canUndo,
    canRedo,
    removed,
  } = useDraftHistory();
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    before: string;
    after: string;
    experienceId?: string;
    bulletIndex?: number;
  } | null>(null);
  const [sourcePending, setSourcePending] = useState(false);
  const [recovery, setRecovery] = useState<ResumeDocument | null>(null);
  const [searchTarget, setSearchTarget] = useState<{
    section: string;
    entry?: string;
    text?: string;
  } | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      toolsRef.current
        ?.querySelectorAll<HTMLDetailsElement>(":scope > details[open]")
        .forEach((details) => {
          if (!details.contains(event.target as Node)) details.open = false;
        });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      toolsRef.current
        ?.querySelectorAll<HTMLDetailsElement>(":scope > details[open]")
        .forEach((details) => {
          details.open = false;
          details.querySelector("summary")?.focus();
        });
    };
    window.document.addEventListener("pointerdown", dismiss);
    window.document.addEventListener("keydown", escape);
    return () => {
      window.document.removeEventListener("pointerdown", dismiss);
      window.document.removeEventListener("keydown", escape);
    };
  }, []);
  const saveInFlight = useRef(false);
  const documentSnapshot = useMemo(
    () => (doc ? JSON.stringify(doc) : ""),
    [doc],
  );
  const dirty = !!doc && documentSnapshot !== savedSnapshot;
  const recoveryState = useResumeRecovery(
    doc,
    dirty,
    resumeId,
    !!savedSnapshot,
    setNotice,
  );
  useEffect(() => {
    if (recoveryState.recovery) setRecovery(recoveryState.recovery);
  }, [recoveryState.recovery]);
  useUnsavedNavigation(
    dirty || sourcePending,
    copy("Leave with unsaved changes? Drafts are recoverable on this device."),
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "content" | "source" | "design" | "review"
  >("content");
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))) ||
        sourcePending ||
        saving ||
        activeTab === "source" ||
        window.document.querySelector(".command-dialog[open]") ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      )
        return;
      const redoKey =
        event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey);
      if (event.key.toLowerCase() !== "z" && !redoKey) return;
      if (redoKey ? canRedo : canUndo) {
        event.preventDefault();
        redoKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [sourcePending, saving, activeTab, canUndo, canRedo, undo, redo]);
  const [activeSection, setActiveSection] = useState<string>("profile");
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (
      section &&
      ["summary", "experience", "projects", "skills"].includes(section)
    )
      setActiveSection(section);
  }, [resumeId]);
  useEffect(() => {
    const entry = new URLSearchParams(window.location.search).get("entry");
    if (entry)
      window.document
        .getElementById(`entry-${entry}`)
        ?.scrollIntoView({ block: "center" });
  }, [activeSection, doc]);
  useEffect(() => {
    if (!searchTarget || activeSection !== searchTarget.section) return;
    const target =
      (searchTarget.entry
        ? window.document.getElementById(`entry-${searchTarget.entry}`)
        : null) || window.document.querySelector(".studio-inspector");
    const inputs = Array.from(
      target?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ) || [],
    );
    const match =
      inputs.find(
        (input) => searchTarget.text && input.value.includes(searchTarget.text),
      ) || inputs[0];
    match?.scrollIntoView({ block: "nearest" });
    match?.focus();
    setSearchTarget(null);
  }, [searchTarget, activeSection, activeTab, inspectorOpen]);
  const [analysisReport, setAnalysisReport] =
    useState<ResumeAnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  // Load resume document
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await api.getResume(resumeId);
        if (cancelled) return;
        setDoc(data);
        setActiveTab(data.metadata.targetJob ? "review" : "content");
        setSavedSnapshot(JSON.stringify(data));
      } catch (err: unknown) {
        if (!cancelled) setNotice(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId, setDoc]);
  useEffect(() => {
    if (activeTab !== "review" || !doc || doc.metadata.id !== resumeId) {
      setAnalyzing(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const report = await api.getAnalysis(resumeId, doc, controller.signal);
        if (!cancelled) setAnalysisReport(report);
      } catch (error) {
        if (!cancelled) {
          setAnalysisReport(null);
          setNotice(errorMessage(error));
        }
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, resumeId, doc]);
  // Save changes to backend
  async function handleSave(newDoc = doc) {
    if (!newDoc || saveInFlight.current || sourcePending) return;
    saveInFlight.current = true;
    try {
      setSaving(true);
      const updated = await api.updateResume(
        resumeId,
        newDoc.metadata.revision,
        newDoc,
      );
      setSavedSnapshot(JSON.stringify(updated));
      setDoc((current) =>
        current === newDoc
          ? updated
          : current
            ? {
                ...current,
                metadata: {
                  ...current.metadata,
                  revision: updated.metadata.revision,
                  updatedAt: updated.metadata.updatedAt,
                },
              }
            : updated,
      );
      setNotice("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        setNotice(
          "Conflict: your draft is preserved. Export JSON before reloading to compare with the newer server revision.",
        );
      } else {
        setNotice(`Save failed: ${errorMessage(err)}`);
      }
    } finally {
      setSaving(false);
      saveInFlight.current = false;
    }
  }
  // Update nested document fields
  function updateField<T extends keyof ResumeDocument>(
    section: T,
    value: ResumeDocument[T],
  ) {
    if (!doc) return;
    setDoc({
      ...doc,
      [section]: value,
    });
  }
  function updateProfileField<K extends keyof ResumeDocument["profile"]>(
    field: K,
    val: ResumeDocument["profile"][K],
  ) {
    if (!doc) return;
    setDoc({
      ...doc,
      profile: {
        ...doc.profile,
        [field]: val,
      },
    });
  }
  // Experience handlers
  function addExperience() {
    if (!doc) return;
    const newExp: ExperienceItem = {
      id: crypto.randomUUID(),
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      bullets: [""],
      technologies: [],
    };
    updateField("experience", [newExp, ...doc.experience]);
  }
  function updateExperienceItem(index: number, updated: ExperienceItem) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[index] = updated;
    updateField("experience", items);
  }
  function removeExperienceItem(index: number) {
    if (!doc) return;
    const items = doc.experience.filter((_, i) => i !== index);
    updateField("experience", items);
  }
  function updateBullet(expIndex: number, bulletIndex: number, text: string) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[expIndex].bullets[bulletIndex] = text;
    updateField("experience", items);
  }
  // Education handlers
  function addEducation() {
    if (!doc) return;
    const newEdu: EducationItem = {
      id: crypto.randomUUID(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      grade: "",
      highlights: [],
    };
    updateField("education", [newEdu, ...doc.education]);
  }
  function updateEducationItem(index: number, updated: EducationItem) {
    if (!doc) return;
    const items = [...doc.education];
    items[index] = updated;
    updateField("education", items);
  }
  function removeEducationItem(index: number) {
    if (!doc) return;
    const items = doc.education.filter((_, i) => i !== index);
    updateField("education", items);
  }
  // Project handlers
  function addProject() {
    if (!doc) return;
    const newProj: ProjectItem = {
      id: crypto.randomUUID(),
      name: "",
      role: "",
      url: "",
      startDate: "",
      endDate: "",
      bullets: [""],
      technologies: [],
    };
    updateField("projects", [newProj, ...doc.projects]);
  }
  function updateProjectItem(index: number, updated: ProjectItem) {
    if (!doc) return;
    const items = [...doc.projects];
    items[index] = updated;
    updateField("projects", items);
  }
  function removeProjectItem(index: number) {
    if (!doc) return;
    const items = doc.projects.filter((_, i) => i !== index);
    updateField("projects", items);
  }
  // AI improve summary
  async function handleAiImproveSummary() {
    if (!doc) return;
    try {
      setAiLoading(true);
      const res = await api.improveSummary(doc.summary, doc.profile.headline);
      setSuggestion({ before: doc.summary, after: res.suggestion });
    } catch (err: unknown) {
      notify(`AI suggestion error: ${errorMessage(err)}`);
    } finally {
      setAiLoading(false);
    }
  }
  // AI improve bullet
  async function handleAiRewriteBullet(
    expIndex: number,
    bulletIndex: number,
    tone = "technical",
  ) {
    if (!doc) return;
    const bullet = doc.experience[expIndex].bullets[bulletIndex];
    try {
      setAiLoading(true);
      const res = await api.rewriteBullet(bullet, tone);
      setSuggestion({
        before: bullet,
        after: res.suggestion,
        experienceId: doc.experience[expIndex].id,
        bulletIndex,
      });
    } catch (err: unknown) {
      notify(`AI error: ${errorMessage(err)}`);
    } finally {
      setAiLoading(false);
    }
  }
  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-secondary">
        {notice || t("loadingStudio")}
      </div>
    );
  }
  return (
    <div className="editorial-studio">
      {showAnonymous && (
        <AnonymousExport
          document={doc}
          onClose={() => setShowAnonymous(false)}
        />
      )}
      {suggestion && (
        <SuggestionDialog
          before={suggestion.before}
          after={suggestion.after}
          current={
            suggestion.experienceId
              ? doc.experience.find(
                  (entry) => entry.id === suggestion.experienceId,
                )?.bullets[suggestion.bulletIndex ?? 0]
              : doc.summary
          }
          onClose={() => setSuggestion(null)}
          onApply={() => {
            if (suggestion.experienceId) {
              const index = doc.experience.findIndex(
                (entry) => entry.id === suggestion.experienceId,
              );
              if (
                index >= 0 &&
                doc.experience[index].bullets[suggestion.bulletIndex ?? 0] ===
                  suggestion.before
              )
                updateBullet(
                  index,
                  suggestion.bulletIndex ?? 0,
                  suggestion.after,
                );
            } else if (doc.summary === suggestion.before)
              updateField("summary", suggestion.after);
            setSuggestion(null);
          }}
        />
      )}
      {conflict && (
        <ResumeConflict
          draft={doc}
          onResolved={(value) => {
            setDoc(value);
            setSavedSnapshot(JSON.stringify(value));
            setConflict(false);
            setNotice("");
          }}
        />
      )}
      <div className="studio-ribbon no-print">
        <div className="studio-document-title">
          <span className="editorial-eyebrow">
            {copy("DOCUMENT STUDIO")} / {copy("Revision")}{" "}
            {doc.metadata.revision}
          </span>
          <input
            type="text"
            aria-label="Resume title"
            value={doc.metadata.title}
            onChange={(e) =>
              setDoc({
                ...doc,
                metadata: { ...doc.metadata, title: e.target.value },
              })
            }
          />
        </div>
        <div className="studio-actions">
          <button
            className="editorial-button"
            aria-label={copy(
              inspectorOpen ? "Focus on document" : "Show tools",
            )}
            aria-pressed={!inspectorOpen}
            disabled={sourcePending}
            onClick={() => {
              setInspectorOpen((open) => !open);
              setMobileView(inspectorOpen ? "preview" : "edit");
            }}
          >
            <Icons.Eye size={16} />
            <span>
              {copy(inspectorOpen ? "Focus on document" : "Show tools")}
            </span>
          </button>
          <button
            className="editorial-button"
            onClick={() => handleSave()}
            disabled={saving || sourcePending}
          >
            <span className="save-icon" data-saving={saving}>
              <Icons.Save size={16} />
            </span>
            {saving ? t("saving") : t("saveDraft")}
          </button>
          <DownloadMenu
            onAnonymous={() => setShowAnonymous(true)}
            disabled={sourcePending}
            download={(format) => api.downloadDocument(doc, format)}
            onError={setNotice}
          />
        </div>
      </div>
      <div role="status" className="studio-status no-print">
        <span
          key={saving ? "saving" : dirty ? "dirty" : "saved"}
          className="save-state"
          data-saving={saving}
        >
          <span className="save-state-dot" aria-hidden="true" />
          {saving ? t("saving") : copy(dirty ? "Unsaved draft" : "Saved")}
        </span>
        {(sourcePending || notice) && (
          <>
            {" "}
            ·{" "}
            {sourcePending
              ? copy("Apply source changes before switching tabs or saving.")
              : notice}
          </>
        )}
        {recovery && (
          <span>
            {" "}
            Recovered draft available.{" "}
            <button
              onClick={() => {
                setDoc(recovery);
                setRecovery(null);
                recoveryState.dismiss();
                setNotice(
                  "Recovered draft loaded. If another revision exists, saving will report a conflict.",
                );
              }}
            >
              Recover
            </button>{" "}
            <button
              onClick={() => {
                setRecovery(null);
                recoveryState.dismiss();
              }}
            >
              Discard recovered draft
            </button>
          </span>
        )}
      </div>
      {removed && canUndo && (
        <div role="status" className="deletion-feedback">
          {copy("Item removed.")}{" "}
          <button
            type="button"
            disabled={sourcePending || saving}
            onClick={undo}
          >
            {copy("Undo")}
          </button>
        </div>
      )}
      <div className="studio-aux-tools no-print" ref={toolsRef}>
        <EditorCommands
          document={doc}
          disabled={sourcePending || saving}
          onSelect={(section, entry, text) => {
            setActiveSection(section);
            setActiveTab("content");
            setInspectorOpen(true);
            setMobileView("edit");
            setSearchTarget({ section, entry, text });
          }}
          commands={[
            {
              label: "Add Experience",
              run: () => {
                setActiveSection("experience");
                setActiveTab("content");
                setInspectorOpen(true);
                setMobileView("edit");
                addExperience();
              },
            },
            {
              label: "Add Education",
              run: () => {
                setActiveSection("education");
                setActiveTab("content");
                setInspectorOpen(true);
                setMobileView("edit");
                addEducation();
              },
            },
            {
              label: "Add Project",
              run: () => {
                setActiveSection("projects");
                setActiveTab("content");
                setInspectorOpen(true);
                setMobileView("edit");
                addProject();
              },
            },
            {
              label: "Save Draft",
              run: () => {
                void handleSave();
              },
            },
            {
              label: "Download PDF",
              run: () => {
                api.downloadPdf(doc).catch((error) => setNotice(error.message));
              },
            },
            {
              label: "Page length assistant",
              run: () => {
                setActiveTab("design");
                setInspectorOpen(true);
                setMobileView("edit");
              },
            },
          ]}
        />
        <button
          className="studio-undo"
          disabled={sourcePending || saving || !canUndo}
          onClick={undo}
          aria-label={copy("Undo last draft edit")}
          title={copy("Undo last draft edit")}
        >
          <Icons.Undo size={14} />
          {copy("Undo")}
        </button>
        <button
          className="studio-undo"
          disabled={sourcePending || saving || !canRedo}
          onClick={redo}
          aria-label={copy("Redo last draft edit")}
          title={copy("Redo last draft edit")}
        >
          <Icons.Redo size={14} />
          {copy("Redo")}
        </button>
        <DocumentTools
          document={doc}
          disabled={sourcePending || saving}
          onChange={setDoc}
          onRestored={(updated) => {
            setDoc(updated);
            setSavedSnapshot(JSON.stringify(updated));
          }}
        />
        <ResumeChanges document={doc} disabled={sourcePending || saving} />
      </div>
      <div className="mobile-studio-switch workspace-tools p-2">
        <button
          aria-pressed={mobileView === "edit"}
          onClick={() => {
            setMobileView("edit");
            setInspectorOpen(true);
          }}
        >
          {copy("Edit content")}
        </button>
        <button
          aria-pressed={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
        >
          {copy("Preview")}
        </button>
      </div>
      {/* Main Studio Body */}
      <div
        data-mobile-view={mobileView}
        data-inspector-open={inspectorOpen}
        className="studio-body flex flex-1 w-full overflow-hidden"
      >
        <A4ResumePreview
          document={doc}
          activeSection={
            activeTab === "content" && inspectorOpen ? activeSection : undefined
          }
          disabled={sourcePending}
          onSelectSection={(section) => {
            if (sourcePending) return;
            setActiveTab("content");
            setActiveSection(section);
            setInspectorOpen(true);
            setMobileView("edit");
          }}
        />
        <section
          className="studio-inspector no-print"
          aria-label={copy("Document tools")}
          hidden={!inspectorOpen}
          inert={!inspectorOpen}
          aria-hidden={!inspectorOpen}
        >
          <header className="inspector-heading">
            <span className="editorial-eyebrow">{copy("Editing panel")}</span>
            <button
              aria-label={copy("Close tools")}
              disabled={sourcePending}
              onClick={() => {
                setInspectorOpen(false);
                setMobileView("preview");
              }}
            >
              <Icons.Close size={18} />
            </button>
          </header>
          <nav className="inspector-modes" aria-label={copy("Editing tools")}>
            <SlidingIndicator active={activeTab} variant="tab" />
            {(
              [
                ["content", t("contentTab"), Icons.Document],
                ["design", t("designTab"), Icons.Templates],
                ["review", t("reviewTab"), Icons.Sparkles],
                ["source", t("sourceTab"), Icons.Code],
              ] as const
            ).map(([tab, label, Icon]) => (
              <button
                key={tab}
                disabled={sourcePending && tab !== activeTab}
                aria-pressed={activeTab === tab}
                onClick={() => !sourcePending && setActiveTab(tab)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {/* 1. CONTENT VISUAL EDITOR MODE */}
          {activeTab === "content" && (
            <>
              {/* Outline Column */}
              <aside className="studio-outline w-[200px] bg-surface-container-lowest flex flex-col justify-between p-space-sm shrink-0 select-none overflow-y-auto border-r border-surface-container-high no-print">
                <div className="outline-selection-track flex flex-col gap-0.5">
                  <SlidingIndicator active={activeSection} variant="section" />
                  <div className="px-space-md py-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    {t("sections")}
                  </div>
                  {[
                    {
                      id: "profile",
                      label: t("personalProfile"),
                      icon: Icons.User,
                    },
                    {
                      id: "summary",
                      label: t("summary"),
                      icon: Icons.Document,
                    },
                    {
                      id: "experience",
                      label: t("experience"),
                      icon: Icons.Jobs,
                      count: doc.experience.length,
                    },
                    {
                      id: "education",
                      label: t("education"),
                      icon: Icons.Graduation,
                      count: doc.education.length,
                    },
                    {
                      id: "projects",
                      label: t("projects"),
                      icon: Icons.Terminal,
                      count: doc.projects.length,
                    },
                    {
                      id: "skills",
                      label: t("skills"),
                      icon: Icons.Zap,
                      count: doc.skills.length,
                    },
                    {
                      id: "certifications",
                      label: copy("Certifications"),
                      icon: Icons.Document,
                      count: doc.certifications.length,
                    },
                    {
                      id: "languages",
                      label: copy("Languages"),
                      icon: Icons.Language,
                      count: doc.languages.length,
                    },
                    {
                      id: "customSections",
                      label: copy("Custom sections"),
                      icon: Icons.Document,
                      count: doc.customSections.length,
                    },
                  ]
                    .sort((a, b) => {
                      const order = ["profile", ...sectionOrder(doc)];
                      return order.indexOf(a.id) - order.indexOf(b.id);
                    })
                    .map((s) => {
                      const IconComp = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-label={`${s.label}${s.count === undefined ? "" : ` ${s.count}`}`}
                          title={
                            s.count === 0 ? copy("Nothing added yet") : s.label
                          }
                          data-empty={s.count === 0}
                          aria-pressed={activeSection === s.id}
                          onClick={() => setActiveSection(s.id)}
                          className={`flex items-center justify-between px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors text-left ${
                            activeSection === s.id
                              ? "bg-surface-container text-on-surface font-semibold"
                              : "text-secondary hover:bg-surface-container hover:text-on-surface"
                          }`}
                        >
                          <div className="flex items-center gap-space-sm min-w-0">
                            <IconComp size={16} />
                            <span className="truncate">{s.label}</span>
                          </div>
                          {s.count !== undefined && (
                            <span className="font-label-sm px-1.5 py-0.2 rounded bg-surface-container-high text-secondary">
                              {s.count === 0 ? copy("Add") : s.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </aside>
              {/* Focused Form Stage (~490px) */}
              <div
                key={activeSection}
                className="studio-form motion-content w-[500px] bg-surface-container-lowest overflow-y-auto px-space-xl py-space-lg flex flex-col gap-space-xl shrink-0 shadow-sm border-r border-surface-container-high no-print select-text"
              >
                {(
                  ["certifications", "languages", "customSections"] as const
                ).map(
                  (section) =>
                    activeSection === section && (
                      <StructuredSectionEditor
                        key={section}
                        section={section}
                        document={doc}
                        onChange={setDoc}
                      />
                    ),
                )}
                {/* Profile Section */}
                {activeSection === "profile" && (
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                        {t("personalProfile")}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-secondary-container text-on-secondary-container">
                        {t("core")}
                      </span>
                    </div>
                    <ProfilePhoto
                      value={doc.profile.photo}
                      visible={doc.visibility.showPhoto}
                      onChange={(photo) => updateProfileField("photo", photo)}
                      onVisibilityChange={(showPhoto) =>
                        setDoc({
                          ...doc,
                          visibility: { ...doc.visibility, showPhoto },
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-space-md">
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("firstName")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("firstName")}
                          value={doc.profile.firstName}
                          onChange={(e) =>
                            updateProfileField("firstName", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("lastName")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("lastName")}
                          value={doc.profile.lastName}
                          onChange={(e) =>
                            updateProfileField("lastName", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("professionalTitle")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("professionalTitle")}
                          value={doc.profile.headline}
                          onChange={(e) =>
                            updateProfileField("headline", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                          placeholder="e.g. Senior Software Architect"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("email")}
                        </label>
                        <input
                          type="email"
                          aria-label={t("email")}
                          value={doc.profile.email}
                          onChange={(e) =>
                            updateProfileField("email", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("phone")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("phone")}
                          value={doc.profile.phone}
                          onChange={(e) =>
                            updateProfileField("phone", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("location")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("location")}
                          value={doc.profile.location}
                          onChange={(e) =>
                            updateProfileField("location", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("website")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("website")}
                          value={doc.profile.website}
                          onChange={(e) =>
                            updateProfileField("website", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-secondary font-medium">
                          {t("linkedin")}
                        </label>
                        <input
                          type="text"
                          aria-label={t("linkedin")}
                          value={doc.profile.linkedin}
                          onChange={(e) =>
                            updateProfileField("linkedin", e.target.value)
                          }
                          className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Summary Section */}
                {activeSection === "summary" && (
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                        {t("summary")}
                      </span>
                      <button
                        type="button"
                        onClick={handleAiImproveSummary}
                        disabled={aiLoading}
                        className="flex items-center gap-1 text-primary font-label-sm px-2 py-1 rounded bg-secondary-container hover:bg-surface-container-high transition-colors"
                      >
                        <Icons.Sparkles size={14} />
                        <span>{t("improveWithAi")}</span>
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      aria-label={t("summary")}
                      value={doc.summary}
                      onChange={(e) => updateField("summary", e.target.value)}
                      className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface text-body-md leading-relaxed resize-none focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      placeholder={t("summaryPlaceholder")}
                    />
                  </div>
                )}

                {/* Experience Section */}
                {activeSection === "experience" && (
                  <MotionList
                    className="editor-section"
                    motionKey={doc.experience.map((item) => item.id).join(",")}
                  >
                    <div className="editor-section-heading">
                      <h2 className="font-headline-md">{t("experience")}</h2>
                      <button
                        type="button"
                        className="editor-action"
                        onClick={addExperience}
                      >
                        <Icons.Add size={15} />
                        {t("addRole")}
                      </button>
                    </div>
                    {doc.experience.map((exp, expIdx) => (
                      <div
                        id={`entry-${exp.id}`}
                        key={exp.id}
                        data-motion-id={exp.id}
                        className="editor-entry"
                      >
                        <div className="editor-entry-heading">
                          <EditorField
                            label={t("jobTitle")}
                            value={exp.position}
                            onChange={(position) =>
                              updateExperienceItem(expIdx, { ...exp, position })
                            }
                          />
                          <button
                            type="button"
                            className="editor-icon-button danger"
                            aria-label={`${copy("Remove experience")} ${expIdx + 1}`}
                            title={copy("Remove experience")}
                            onClick={() => removeExperienceItem(expIdx)}
                          >
                            <Icons.Delete size={17} />
                          </button>
                        </div>
                        <div className="editor-field-grid">
                          <EditorField
                            label={t("company")}
                            value={exp.company}
                            onChange={(company) =>
                              updateExperienceItem(expIdx, { ...exp, company })
                            }
                          />
                          <EditorField
                            label={t("location")}
                            value={exp.location}
                            onChange={(location) =>
                              updateExperienceItem(expIdx, { ...exp, location })
                            }
                          />
                        </div>
                        <DateFields
                          value={exp}
                          onChange={(dates) =>
                            updateExperienceItem(expIdx, { ...exp, ...dates })
                          }
                        />
                        <EditorField
                          multiline
                          label={copy("Role summary")}
                          value={exp.summary}
                          onChange={(summary) =>
                            updateExperienceItem(expIdx, { ...exp, summary })
                          }
                        />
                        <BulletListEditor
                          label={t("achievements")}
                          values={exp.bullets}
                          onChange={(bullets) =>
                            updateExperienceItem(expIdx, { ...exp, bullets })
                          }
                          onPolish={(index) =>
                            handleAiRewriteBullet(expIdx, index, "technical")
                          }
                          polishing={aiLoading}
                        />
                        <EditorListField
                          label={copy("Technologies (comma-separated)")}
                          values={exp.technologies}
                          onChange={(technologies) =>
                            updateExperienceItem(expIdx, {
                              ...exp,
                              technologies,
                            })
                          }
                        />

                        <ReorderControls
                          group="experience"
                          index={expIdx}
                          count={doc.experience.length}
                          label={
                            exp.position || exp.company || String(expIdx + 1)
                          }
                          onMove={(from, to) =>
                            updateField(
                              "experience",
                              moveItem(doc.experience, from, to),
                            )
                          }
                        />
                      </div>
                    ))}
                    {!doc.experience.length && (
                      <p className="editor-empty-hint">
                        {copy("Add an entry to start this section.")}
                      </p>
                    )}
                  </MotionList>
                )}
                {/* Education Section */}
                {activeSection === "education" && (
                  <MotionList
                    className="editor-section"
                    motionKey={doc.education.map((item) => item.id).join(",")}
                  >
                    <div className="editor-section-heading">
                      <h2 className="font-headline-md">{t("education")}</h2>
                      <button
                        type="button"
                        className="editor-action"
                        onClick={addEducation}
                      >
                        <Icons.Add size={15} />
                        {t("addEducation")}
                      </button>
                    </div>
                    {doc.education.map((edu, eduIdx) => (
                      <div
                        id={`entry-${edu.id}`}
                        key={edu.id}
                        data-motion-id={edu.id}
                        className="editor-entry"
                      >
                        <div className="editor-entry-heading">
                          <EditorField
                            label={t("institution")}
                            value={edu.institution}
                            onChange={(institution) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                institution,
                              })
                            }
                          />
                          <button
                            type="button"
                            className="editor-icon-button danger"
                            aria-label={`${copy("Remove education")} ${eduIdx + 1}`}
                            title={copy("Remove education")}
                            onClick={() => removeEducationItem(eduIdx)}
                          >
                            <Icons.Delete size={17} />
                          </button>
                        </div>
                        <div className="editor-field-grid">
                          <EditorField
                            label={t("degree")}
                            value={edu.degree}
                            onChange={(degree) =>
                              updateEducationItem(eduIdx, { ...edu, degree })
                            }
                          />
                          <EditorField
                            label={t("fieldOfStudy")}
                            value={edu.fieldOfStudy}
                            onChange={(fieldOfStudy) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                fieldOfStudy,
                              })
                            }
                          />
                          <EditorField
                            label={t("location")}
                            value={edu.location}
                            onChange={(location) =>
                              updateEducationItem(eduIdx, { ...edu, location })
                            }
                          />
                          <EditorField
                            label={copy("Grade")}
                            value={edu.grade}
                            onChange={(grade) =>
                              updateEducationItem(eduIdx, { ...edu, grade })
                            }
                          />
                        </div>
                        <DateFields
                          value={edu}
                          onChange={(dates) =>
                            updateEducationItem(eduIdx, { ...edu, ...dates })
                          }
                        />
                        <BulletListEditor
                          label={copy("Education highlights")}
                          addLabel={copy("Add highlight")}
                          values={edu.highlights}
                          onChange={(highlights) =>
                            updateEducationItem(eduIdx, { ...edu, highlights })
                          }
                        />

                        <ReorderControls
                          group="education"
                          index={eduIdx}
                          count={doc.education.length}
                          label={edu.institution || String(eduIdx + 1)}
                          onMove={(from, to) =>
                            updateField(
                              "education",
                              moveItem(doc.education, from, to),
                            )
                          }
                        />
                      </div>
                    ))}
                    {!doc.education.length && (
                      <p className="editor-empty-hint">
                        {copy("Add an entry to start this section.")}
                      </p>
                    )}
                  </MotionList>
                )}
                {/* Projects Section */}
                {activeSection === "projects" && (
                  <MotionList
                    className="editor-section"
                    motionKey={doc.projects.map((item) => item.id).join(",")}
                  >
                    <div className="editor-section-heading">
                      <h2 className="font-headline-md">{t("projects")}</h2>
                      <button
                        type="button"
                        className="editor-action"
                        onClick={addProject}
                      >
                        <Icons.Add size={15} />
                        {t("addProject")}
                      </button>
                    </div>
                    {doc.projects.map((proj, projIdx) => (
                      <div
                        id={`entry-${proj.id}`}
                        key={proj.id}
                        data-motion-id={proj.id}
                        className="editor-entry"
                      >
                        <div className="editor-entry-heading">
                          <EditorField
                            label={t("projectName")}
                            value={proj.name}
                            onChange={(name) =>
                              updateProjectItem(projIdx, { ...proj, name })
                            }
                          />
                          <button
                            type="button"
                            className="editor-icon-button danger"
                            aria-label={`${copy("Remove project")} ${projIdx + 1}`}
                            title={copy("Remove project")}
                            onClick={() => removeProjectItem(projIdx)}
                          >
                            <Icons.Delete size={17} />
                          </button>
                        </div>
                        <div className="editor-field-grid">
                          <EditorField
                            label={t("projectRole")}
                            value={proj.role}
                            onChange={(role) =>
                              updateProjectItem(projIdx, { ...proj, role })
                            }
                          />
                          <EditorField
                            label={t("projectUrl")}
                            value={proj.url}
                            onChange={(url) =>
                              updateProjectItem(projIdx, { ...proj, url })
                            }
                          />
                        </div>
                        <DateFields
                          allowPresent={false}
                          value={{
                            startDate: proj.startDate,
                            endDate: proj.endDate,
                            current: false,
                          }}
                          onChange={({ startDate, endDate }) =>
                            updateProjectItem(projIdx, {
                              ...proj,
                              startDate,
                              endDate,
                            })
                          }
                        />
                        <BulletListEditor
                          label={copy("Project achievements")}
                          values={proj.bullets}
                          onChange={(bullets) =>
                            updateProjectItem(projIdx, { ...proj, bullets })
                          }
                        />
                        <EditorListField
                          label={copy("Technologies (comma-separated)")}
                          values={proj.technologies}
                          onChange={(technologies) =>
                            updateProjectItem(projIdx, {
                              ...proj,
                              technologies,
                            })
                          }
                        />

                        <ReorderControls
                          group="projects"
                          index={projIdx}
                          count={doc.projects.length}
                          label={proj.name || String(projIdx + 1)}
                          onMove={(from, to) =>
                            updateField(
                              "projects",
                              moveItem(doc.projects, from, to),
                            )
                          }
                        />
                      </div>
                    ))}
                    {!doc.projects.length && (
                      <p className="editor-empty-hint">
                        {copy("Add an entry to start this section.")}
                      </p>
                    )}
                  </MotionList>
                )}
                {/* Skills Section */}
                {activeSection === "skills" && (
                  <MotionList
                    className="flex flex-col gap-space-md"
                    motionKey={doc.skills.map((item) => item.id).join(",")}
                  >
                    <div className="editor-section-heading">
                      <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                        {t("skills")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newGroup: SkillGroup = {
                            id: crypto.randomUUID(),
                            category: "",
                            skills: [],
                          };
                          updateField("skills", [...doc.skills, newGroup]);
                        }}
                        className="editor-action"
                      >
                        <Icons.Add size={15} />
                        <span>{t("addCategory")}</span>
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {doc.skills.map((grp, idx) => (
                        <div
                          id={`entry-${grp.id}`}
                          key={grp.id}
                          data-motion-id={grp.id}
                          className="editor-entry skill-entry"
                        >
                          <div className="editor-entry-heading">
                            <input
                              type="text"
                              aria-label={copy("Skill category")}
                              value={grp.category}
                              onChange={(e) => {
                                const newSkills = structuredClone(doc.skills);
                                newSkills[idx].category = e.target.value;
                                updateField("skills", newSkills);
                              }}
                              className="font-headline-md bg-transparent font-semibold outline-none"
                            />
                            <button
                              type="button"
                              className="editor-icon-button danger"
                              aria-label={
                                copy("Remove skill group") + " " + (idx + 1)
                              }
                              onClick={() =>
                                updateField(
                                  "skills",
                                  doc.skills.filter(
                                    (_, index) => index !== idx,
                                  ),
                                )
                              }
                            >
                              <Icons.Delete size={17} />
                            </button>
                          </div>
                          <EditorListField
                            label={copy("Skills (comma-separated)")}
                            values={grp.skills}
                            onChange={(skills) => {
                              const newSkills = structuredClone(doc.skills);
                              newSkills[idx].skills = skills;
                              updateField("skills", newSkills);
                            }}
                          />

                          <ReorderControls
                            group="skills"
                            index={idx}
                            count={doc.skills.length}
                            label={grp.category || String(idx + 1)}
                            onMove={(from, to) =>
                              updateField(
                                "skills",
                                moveItem(doc.skills, from, to),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </MotionList>
                )}
              </div>
              {/* Live A4 Preview */}
            </>
          )}
          {/* 2. SOURCE CODE EDITOR MODE */}
          {activeTab === "source" && (
            <div className="inspector-mode flex flex-1 w-full overflow-hidden">
              <SourceEditor
                document={doc}
                onPendingChange={setSourcePending}
                onDocumentUpdated={(updated) => setDoc(updated)}
              />
            </div>
          )}
          {/* 3. DESIGN SETTINGS MODE */}
          {activeTab === "design" && (
            <ResumeDesignPanel
              doc={doc}
              setDoc={setDoc}
              onSave={() => handleSave()}
            />
          )}
          {/* 4. REVIEW & ATS ANALYSIS MODE */}
          <div
            className="studio-review-session"
            hidden={activeTab !== "review"}
            key={doc.metadata.id}
          >
            <ResumeReviewPanel
              doc={doc}
              setDoc={setDoc}
              disabled={sourcePending || saving}
              analyzing={analyzing}
              analysisReport={analysisReport}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
