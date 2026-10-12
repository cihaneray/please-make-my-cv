"use client";
import styles from "./studio.module.css";
import { ResumeContentEditor } from "./ResumeContentEditor";
import { useResumeContent } from "./useResumeContent";
import { ResumeShareCheck } from "@/components/ResumeShareCheck";
import { AnonymousExport } from "@/components/AnonymousExport";
import { DownloadMenu } from "@/components/DownloadMenu";
import { EditorCommands } from "@/components/EditorCommands";
import { useDraftHistory } from "@/lib/draft-history";
import { ResumeDesignPanel } from "@/components/ResumeDesignPanel";
import { SlidingIndicator } from "@/components/SlidingIndicator";
import { notify } from "@/components/Notifications";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { A4ResumePreview } from "@/components/A4ResumePreview";
import { Icons } from "@/components/Icons";
import { readAIField } from "@/lib/ai-edits";
import { ResumeReviewPanel } from "@/components/ResumeReviewPanel";
import { ResumeFamily } from "@/components/ResumeFamily";
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
import { ResumeAnalysisReport, ResumeDocument } from "@/lib/types";
export default function ResumeStudioPage() {
  const routeParams = useParams();
  const resumeId = (routeParams?.id as string) || "";
  const { t, language } = useI18n();
  const copy = useCopy();
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(
    new Set(),
  );
  function toggleEntry(id: string) {
    setCollapsedEntries((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function expandEntry(id?: string) {
    if (!id) return;
    setCollapsedEntries((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }
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
  const openedDeepLink = useRef("");
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (
      section &&
      [
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
        "certifications",
      ].includes(section)
    )
      setActiveSection(section);
  }, [resumeId]);
  useEffect(() => {
    const entry = new URLSearchParams(window.location.search).get("entry");
    const key = `${resumeId}:${activeSection}:${entry}`;
    const target = entry && window.document.getElementById(`entry-${entry}`);
    if (entry && target && openedDeepLink.current !== key) {
      openedDeepLink.current = key;
      expandEntry(entry);
      target.scrollIntoView({ block: "center" });
    }
  }, [activeSection, doc, resumeId]);
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
  const contentActions = useResumeContent(doc, setDoc);
  const { updateField, updateBullet, addExperience, addEducation, addProject } =
    contentActions;
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
      <div className={`studio-ribbon no-print ${styles.ribbon}`}>
        <div className={`studio-document-title ${styles.title}`}>
          <span className="editorial-eyebrow">
            {copy("RESUME EDITOR")} / {copy("Revision")} {doc.metadata.revision}
          </span>
          <input
            type="text"
            aria-label={copy("Resume title")}
            value={doc.metadata.title}
            onChange={(e) =>
              setDoc({
                ...doc,
                metadata: { ...doc.metadata, title: e.target.value },
              })
            }
          />
        </div>
        <div className={`studio-actions ${styles.actions}`}>
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
      <div role="status" className={`studio-status no-print ${styles.status}`}>
        <span
          key={saving ? "saving" : dirty ? "dirty" : "saved"}
          className="save-state"
          data-saving={saving}
        >
          <span className="save-state-dot" aria-hidden="true" />
          {saving ? t("saving") : copy(dirty ? "Unsaved draft" : "Saved")}
        </span>
        {(sourcePending || notice) && (
          <span className={styles.notice}>
            {sourcePending
              ? copy("Apply source changes before switching tabs or saving.")
              : notice}
          </span>
        )}
        {recovery && (
          <div className={styles.recovery}>
            <span>{copy("Recovered draft available.")}</span>
            <div className={styles.recoveryActions}>
              <button
                type="button"
                onClick={() => {
                  setDoc(recovery);
                  setRecovery(null);
                  recoveryState.dismiss();
                  setNotice(
                    copy(
                      "Recovered draft loaded. If another revision exists, saving will report a conflict.",
                    ),
                  );
                }}
              >
                {copy("Recover")}
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  setRecovery(null);
                  recoveryState.dismiss();
                }}
              >
                {copy("Discard recovered draft")}
              </button>
            </div>
          </div>
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
            expandEntry(entry);
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
        <ResumeFamily
          document={doc}
          disabled={sourcePending || saving}
          dirty={dirty}
        />
        <ResumeShareCheck
          document={doc}
          language={language}
          disabled={sourcePending || saving}
        />
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
            <ResumeContentEditor
              document={doc}
              onChange={setDoc}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              collapsedEntries={collapsedEntries}
              onToggleEntry={toggleEntry}
              onExpandEntry={expandEntry}
              actions={contentActions}
              aiLoading={aiLoading}
              onImproveSummary={handleAiImproveSummary}
              onRewriteBullet={handleAiRewriteBullet}
            />
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
              onNavigateAI={(edit) => {
                expandEntry(edit.target.entryId ?? undefined);
                setActiveTab("content");
                setActiveSection(edit.target.section);
                setInspectorOpen(true);
                setMobileView("edit");
                setSearchTarget({
                  section: edit.target.section,
                  entry: edit.target.entryId ?? undefined,
                  text: readAIField(doc, edit) ?? edit.before,
                });
              }}
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
