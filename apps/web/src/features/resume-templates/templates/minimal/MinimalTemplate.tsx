import React from "react";
import { ResumeTemplateProps } from "../../types";
import { formatDateRange, formatResumeDate } from "../../utils/date-formatter";
import { getSectionTitles } from "../../utils/section-i18n";
import { ContactLine } from "../../shared/ContactLine";
import { ResumeSection } from "../../shared/ResumeSection";
import { BulletList } from "../../shared/BulletList";
import { SkillGroupList } from "../../shared/SkillGroupList";
import { normalizeUrl } from "../../utils/contact-helpers";

export function MinimalTemplate({
  document,
  isPrintMode,
  className = "",
}: ResumeTemplateProps) {
  const {
    profile,
    summary,
    experience,
    education,
    projects,
    skills,
    certifications,
    languages,
    customSections,
    design,
    visibility,
  } = document;
  const lang = document.metadata?.language || "en";
  const isTr = lang === "tr";
  const titles = getSectionTitles(lang, "minimal");

  const accentColor = design?.accentColor || "#18181B";
  const fontFamily =
    design?.fontFamily ||
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const fullName =
    `${profile.firstName} ${profile.lastName}`.trim() ||
    (isTr ? "Ad Soyad" : "Your Name");

  // Spacing helper
  const spacingClass =
    design?.spacing === "compact"
      ? "space-y-4"
      : design?.spacing === "relaxed"
        ? "space-y-7"
        : "space-y-5";

  return (
    <div
      className={`cv-minimal-template select-text text-neutral-900 bg-white leading-normal ${spacingClass} ${className}`}
      style={{
        fontFamily,
        color: "#18181B",
      }}
    >
      {/* Minimal Header */}
      <header
        data-cv-header="true"
        className="pb-3 border-b border-neutral-200/80"
      >
        <div className="flex flex-col gap-1">
          <h1
            className="text-[24px] font-medium tracking-tight"
            style={{ color: accentColor }}
          >
            {fullName}
          </h1>

          {profile.headline && (
            <div className="text-[13px] text-neutral-500 font-normal">
              {profile.headline}
            </div>
          )}

          <div className="pt-1.5 text-[11px] text-neutral-600">
            <ContactLine
              profile={profile}
              separator="·"
              linkClassName="hover:text-neutral-900 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Summary */}
      {summary && visibility?.showSummary !== false && (
        <ResumeSection
          title={titles.summary}
          titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
        >
          <p
            data-cv-entry="true"
            className="pt-2 text-[11.5px] text-neutral-700 leading-relaxed max-w-prose"
          >
            {summary}
          </p>
        </ResumeSection>
      )}

      {/* Experience */}
      {experience &&
        experience.length > 0 &&
        visibility?.showExperience !== false && (
          <ResumeSection
            title={titles.experience}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div className="pt-2 space-y-4">
              {experience.map((exp) => (
                <div data-cv-entry="true" key={exp.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-medium text-[12.5px] text-neutral-900">
                      {exp.position}
                      {exp.company && (
                        <span className="font-normal text-neutral-500">
                          {" "}
                          — {exp.company}
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-neutral-400 shrink-0 font-normal">
                      {formatDateRange(
                        exp.startDate,
                        exp.endDate,
                        exp.current,
                        lang,
                      )}
                      {exp.location && ` · ${exp.location}`}
                    </div>
                  </div>

                  {exp.summary && (
                    <p className="text-[11px] text-neutral-600 leading-normal">
                      {exp.summary}
                    </p>
                  )}

                  {exp.bullets && exp.bullets.length > 0 && (
                    <BulletList
                      bullets={exp.bullets}
                      className="pt-1 space-y-1"
                      bulletClassName="text-[11px] text-neutral-700 leading-relaxed"
                      bulletChar={
                        <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      }
                    />
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="text-[10.5px] text-neutral-500 pt-0.5">
                      <span className="text-neutral-400 mr-1.5">
                        {titles.technologies}:
                      </span>
                      {exp.technologies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ResumeSection>
        )}

      {/* Education */}
      {education &&
        education.length > 0 &&
        visibility?.showEducation !== false && (
          <ResumeSection
            title={titles.education}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div className="pt-2 space-y-3">
              {education.map((edu) => (
                <div data-cv-entry="true" key={edu.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-medium text-[12px] text-neutral-900">
                      {edu.degree}{" "}
                      {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                      {edu.institution && (
                        <span className="font-normal text-neutral-500">
                          {" "}
                          — {edu.institution}
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-neutral-400 shrink-0">
                      {formatDateRange(
                        edu.startDate,
                        edu.endDate,
                        edu.current,
                        lang,
                      )}
                      {edu.location && ` · ${edu.location}`}
                    </div>
                  </div>

                  {edu.highlights && edu.highlights.length > 0 && (
                    <BulletList
                      bullets={edu.highlights}
                      className="pt-0.5 space-y-0.5"
                      bulletClassName="text-[10.5px] text-neutral-600"
                      bulletChar={
                        <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </ResumeSection>
        )}

      {/* Projects */}
      {projects &&
        projects.length > 0 &&
        visibility?.showProjects !== false && (
          <ResumeSection
            title={titles.projects}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div className="pt-2 space-y-3">
              {projects.map((proj) => (
                <div data-cv-entry="true" key={proj.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-medium text-[12px] text-neutral-900 flex items-center gap-2">
                      <span>{proj.name}</span>
                      {proj.role && (
                        <span className="font-normal text-[11px] text-neutral-500">
                          ({proj.role})
                        </span>
                      )}
                    </div>
                    {proj.url && (
                      <a
                        href={normalizeUrl(proj.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] text-neutral-500 hover:text-neutral-900 transition-colors"
                      >
                        {proj.url.replace(/^https?:\/\//i, "")}
                      </a>
                    )}
                  </div>

                  {proj.bullets && proj.bullets.length > 0 && (
                    <BulletList
                      bullets={proj.bullets}
                      className="pt-0.5 space-y-1"
                      bulletClassName="text-[11px] text-neutral-700 leading-relaxed"
                      bulletChar={
                        <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      }
                    />
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[10.5px] text-neutral-500 pt-0.5">
                      <span className="text-neutral-400 mr-1">
                        {titles.technologies}:
                      </span>
                      {proj.technologies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ResumeSection>
        )}

      {/* Skills */}
      {skills && skills.length > 0 && visibility?.showSkills !== false && (
        <ResumeSection
          title={titles.skills}
          titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
        >
          <div data-cv-entry="true" className="pt-2">
            <SkillGroupList skills={skills} variant="categorized-lines" />
          </div>
        </ResumeSection>
      )}

      {/* Certifications */}
      {certifications &&
        certifications.length > 0 &&
        visibility?.showCertifications !== false && (
          <ResumeSection
            title={titles.certifications}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div className="pt-2 space-y-1.5 text-[11px]">
              {certifications.map((c) => (
                <div
                  data-cv-entry="true"
                  key={c.id}
                  className="flex items-baseline justify-between"
                >
                  <div>
                    <span className="font-medium text-neutral-900">
                      {c.name}
                    </span>
                    {c.issuer && (
                      <span className="text-neutral-500"> — {c.issuer}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-neutral-400">
                    {formatResumeDate(c.issueDate, lang)}
                  </div>
                </div>
              ))}
            </div>
          </ResumeSection>
        )}

      {/* Languages */}
      {languages &&
        languages.length > 0 &&
        visibility?.showLanguages !== false && (
          <ResumeSection
            title={titles.languages}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div
              data-cv-entry="true"
              className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
            >
              {languages.map((l) => (
                <span key={l.id} className="text-neutral-700">
                  <strong className="font-medium text-neutral-900">
                    {l.language}
                  </strong>
                  {l.proficiency && (
                    <span className="text-neutral-500"> ({l.proficiency})</span>
                  )}
                </span>
              ))}
            </div>
          </ResumeSection>
        )}

      {/* Custom Sections */}
      {customSections &&
        customSections.length > 0 &&
        customSections.map((cs) => (
          <ResumeSection
            key={cs.id}
            title={cs.title.toUpperCase()}
            titleClassName="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 pb-1 border-b border-neutral-100"
          >
            <div className="pt-2 space-y-2.5">
              {cs.items.map((item) => (
                <div data-cv-entry="true" key={item.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-[12px] text-neutral-900">
                      {item.title}
                    </span>
                    {item.date && (
                      <span className="text-[10.5px] text-neutral-400">
                        {formatResumeDate(item.date, lang)}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <div className="text-[11px] text-neutral-500">
                      {item.subtitle}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-[11px] text-neutral-600 leading-normal">
                      {item.description}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <BulletList
                      bullets={item.bullets}
                      className="pt-0.5 space-y-0.5"
                      bulletChar={
                        <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0 mt-1.5" />
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </ResumeSection>
        ))}
    </div>
  );
}
