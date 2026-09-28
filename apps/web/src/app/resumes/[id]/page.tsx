"use client";
import { notify } from "@/components/Notifications";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { A4ResumePreview } from "@/components/A4ResumePreview";
import { Icons } from "@/components/Icons";
import { AIResumeReview } from "@/components/AIResumeReview";
import { DocumentTools } from "@/components/DocumentTools";
import { SourceEditor } from "@/components/SourceEditor";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  AnalysisIssue,
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
  const [doc, setDoc] = useState<ResumeDocument | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [notice, setNotice] = useState("");
  const [sourcePending, setSourcePending] = useState(false);
  const [recovery, setRecovery] = useState<ResumeDocument | null>(null);
  const saveInFlight = useRef(false);
  const previousDraft = useRef<ResumeDocument | null>(null);
  const [undoDrafts, setUndoDrafts] = useState<ResumeDocument[]>([]);
  useEffect(() => {
    if (
      doc &&
      previousDraft.current &&
      doc.metadata.id === previousDraft.current.metadata.id &&
      doc.metadata.revision === previousDraft.current.metadata.revision &&
      JSON.stringify(doc) !== JSON.stringify(previousDraft.current)
    ) {
      const previous = structuredClone(previousDraft.current);
      setUndoDrafts((values) => [...values.slice(-49), previous]);
    }
    previousDraft.current = doc ? structuredClone(doc) : null;
  }, [doc]);
  const dirty = !!doc && JSON.stringify(doc) !== savedSnapshot;
  useEffect(() => {
    if (!doc || doc.metadata.id !== resumeId || !savedSnapshot || recovery)
      return;
    try {
      if (dirty)
        localStorage.setItem(`cv-draft-${resumeId}`, JSON.stringify(doc));
      else localStorage.removeItem(`cv-draft-${resumeId}`);
    } catch {
      setNotice("Local draft recovery is unavailable. Save regularly.");
    }
  }, [doc, dirty, savedSnapshot, resumeId, recovery]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || sourcePending) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigation = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.target !== "_blank" &&
        (dirty || sourcePending) &&
        !confirm(
          "Leave with unsaved changes? Drafts are recoverable on this device.",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty, sourcePending]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "content" | "source" | "design" | "review"
  >("content");
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [analysisReport, setAnalysisReport] =
    useState<ResumeAnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  // Load resume document
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        console.log("START LOADING RESUME:", resumeId);
        setLoading(true);
        const data = await api.getResume(resumeId);
        if (cancelled) return;
        console.log("RESUME LOADED SUCCESSFULLY:", data?.metadata?.id);
        setDoc(data);
        setSavedSnapshot(JSON.stringify(data));
        try {
          const raw = localStorage.getItem(`cv-draft-${resumeId}`);
          if (raw && raw !== JSON.stringify(data)) setRecovery(JSON.parse(raw));
        } catch {
          setNotice("Could not read the recovered draft.");
        }
      } catch (err: any) {
        console.error("RESUME LOAD ERROR:", err);
        setNotice(`Failed to load resume: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);
  // Load ATS analysis when review tab is activated
  useEffect(() => {
    let cancelled = false;
    if (activeTab === "review" && resumeId) {
      async function fetchAnalysis() {
        try {
          setAnalyzing(true);
          const report = await api.getAnalysis(resumeId, doc || undefined);
          if (!cancelled) setAnalysisReport(report);
        } catch (err) {
          if (!cancelled) {
            setAnalysisReport(null);
            setNotice(
              "Could not analyze this draft. Retry by reopening Review.",
            );
          }
        } finally {
          if (!cancelled) setAnalyzing(false);
        }
      }
      fetchAnalysis();
    }
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
      setNotice("Saved.");
    } catch (err: any) {
      if (err.status === 409) {
        setNotice(
          "Conflict: your draft is preserved. Export JSON before reloading to compare with the newer server revision.",
        );
      } else {
        setNotice(`Save failed: ${err.message}`);
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
  function updateProfileField(
    field: keyof ResumeDocument["profile"],
    val: any,
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
      id: `exp-${Date.now()}`,
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
  function addBulletToExperience(expIndex: number) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[expIndex].bullets.push("");
    updateField("experience", items);
  }
  function updateBullet(expIndex: number, bulletIndex: number, text: string) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[expIndex].bullets[bulletIndex] = text;
    updateField("experience", items);
  }
  function removeBullet(expIndex: number, bulletIndex: number) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[expIndex].bullets.splice(bulletIndex, 1);
    updateField("experience", items);
  }
  // Education handlers
  function addEducation() {
    if (!doc) return;
    const newEdu: EducationItem = {
      id: `edu-${Date.now()}`,
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
      id: `proj-${Date.now()}`,
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
      if (confirm(`Apply AI Suggested Summary?\n\n"${res.suggestion}"`)) {
        updateField("summary", res.suggestion);
      }
    } catch (err: any) {
      notify(`AI suggestion error: ${err.message}`);
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
      if (
        confirm(`Apply AI Suggested Bullet (${tone})?\n\n"${res.suggestion}"`)
      ) {
        updateBullet(expIndex, bulletIndex, res.suggestion);
      }
    } catch (err: any) {
      notify(`AI error: ${err.message}`);
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
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-surface text-on-surface">
      {/* Document Meta & Action Ribbon */}
      <div className="studio-ribbon h-12 w-full bg-surface-container-lowest flex items-center justify-between px-space-lg shrink-0 z-20 shadow-sm border-b border-surface-container-high no-print">
        {/* Left: Subtabs & Inline Document Name */}
        <div className="flex items-center gap-space-xl">
          {/* Subtabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-container">
            <button
              type="button"
              onClick={() => !sourcePending && setActiveTab("content")}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all ${
                activeTab === "content"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("contentTab")}
            </button>
            <button
              type="button"
              onClick={() => !sourcePending && setActiveTab("source")}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all flex items-center gap-1 ${
                activeTab === "source"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <Icons.Code size={15} />
              <span>{t("sourceTab")}</span>
            </button>
            <button
              type="button"
              onClick={() => !sourcePending && setActiveTab("design")}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all ${
                activeTab === "design"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("designTab")}
            </button>
            <button
              type="button"
              onClick={() => !sourcePending && setActiveTab("review")}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all flex items-center gap-1 ${
                activeTab === "review"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span>{t("reviewTab")}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container" />
            </button>
          </div>
          {/* Title & Saved Status */}
          <div className="flex items-center gap-space-sm">
            <input
              type="text"
              aria-label="Resume title"
              value={doc.metadata.title}
              onChange={(e) => {
                setDoc({
                  ...doc,
                  metadata: { ...doc.metadata, title: e.target.value },
                });
              }}
              className="font-headline-md text-headline-md text-on-surface bg-transparent focus:bg-surface-container-low px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary w-64 tracking-tight"
            />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
              <span>rev {doc.metadata.revision}</span>
            </div>
          </div>
        </div>
        {/* Right: Actions */}
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || sourcePending}
            className="h-8 px-space-md flex items-center gap-1.5 rounded-lg bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high transition-all"
          >
            <Icons.Save size={15} />
            <span>{saving ? t("saving") : t("saveDraft")}</span>
          </button>
          <button
            disabled={sourcePending}
            onClick={() =>
              api.downloadPdf(doc).catch((err) => setNotice(err.message))
            }
            className="h-8 px-space-md flex items-center gap-1.5 rounded-lg bg-primary text-on-primary font-label-sm shadow hover:bg-primary-container transition-all"
          >
            <Icons.Download size={15} />
            <span>{t("exportPdf")}</span>
          </button>
        </div>
      </div>
      <div role="status" className="px-4 py-2 text-sm bg-white no-print">
        {dirty ? "Unsaved draft" : "Saved"} ·{" "}
        {sourcePending
          ? "Apply source changes before switching tabs or saving."
          : notice}
        {recovery && (
          <span>
            {" "}
            Recovered draft available.{" "}
            <button
              onClick={() => {
                setDoc(recovery);
                setRecovery(null);
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
                localStorage.removeItem(`cv-draft-${resumeId}`);
              }}
            >
              Discard recovered draft
            </button>
          </span>
        )}
      </div>
      <button
        className="no-print text-sm text-left px-4"
        disabled={sourcePending || saving || !undoDrafts.length}
        onClick={() => {
          const previous = undoDrafts.at(-1);
          setUndoDrafts((values) => values.slice(0, -1));
          if (previous) {
            previousDraft.current = previous;
            setDoc({
              ...previous,
              metadata: {
                ...previous.metadata,
                revision: doc.metadata.revision,
              },
            });
          }
        }}
      >
        Undo last draft edit
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
      {/* Main Studio Body */}
      <div className="studio-body flex flex-1 w-full overflow-hidden">
        {/* 1. CONTENT VISUAL EDITOR MODE */}
        {activeTab === "content" && (
          <>
            {/* Outline Column */}
            <aside className="w-[200px] bg-surface-container-lowest flex flex-col justify-between p-space-sm shrink-0 select-none overflow-y-auto border-r border-surface-container-high no-print">
              <div className="flex flex-col gap-0.5">
                <div className="px-space-md py-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  {t("sections")}
                </div>
                {[
                  {
                    id: "profile",
                    label: t("personalProfile"),
                    icon: Icons.User,
                  },
                  { id: "summary", label: t("summary"), icon: Icons.Document },
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
                ].map((s) => {
                  const IconComp = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
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
                          {s.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>
            {/* Focused Form Stage (~490px) */}
            <div className="w-[500px] bg-surface-container-lowest overflow-y-auto px-space-xl py-space-lg flex flex-col gap-space-xl shrink-0 shadow-sm border-r border-surface-container-high no-print select-text">
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
                  <div className="grid grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">
                        {t("firstName")}
                      </label>
                      <input
                        type="text"
                        aria-label="firstName"
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
                        aria-label="lastName"
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
                        aria-label="headline"
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
                        aria-label="email"
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
                        aria-label="phone"
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
                        aria-label="location"
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
                        aria-label="website"
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
                        aria-label="linkedin"
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
                    value={doc.summary}
                    onChange={(e) => updateField("summary", e.target.value)}
                    className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface text-body-md leading-relaxed resize-none focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                    placeholder={t("summaryPlaceholder")}
                  />
                </div>
              )}
              {/* Experience Section */}
              {activeSection === "experience" && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {t("experience")}
                    </span>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <Icons.Add size={15} />
                      <span>{t("addRole")}</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-space-md">
                    {doc.experience.map((exp, expIdx) => (
                      <div
                        key={exp.id}
                        className="flex flex-col rounded-xl bg-surface-container-low p-space-md gap-space-sm border border-surface-container-highest"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={exp.position}
                            onChange={(e) =>
                              updateExperienceItem(expIdx, {
                                ...exp,
                                position: e.target.value,
                              })
                            }
                            className="font-headline-md font-semibold bg-transparent border-0 outline-none text-on-surface w-full"
                            placeholder={t("jobTitle")}
                          />
                          <button
                            aria-label="Delete"
                            type="button"
                            onClick={() => removeExperienceItem(expIdx)}
                            className="text-secondary hover:text-error"
                          >
                            <Icons.Delete size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperienceItem(expIdx, {
                                ...exp,
                                company: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("company")}
                          />
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) =>
                              updateExperienceItem(expIdx, {
                                ...exp,
                                startDate: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("dates")}
                          />
                        </div>
                        {/* Bullet achievements */}
                        <div className="flex flex-col gap-2 pt-2">
                          <span className="font-label-sm text-secondary font-medium">
                            {t("achievements")}
                          </span>
                          {exp.bullets.map((b, bIdx) => (
                            <div
                              key={bIdx}
                              className="flex items-start gap-1 group"
                            >
                              <textarea
                                rows={2}
                                value={b}
                                onChange={(e) =>
                                  updateBullet(expIdx, bIdx, e.target.value)
                                }
                                className="flex-1 p-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  aria-label="Sparkles"
                                  type="button"
                                  onClick={() =>
                                    handleAiRewriteBullet(
                                      expIdx,
                                      bIdx,
                                      "technical",
                                    )
                                  }
                                  title={t("aiPolish")}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container text-primary"
                                >
                                  <Icons.Sparkles size={14} />
                                </button>
                                <button
                                  aria-label="Close"
                                  type="button"
                                  onClick={() => removeBullet(expIdx, bIdx)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-error-container text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Icons.Close size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addBulletToExperience(expIdx)}
                            className="self-start text-[11px] font-medium text-secondary hover:text-on-surface flex items-center gap-1 pt-1"
                          >
                            <Icons.Add size={14} />
                            <span>{t("addBullet")}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Education Section */}
              {activeSection === "education" && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {t("education")}
                    </span>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <Icons.Add size={15} />
                      <span>{t("addEducation")}</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-space-md">
                    {doc.education.map((edu, eduIdx) => (
                      <div
                        key={edu.id}
                        className="flex flex-col rounded-xl bg-surface-container-low p-space-md gap-space-sm border border-surface-container-highest"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                institution: e.target.value,
                              })
                            }
                            className="font-headline-md font-semibold bg-transparent border-0 outline-none text-on-surface w-full"
                            placeholder={t("institution")}
                          />
                          <button
                            aria-label="Delete"
                            type="button"
                            onClick={() => removeEducationItem(eduIdx)}
                            className="text-secondary hover:text-error"
                          >
                            <Icons.Delete size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                degree: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("degree")}
                          />
                          <input
                            type="text"
                            value={edu.fieldOfStudy}
                            onChange={(e) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                fieldOfStudy: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("fieldOfStudy")}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={edu.startDate}
                            onChange={(e) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                startDate: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("dates")}
                          />
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) =>
                              updateEducationItem(eduIdx, {
                                ...edu,
                                endDate: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder="End Date"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Projects Section */}
              {activeSection === "projects" && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {t("projects")}
                    </span>
                    <button
                      type="button"
                      onClick={addProject}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <Icons.Add size={15} />
                      <span>{t("addProject")}</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-space-md">
                    {doc.projects.map((proj, projIdx) => (
                      <div
                        key={proj.id}
                        className="flex flex-col rounded-xl bg-surface-container-low p-space-md gap-space-sm border border-surface-container-highest"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) =>
                              updateProjectItem(projIdx, {
                                ...proj,
                                name: e.target.value,
                              })
                            }
                            className="font-headline-md font-semibold bg-transparent border-0 outline-none text-on-surface w-full"
                            placeholder={t("projectName")}
                          />
                          <button
                            aria-label="Delete"
                            type="button"
                            onClick={() => removeProjectItem(projIdx)}
                            className="text-secondary hover:text-error"
                          >
                            <Icons.Delete size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={proj.role}
                            onChange={(e) =>
                              updateProjectItem(projIdx, {
                                ...proj,
                                role: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("projectRole")}
                          />
                          <input
                            type="text"
                            value={proj.url}
                            onChange={(e) =>
                              updateProjectItem(projIdx, {
                                ...proj,
                                url: e.target.value,
                              })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder={t("projectUrl")}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Skills Section */}
              {activeSection === "skills" && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {t("skills")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newGroup: SkillGroup = {
                          id: `skill-${Date.now()}`,
                          category: "New Category",
                          skills: ["Skill 1", "Skill 2"],
                        };
                        updateField("skills", [...doc.skills, newGroup]);
                      }}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <Icons.Add size={15} />
                      <span>{t("addCategory")}</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {doc.skills.map((grp, idx) => (
                      <div
                        key={grp.id}
                        className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2"
                      >
                        <input
                          type="text"
                          value={grp.category}
                          onChange={(e) => {
                            const newSkills = structuredClone(doc.skills);
                            newSkills[idx].category = e.target.value;
                            updateField("skills", newSkills);
                          }}
                          className="font-headline-md bg-transparent font-semibold outline-none"
                        />
                        <input
                          type="text"
                          value={grp.skills.join(", ")}
                          onChange={(e) => {
                            const newSkills = structuredClone(doc.skills);
                            newSkills[idx].skills = e.target.value
                              .split(",")
                              .map((s) => s.trim());
                            updateField("skills", newSkills);
                          }}
                          className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm outline-none"
                          placeholder={t("skillsListPlaceholder")}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Live A4 Preview */}
            <A4ResumePreview document={doc} />
          </>
        )}
        {/* 2. SOURCE CODE EDITOR MODE */}
        {activeTab === "source" && (
          <div className="flex flex-1 w-full overflow-hidden">
            <SourceEditor
              document={doc}
              onPendingChange={setSourcePending}
              onDocumentUpdated={(updated) => setDoc(updated)}
            />
            <A4ResumePreview document={doc} />
          </div>
        )}
        {/* 3. DESIGN SETTINGS MODE */}
        {activeTab === "design" && (
          <div className="flex flex-1 w-full overflow-hidden">
            <div className="w-[420px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {t("designAndTypography")}
              </span>
              {/* Localization & Target Market (Decoupled Variables) */}
              <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-surface-container-low border border-surface-container-highest">
                <span className="font-headline-sm font-semibold text-on-surface flex items-center gap-1.5">
                  <Icons.Language size={16} />
                  <span>{t("localizationTitle")}</span>
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container p-2 rounded border border-surface-container-high">
                  {t("marketNotice")}
                </p>
                {/* CV Content Language */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-secondary">
                    {t("cvLanguageLabel")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: "en", label: "English" },
                      { code: "tr", label: "Türkçe" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setDoc({
                            ...doc,
                            metadata: {
                              ...doc.metadata,
                              language: lang.code,
                            },
                          });
                        }}
                        className={`p-2 rounded border text-label-md transition-all ${
                          (doc.metadata.language || "en") === lang.code
                            ? "border-primary bg-primary text-on-primary font-semibold"
                            : "border-surface-container-highest bg-surface-container text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Target Market */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-secondary">
                    {t("targetMarketLabel")}
                  </label>
                  <select
                    value={doc.metadata.targetMarket || "TR"}
                    onChange={(e) => {
                      setDoc({
                        ...doc,
                        metadata: {
                          ...doc.metadata,
                          targetMarket: e.target.value as any,
                        },
                      });
                    }}
                    className="h-9 px-3 rounded-lg bg-surface-container-lowest text-body-md border border-surface-container-highest outline-none focus:border-primary"
                  >
                    <option value="TR">{t("marketTR")}</option>
                    <option value="US">{t("marketUS")}</option>
                    <option value="UK">{t("marketUK")}</option>
                    <option value="EU">{t("marketEU")}</option>
                    <option value="GLOBAL">{t("marketGlobal")}</option>
                    <option value="OTHER">{t("marketOther")}</option>
                  </select>
                </div>
              </div>
              {/* Template */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">
                  {t("visualTemplate")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["minimal", "technical", "professional"] as const).map(
                    (tCode) => (
                      <button
                        key={tCode}
                        type="button"
                        onClick={() => {
                          updateField("design", {
                            ...doc.design,
                            template: tCode,
                          });
                        }}
                        className={`p-2.5 rounded-lg border text-label-md capitalize transition-all ${
                          doc.design.template === tCode
                            ? "border-primary bg-primary text-on-primary font-semibold"
                            : "border-surface-container-highest bg-surface-container-low text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {tCode}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {/* Accent Color */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">
                  {t("accentColor")}
                </label>
                <div className="flex items-center gap-3">
                  {[
                    "#0F172A",
                    "#16A34A",
                    "#2563EB",
                    "#7C3AED",
                    "#DC2626",
                    "#B45309",
                  ].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() =>
                        updateField("design", {
                          ...doc.design,
                          accentColor: col,
                        })
                      }
                      className={`w-7 h-7 rounded-full transition-transform ${
                        doc.design.accentColor === col
                          ? "scale-125 ring-2 ring-primary ring-offset-2"
                          : ""
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
              {/* Font Family */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">
                  {t("fontFamily")}
                </label>
                <select
                  value={doc.design.fontFamily}
                  onChange={(e) =>
                    updateField("design", {
                      ...doc.design,
                      fontFamily: e.target.value,
                    })
                  }
                  className="h-9 px-3 rounded-lg bg-surface-container-low text-body-md border border-surface-container-highest"
                >
                  <option value="Inter">Inter (Swiss Clean)</option>
                  <option value="Helvetica Neue">
                    Helvetica Neue (Modernist)
                  </option>
                  <option value="Georgia">Georgia (Editorial Serif)</option>
                  <option value="Menlo">Menlo (Monospace / Tech)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleSave()}
                className="mt-4 h-9 rounded bg-primary text-on-primary font-label-md hover:bg-inverse-surface transition-colors"
              >
                {t("saveDesign")}
              </button>
            </div>
            <A4ResumePreview document={doc} />
          </div>
        )}
        {/* 4. REVIEW & ATS ANALYSIS MODE */}
        {activeTab === "review" && (
          <div className="flex flex-1 w-full overflow-hidden">
            <div className="w-[450px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {t("atsReview")}
              </span>
              <AIResumeReview document={doc} />
              {analyzing ? (
                <div className="text-secondary text-sm">
                  {t("evaluatingRules")}
                </div>
              ) : analysisReport ? (
                <div className="flex flex-col gap-space-lg">
                  {/* Score Pill Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                      <span className="text-[11px] text-secondary uppercase font-semibold">
                        {t("atsCompatibility")}
                      </span>
                      <span className="text-[22px] font-bold text-on-tertiary-container">
                        {analysisReport.atsCompatibilityScore}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                      <span className="text-[11px] text-secondary uppercase font-semibold">
                        {t("contentQuality")}
                      </span>
                      <span className="text-[22px] font-bold text-primary">
                        {analysisReport.contentQualityScore}%
                      </span>
                    </div>
                  </div>
                  {/* Transparent ATS Heuristic Score Breakdown */}
                  {analysisReport.atsBreakdown && (
                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface-container-low border border-surface-container-highest">
                      <span className="font-label-sm text-secondary uppercase tracking-wider font-semibold">
                        {t("scoreBreakdownTitle")}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownStructure")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.structure} / 20
                          </span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownReadability")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.readability} / 20
                          </span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownContact")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.contact} / 15
                          </span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownConsistency")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.consistency} / 15
                          </span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownJobRelevance")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.job_relevance == null
                              ? "Not assessed"
                              : `${analysisReport.atsBreakdown.job_relevance} / 20`}
                          </span>
                        </div>
                        <div className="flex justify-between p-1.5 rounded bg-surface-container-lowest">
                          <span className="text-secondary">
                            {t("breakdownParseability")}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {analysisReport.atsBreakdown.parseability} / 10
                          </span>
                        </div>
                      </div>
                      {analysisReport.heuristicNotice && (
                        <p className="text-[11px] text-secondary italic pt-1">
                          {analysisReport.heuristicNotice}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Strengths */}
                  {analysisReport.strengths.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="font-label-sm text-secondary uppercase tracking-wider">
                        {t("strengths")}
                      </span>
                      {analysisReport.strengths.map((str, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-[12px] text-on-surface"
                        >
                          <Icons.CheckCircle
                            size={15}
                            className="text-on-tertiary-container"
                          />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Issues */}
                  <div className="flex flex-col gap-2">
                    <span className="font-label-sm text-secondary uppercase tracking-wider">
                      {t("suggestionsAndIssues")} (
                      {analysisReport.issues.length})
                    </span>
                    {analysisReport.issues.map(
                      (issue: AnalysisIssue, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-[12px] flex flex-col gap-1 border ${
                            issue.severity === "critical"
                              ? "bg-error-container border-error/20 text-on-error-container"
                              : issue.severity === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-900"
                                : "bg-surface-container-low border-surface-container-highest text-on-surface"
                          }`}
                        >
                          <div className="font-semibold flex items-center justify-between">
                            <span>{issue.message}</span>
                            <span className="text-[10px] uppercase font-bold">
                              {issue.severity}
                            </span>
                          </div>
                          {issue.suggestion && (
                            <div className="text-[11px] opacity-80 pt-0.5">
                              Tip: {issue.suggestion}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <A4ResumePreview document={doc} />
          </div>
        )}
      </div>
    </div>
  );
}
