"use client";

import type { Dispatch, SetStateAction } from "react";
import { FoldableEditorEntry } from "@/components/FoldableEditorEntry";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ReorderControls } from "@/components/ReorderControls";
import { SlidingIndicator } from "@/components/SlidingIndicator";
import { MotionList } from "@/components/MotionList";
import { Icons } from "@/components/Icons";
import {
  BulletListEditor,
  EditorField,
  EditorListField,
} from "@/components/BulletListEditor";
import { DateFields } from "@/components/DateFields";
import { StructuredSectionEditor } from "@/components/StructuredSectionEditor";
import { sectionOrder, moveItem } from "@/lib/section-order";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import type { ResumeDocument, SkillGroup } from "@/lib/types";
import type { ResumeContentActions } from "./useResumeContent";

type Props = {
  document: ResumeDocument;
  onChange: Dispatch<SetStateAction<ResumeDocument | null>>;
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsedEntries: ReadonlySet<string>;
  onToggleEntry: (id: string) => void;
  onExpandEntry: (id?: string) => void;
  actions: ResumeContentActions;
  aiLoading: boolean;
  onImproveSummary: () => Promise<void>;
  onRewriteBullet: (
    experienceIndex: number,
    bulletIndex: number,
    tone?: string,
  ) => Promise<void>;
};

/** Section navigation and content forms; persistence stays in the studio route. */
export function ResumeContentEditor({
  document: doc,
  onChange: setDoc,
  activeSection,
  onSectionChange: setActiveSection,
  collapsedEntries,
  onToggleEntry: toggleEntry,
  onExpandEntry: expandEntry,
  actions,
  aiLoading,
  onImproveSummary: handleAiImproveSummary,
  onRewriteBullet: handleAiRewriteBullet,
}: Props) {
  const { t, language } = useI18n();
  const copy = useCopy();
  const {
    updateField,
    updateProfileField,
    addExperience,
    updateExperienceItem,
    removeExperienceItem,
    addEducation,
    updateEducationItem,
    removeEducationItem,
    addProject,
    updateProjectItem,
    removeProjectItem,
  } = actions;
  return (
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
                  title={s.count === 0 ? copy("Nothing added yet") : s.label}
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
        {(["certifications", "languages", "customSections"] as const).map(
          (section) =>
            activeSection === section && (
              <StructuredSectionEditor
                key={section}
                section={section}
                collapsedEntries={collapsedEntries}
                onToggleEntry={toggleEntry}
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
                  placeholder={copy("e.g. Senior Software Architect")}
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
                  onChange={(e) => updateProfileField("email", e.target.value)}
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
                  onChange={(e) => updateProfileField("phone", e.target.value)}
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
              <FoldableEditorEntry
                id={exp.id}
                key={exp.id}
                title={
                  exp.position || exp.company || copy("Untitled experience")
                }
                subtitle={exp.position ? exp.company : exp.location}
                collapsed={collapsedEntries.has(exp.id)}
                onToggle={() => toggleEntry(exp.id)}
                actions={
                  <ReorderControls
                    group="experience"
                    index={expIdx}
                    count={doc.experience.length}
                    label={exp.position || exp.company || String(expIdx + 1)}
                    onMove={(from, to) =>
                      updateField(
                        "experience",
                        moveItem(doc.experience, from, to),
                      )
                    }
                  />
                }
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
              </FoldableEditorEntry>
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
              <FoldableEditorEntry
                id={edu.id}
                key={edu.id}
                title={edu.institution || copy("Untitled education")}
                subtitle={[edu.degree, edu.fieldOfStudy]
                  .filter(Boolean)
                  .join(" · ")}
                collapsed={collapsedEntries.has(edu.id)}
                onToggle={() => toggleEntry(edu.id)}
                actions={
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
                }
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
              </FoldableEditorEntry>
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
              <FoldableEditorEntry
                id={proj.id}
                key={proj.id}
                title={proj.name || copy("Untitled project")}
                subtitle={proj.role}
                collapsed={collapsedEntries.has(proj.id)}
                onToggle={() => toggleEntry(proj.id)}
                actions={
                  <ReorderControls
                    group="projects"
                    index={projIdx}
                    count={doc.projects.length}
                    label={proj.name || String(projIdx + 1)}
                    onMove={(from, to) =>
                      updateField("projects", moveItem(doc.projects, from, to))
                    }
                  />
                }
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
                <EditorField
                  label={
                    language === "tr"
                      ? "Bağlantı metni (isteğe bağlı)"
                      : "Link text (optional)"
                  }
                  value={proj.urlLabel || ""}
                  onChange={(urlLabel) =>
                    updateProjectItem(projIdx, { ...proj, urlLabel })
                  }
                />
                <p className="text-xs text-secondary">
                  {language === "tr"
                    ? "Örneğin: Steam’de görüntüle. Bağlantının adresi aynı kalır."
                    : "For example: View on Steam. The destination URL stays the same."}
                </p>
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
              </FoldableEditorEntry>
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
                  expandEntry(newGroup.id);
                }}
                className="editor-action"
              >
                <Icons.Add size={15} />
                <span>{t("addCategory")}</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {doc.skills.map((grp, idx) => (
                <FoldableEditorEntry
                  id={grp.id}
                  key={grp.id}
                  title={grp.category || copy("Untitled skill group")}
                  subtitle={`${copy("Skills")}: ${grp.skills.length}${
                    grp.skills.length
                      ? ` · ${grp.skills.slice(0, 3).join(" · ")}${grp.skills.length > 3 ? " …" : ""}`
                      : ""
                  }`}
                  collapsed={collapsedEntries.has(grp.id)}
                  onToggle={() => toggleEntry(grp.id)}
                  actions={
                    <ReorderControls
                      group="skills"
                      index={idx}
                      count={doc.skills.length}
                      label={grp.category || String(idx + 1)}
                      onMove={(from, to) =>
                        updateField("skills", moveItem(doc.skills, from, to))
                      }
                    />
                  }
                >
                  <div className="editor-entry-heading">
                    <EditorField
                      label={copy("Skill category")}
                      value={grp.category}
                      onChange={(category) => {
                        const newSkills = structuredClone(doc.skills);
                        newSkills[idx].category = category;
                        updateField("skills", newSkills);
                      }}
                    />
                    <button
                      type="button"
                      className="editor-icon-button danger"
                      aria-label={copy("Remove skill group") + " " + (idx + 1)}
                      onClick={() =>
                        updateField(
                          "skills",
                          doc.skills.filter((_, index) => index !== idx),
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
                </FoldableEditorEntry>
              ))}
            </div>
          </MotionList>
        )}
      </div>
    </>
  );
}
