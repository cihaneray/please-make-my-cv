'use client';

import React, { use, useEffect, useState } from 'react';
import { A4ResumePreview } from '@/components/A4ResumePreview';
import { SourceEditor } from '@/components/SourceEditor';
import { api } from '@/lib/api';
import {
  AnalysisIssue,
  ExperienceItem,
  ResumeAnalysisReport,
  ResumeDocument,
  SkillGroup,
} from '@/lib/types';

export default function ResumeStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);

  const [doc, setDoc] = useState<ResumeDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'content' | 'source' | 'design' | 'review'>('content');
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [analysisReport, setAnalysisReport] = useState<ResumeAnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Load resume document
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getResume(resumeId);
        setDoc(data);
      } catch (err: any) {
        alert(`Failed to load resume: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resumeId]);

  // Load ATS analysis when review tab is activated
  useEffect(() => {
    if (activeTab === 'review' && resumeId) {
      async function fetchAnalysis() {
        try {
          setAnalyzing(true);
          const report = await api.getAnalysis(resumeId);
          setAnalysisReport(report);
        } catch (err) {
          console.error('Could not fetch analysis:', err);
        } finally {
          setAnalyzing(false);
        }
      }
      fetchAnalysis();
    }
  }, [activeTab, resumeId]);

  // Save changes to backend
  async function handleSave(newDoc = doc) {
    if (!newDoc) return;
    try {
      setSaving(true);
      const updated = await api.updateResume(resumeId, newDoc.metadata.revision, newDoc);
      setDoc(updated);
    } catch (err: any) {
      if (err.status === 409) {
        alert('Conflict detected! This resume was modified elsewhere. Please refresh to load latest version.');
      } else {
        alert(`Save failed: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  // Update nested document fields
  function updateField<T extends keyof ResumeDocument>(section: T, value: ResumeDocument[T]) {
    if (!doc) return;
    setDoc({
      ...doc,
      [section]: value,
    });
  }

  function updateProfileField(field: keyof ResumeDocument['profile'], val: any) {
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
      company: 'New Company',
      position: 'Role Title',
      location: '',
      startDate: '2024',
      endDate: 'Present',
      current: true,
      summary: '',
      bullets: ['Describe your major project and achievement.'],
      technologies: [],
    };
    updateField('experience', [newExp, ...doc.experience]);
  }

  function updateExperienceItem(index: number, updated: ExperienceItem) {
    if (!doc) return;
    const items = [...doc.experience];
    items[index] = updated;
    updateField('experience', items);
  }

  function removeExperienceItem(index: number) {
    if (!doc) return;
    const items = doc.experience.filter((_, i) => i !== index);
    updateField('experience', items);
  }

  function addBulletToExperience(expIndex: number) {
    if (!doc) return;
    const items = [...doc.experience];
    items[expIndex].bullets.push('Architected and delivered new high-impact capability.');
    updateField('experience', items);
  }

  function updateBullet(expIndex: number, bulletIndex: number, text: string) {
    if (!doc) return;
    const items = [...doc.experience];
    items[expIndex].bullets[bulletIndex] = text;
    updateField('experience', items);
  }

  function removeBullet(expIndex: number, bulletIndex: number) {
    if (!doc) return;
    const items = [...doc.experience];
    items[expIndex].bullets.splice(bulletIndex, 1);
    updateField('experience', items);
  }

  // AI improve summary
  async function handleAiImproveSummary() {
    if (!doc) return;
    try {
      setAiLoading(true);
      const res = await api.improveSummary(doc.summary, doc.profile.headline);
      if (confirm(`Apply AI Suggested Summary?\n\n"${res.suggestion}"`)) {
        updateField('summary', res.suggestion);
      }
    } catch (err: any) {
      alert(`AI suggestion error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  // AI improve bullet
  async function handleAiRewriteBullet(expIndex: number, bulletIndex: number, tone = 'technical') {
    if (!doc) return;
    const bullet = doc.experience[expIndex].bullets[bulletIndex];
    try {
      setAiLoading(true);
      const res = await api.rewriteBullet(bullet, tone);
      if (confirm(`Apply AI Suggested Bullet (${tone})?\n\n"${res.suggestion}"`)) {
        updateBullet(expIndex, bulletIndex, res.suggestion);
      }
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-secondary">
        Loading CV Workspace Studio...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-surface text-on-surface">
      {/* Document Meta & Action Ribbon */}
      <div className="h-12 w-full bg-surface-container-lowest flex items-center justify-between px-space-lg shrink-0 z-20 shadow-sm border-b border-surface-container-high no-print">
        {/* Left: Subtabs & Inline Document Name */}
        <div className="flex items-center gap-space-xl">
          {/* Subtabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-container">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all ${
                activeTab === 'content'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('source')}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all flex items-center gap-1 ${
                activeTab === 'source'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">code</span>
              <span>Source</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all ${
                activeTab === 'design'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Design
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`px-space-md py-1 rounded font-label-md text-label-md transition-all flex items-center gap-1 ${
                activeTab === 'review'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span>Review</span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container" />
            </button>
          </div>

          {/* Title & Saved Status */}
          <div className="flex items-center gap-space-sm">
            <input
              type="text"
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
            disabled={saving}
            className="h-8 px-space-md flex items-center gap-1.5 rounded-lg bg-surface-container text-on-surface font-label-sm hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">save</span>
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <a
            href={api.getExportUrl(doc.metadata.id, 'pdf', true)}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-space-md flex items-center gap-1.5 rounded-lg bg-primary text-on-primary font-label-sm shadow hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span>Export PDF</span>
          </a>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* 1. CONTENT VISUAL EDITOR MODE */}
        {activeTab === 'content' && (
          <>
            {/* Outline Column */}
            <aside className="w-[200px] bg-surface-container-lowest flex flex-col justify-between p-space-sm shrink-0 select-none overflow-y-auto border-r border-surface-container-high no-print">
              <div className="flex flex-col gap-0.5">
                <div className="px-space-md py-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  Sections
                </div>
                {[
                  { id: 'profile', label: 'Profile', icon: 'account_circle' },
                  { id: 'summary', label: 'Summary', icon: 'short_text' },
                  { id: 'experience', label: 'Experience', icon: 'work_outline', count: doc.experience.length },
                  { id: 'education', label: 'Education', icon: 'school', count: doc.education.length },
                  { id: 'projects', label: 'Projects', icon: 'terminal', count: doc.projects.length },
                  { id: 'skills', label: 'Skills', icon: 'bolt', count: doc.skills.length },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center justify-between px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors text-left ${
                      activeSection === s.id
                        ? 'bg-surface-container text-on-surface font-semibold'
                        : 'text-secondary hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                      <span className="truncate">{s.label}</span>
                    </div>
                    {s.count !== undefined && (
                      <span className="font-label-sm px-1.5 py-0.2 rounded bg-surface-container-high text-secondary">
                        {s.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </aside>

            {/* Focused Form Stage (~490px) */}
            <div className="w-[500px] bg-surface-container-lowest overflow-y-auto px-space-xl py-space-lg flex flex-col gap-space-xl shrink-0 shadow-sm border-r border-surface-container-high no-print select-text">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Personal Profile
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-secondary-container text-on-secondary-container">
                      Core
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">First Name</label>
                      <input
                        type="text"
                        value={doc.profile.firstName}
                        onChange={(e) => updateProfileField('firstName', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Last Name</label>
                      <input
                        type="text"
                        value={doc.profile.lastName}
                        onChange={(e) => updateProfileField('lastName', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Professional Title</label>
                      <input
                        type="text"
                        value={doc.profile.headline}
                        onChange={(e) => updateProfileField('headline', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. Senior Software Architect"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Email Address</label>
                      <input
                        type="email"
                        value={doc.profile.email}
                        onChange={(e) => updateProfileField('email', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Phone</label>
                      <input
                        type="text"
                        value={doc.profile.phone}
                        onChange={(e) => updateProfileField('phone', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Location</label>
                      <input
                        type="text"
                        value={doc.profile.location}
                        onChange={(e) => updateProfileField('location', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">Website</label>
                      <input
                        type="text"
                        value={doc.profile.website}
                        onChange={(e) => updateProfileField('website', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-secondary font-medium">LinkedIn</label>
                      <input
                        type="text"
                        value={doc.profile.linkedin}
                        onChange={(e) => updateProfileField('linkedin', e.target.value)}
                        className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {activeSection === 'summary' && (
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Professional Summary
                    </span>
                    <button
                      type="button"
                      onClick={handleAiImproveSummary}
                      disabled={aiLoading}
                      className="flex items-center gap-1 text-primary font-label-sm px-2 py-1 rounded bg-secondary-container hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>Improve</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={doc.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface text-body-md leading-relaxed resize-none focus:bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Write a clear, impactful overview of your career and accomplishments..."
                  />
                </div>
              )}

              {/* Experience Section */}
              {activeSection === 'experience' && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Experience
                    </span>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Add Role</span>
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
                              updateExperienceItem(expIdx, { ...exp, position: e.target.value })
                            }
                            className="font-headline-md font-semibold bg-transparent border-0 outline-none text-on-surface w-full"
                            placeholder="Job Title"
                          />
                          <button
                            type="button"
                            onClick={() => removeExperienceItem(expIdx)}
                            className="text-secondary hover:text-error"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperienceItem(expIdx, { ...exp, company: e.target.value })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder="Company"
                          />
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) =>
                              updateExperienceItem(expIdx, { ...exp, startDate: e.target.value })
                            }
                            className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none"
                            placeholder="e.g. 2022 — Present"
                          />
                        </div>

                        {/* Bullet achievements */}
                        <div className="flex flex-col gap-2 pt-2">
                          <span className="font-label-sm text-secondary font-medium">Achievements:</span>
                          {exp.bullets.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1 group">
                              <textarea
                                rows={2}
                                value={b}
                                onChange={(e) => updateBullet(expIdx, bIdx, e.target.value)}
                                className="flex-1 p-2 rounded bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAiRewriteBullet(expIdx, bIdx, 'technical')}
                                  title="AI Polish Bullet"
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container text-primary"
                                >
                                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBullet(expIdx, bIdx)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-error-container text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addBulletToExperience(expIdx)}
                            className="self-start text-[11px] font-medium text-secondary hover:text-on-surface flex items-center gap-1 pt-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Add Bullet</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Section */}
              {activeSection === 'skills' && (
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Skill Groups
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newGroup: SkillGroup = {
                          id: `skill-${Date.now()}`,
                          category: 'New Category',
                          skills: ['Skill 1', 'Skill 2'],
                        };
                        updateField('skills', [...doc.skills, newGroup]);
                      }}
                      className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Add Category</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {doc.skills.map((grp, idx) => (
                      <div key={grp.id} className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
                        <input
                          type="text"
                          value={grp.category}
                          onChange={(e) => {
                            const newSkills = [...doc.skills];
                            newSkills[idx].category = e.target.value;
                            updateField('skills', newSkills);
                          }}
                          className="font-headline-md bg-transparent font-semibold outline-none"
                        />
                        <input
                          type="text"
                          value={grp.skills.join(', ')}
                          onChange={(e) => {
                            const newSkills = [...doc.skills];
                            newSkills[idx].skills = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                            updateField('skills', newSkills);
                          }}
                          className="h-8 px-2 rounded bg-surface-container-lowest text-body-sm outline-none"
                          placeholder="Comma-separated skills (e.g. Python, Docker, React)"
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
        {activeTab === 'source' && (
          <div className="flex flex-1 w-full overflow-hidden">
            <SourceEditor
              resumeId={doc.metadata.id}
              revision={doc.metadata.revision}
              onDocumentUpdated={(updated) => setDoc(updated)}
            />
            <A4ResumePreview document={doc} />
          </div>
        )}

        {/* 3. DESIGN SETTINGS MODE */}
        {activeTab === 'design' && (
          <div className="flex flex-1 w-full overflow-hidden">
            <div className="w-[420px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                Design & Typography
              </span>

              {/* Template */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">Visual Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['minimal', 'technical', 'professional'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        updateField('design', { ...doc.design, template: t });
                      }}
                      className={`p-2.5 rounded-lg border text-label-md capitalize transition-all ${
                        doc.design.template === t
                          ? 'border-primary bg-primary text-on-primary font-semibold'
                          : 'border-surface-container-highest bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">Accent Color</label>
                <div className="flex items-center gap-3">
                  {['#0F172A', '#16A34A', '#2563EB', '#7C3AED', '#DC2626', '#B45309'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateField('design', { ...doc.design, accentColor: col })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        doc.design.accentColor === col ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-secondary">Font Family</label>
                <select
                  value={doc.design.fontFamily}
                  onChange={(e) => updateField('design', { ...doc.design, fontFamily: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-surface-container-low text-body-md border border-surface-container-highest"
                >
                  <option value="Inter">Inter (Swiss Clean)</option>
                  <option value="Helvetica Neue">Helvetica Neue (Modernist)</option>
                  <option value="Georgia">Georgia (Editorial Serif)</option>
                  <option value="Menlo">Menlo (Monospace / Tech)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                className="mt-4 h-9 rounded bg-primary text-on-primary font-label-md hover:bg-inverse-surface transition-colors"
              >
                Save Design Changes
              </button>
            </div>
            <A4ResumePreview document={doc} />
          </div>
        )}

        {/* 4. REVIEW & ATS ANALYSIS MODE */}
        {activeTab === 'review' && (
          <div className="flex flex-1 w-full overflow-hidden">
            <div className="w-[450px] bg-surface-container-lowest p-space-xl flex flex-col gap-space-lg overflow-y-auto border-r border-surface-container-high no-print">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                ATS Compatibility & Quality Review
              </span>

              {analyzing ? (
                <div className="text-secondary text-sm">Evaluating ATS heuristic rules...</div>
              ) : analysisReport ? (
                <div className="flex flex-col gap-space-lg">
                  {/* Score Pill Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                      <span className="text-[11px] text-secondary uppercase font-semibold">ATS Compatibility</span>
                      <span className="text-[22px] font-bold text-on-tertiary-container">
                        {analysisReport.atsCompatibilityScore}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                      <span className="text-[11px] text-secondary uppercase font-semibold">Content Quality</span>
                      <span className="text-[22px] font-bold text-primary">
                        {analysisReport.contentQualityScore}%
                      </span>
                    </div>
                  </div>

                  {/* Strengths */}
                  {analysisReport.strengths.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="font-label-sm text-secondary uppercase tracking-wider">Strengths</span>
                      {analysisReport.strengths.map((str, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[12px] text-on-surface">
                          <span className="material-symbols-outlined text-[15px] text-on-tertiary-container">check_circle</span>
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Issues */}
                  <div className="flex flex-col gap-2">
                    <span className="font-label-sm text-secondary uppercase tracking-wider">
                      Suggestions & Issues ({analysisReport.issues.length})
                    </span>
                    {analysisReport.issues.map((issue: AnalysisIssue, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-[12px] flex flex-col gap-1 border ${
                          issue.severity === 'critical'
                            ? 'bg-error-container border-error/20 text-on-error-container'
                            : issue.severity === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-surface-container-low border-surface-container-highest text-on-surface'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <span>{issue.message}</span>
                          <span className="text-[10px] uppercase font-bold">{issue.severity}</span>
                        </div>
                        {issue.suggestion && (
                          <div className="text-[11px] opacity-80 pt-0.5">
                            Tip: {issue.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
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
