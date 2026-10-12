import React from "react";
import { ResumeTemplateProps } from "../../types";
import { formatDateRange, formatResumeDate } from "../../utils/date-formatter";
import { getSectionTitles } from "../../utils/section-i18n";
import { ContactLine } from "../../shared/ContactLine";
import { ResumeSection } from "../../shared/ResumeSection";
import { BulletList } from "../../shared/BulletList";
import { SkillGroupList } from "../../shared/SkillGroupList";
import { normalizeUrl } from "../../utils/contact-helpers";

export function ProfessionalTemplate({
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
  const titles = getSectionTitles(lang, "professional");

  const accentColor = design?.accentColor || "#1E293B";
  const fontFamily =
    design?.fontFamily || 'Georgia, Cambria, "Times New Roman", Times, serif';

  const fullName =
    `${profile.firstName} ${profile.lastName}`.trim() ||
    (isTr ? "Ad Soyad" : "Your Name");

  // Spacing helper
  const spacingClass =
    design?.spacing === "compact"
      ? "space-y-3.5"
      : design?.spacing === "relaxed"
        ? "space-y-6"
        : "space-y-4.5";

  return (
    <div
      className={`cv-professional-template select-text text-neutral-900 bg-white leading-normal ${spacingClass} ${className}`}
      style={{
        fontFamily,
        color: "#1E293B",
      }}
    >
      {/* Professional Header - Centered & Authoritative */}
      <header
        data-cv-header="true"
        className="text-center pb-3 border-b-2"
        style={{ borderColor: accentColor }}
      >
        <h1
          className="text-[25px] font-bold tracking-normal uppercase"
          style={{ color: accentColor, letterSpacing: "0.04em" }}
        >
          {fullName}
        </h1>

        {profile.headline && (
          <div className="text-[12.5px] font-semibold text-neutral-600 mt-1 uppercase tracking-widest font-sans">
            {profile.headline}
          </div>
        )}

        <div className="pt-2 text-[11px] text-neutral-600 flex justify-center font-sans">
          <ContactLine
            profile={profile}
            separator="|"
            className="justify-center"
            linkClassName="hover:text-neutral-900 transition-colors"
          />
        </div>
      </header>

      {/* Summary */}
      {summary && visibility?.showSummary !== false && (
        <ResumeSection
          title={titles.summary}
          titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
          titleStyle={{ color: accentColor, borderColor: accentColor }}
        >
          <p
            data-cv-entry="true"
            className="pt-2 text-[11.5px] text-neutral-800 leading-relaxed font-sans text-justify"
          >
            {summary}
          </p>
        </ResumeSection>
      )}

      {/* Professional Experience */}
      {experience &&
        experience.length > 0 &&
        visibility?.showExperience !== false && (
          <ResumeSection
            title={titles.experience}
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div className="pt-2 space-y-4">
              {experience.map((exp) => (
                <div data-cv-entry="true" key={exp.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-bold text-[13px] text-neutral-900">
                      <span>{exp.company}</span>
                      {exp.location && (
                        <span className="font-normal text-neutral-600 text-[11.5px]">
                          {" "}
                          - {exp.location}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-neutral-600 shrink-0 font-sans">
                      {formatDateRange(
                        exp.startDate,
                        exp.endDate,
                        exp.current,
                        lang,
                      )}
                    </div>
                  </div>

                  <div className="text-[12px] font-semibold italic text-neutral-800">
                    {exp.position}
                  </div>

                  {exp.summary && (
                    <p className="text-[11px] text-neutral-700 leading-normal font-sans">
                      {exp.summary}
                    </p>
                  )}

                  {exp.bullets && exp.bullets.length > 0 && (
                    <BulletList
                      bullets={exp.bullets}
                      className="pt-1 space-y-1 font-sans"
                      bulletClassName="text-[11.5px] text-neutral-800 leading-relaxed"
                      bulletChar={
                        <span className="text-neutral-700 select-none">•</span>
                      }
                    />
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="text-[11px] text-neutral-600 pt-0.5 font-sans">
                      <span className="font-semibold text-neutral-700">
                        {titles.technologies}:{" "}
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
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div className="pt-2 space-y-3">
              {education.map((edu) => (
                <div data-cv-entry="true" key={edu.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-bold text-[12.5px] text-neutral-900">
                      {edu.institution}
                      {edu.location && (
                        <span className="font-normal text-neutral-600 text-[11.5px]">
                          {" "}
                          - {edu.location}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-600 shrink-0 font-sans">
                      {formatDateRange(
                        edu.startDate,
                        edu.endDate,
                        edu.current,
                        lang,
                      )}
                    </div>
                  </div>

                  <div className="text-[12px] font-medium text-neutral-800 italic">
                    {edu.degree}{" "}
                    {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                    {edu.grade && (
                      <span className="font-normal not-italic text-neutral-600">
                        {" "}
                        ({edu.grade})
                      </span>
                    )}
                  </div>

                  {edu.highlights && edu.highlights.length > 0 && (
                    <BulletList
                      bullets={edu.highlights}
                      className="pt-0.5 space-y-0.5 font-sans"
                      bulletClassName="text-[11px] text-neutral-700"
                      bulletChar={
                        <span className="text-neutral-600 select-none">•</span>
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
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div className="pt-2 space-y-3">
              {projects.map((proj) => (
                <div data-cv-entry="true" key={proj.id} className="space-y-0.5">
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                    <div className="font-bold text-[12.5px] text-neutral-900 flex items-center gap-2">
                      <span>{proj.name}</span>
                      {proj.role && (
                        <span className="font-medium italic text-[11.5px] text-neutral-600">
                          ({proj.role})
                        </span>
                      )}
                    </div>
                    {proj.url && (
                      <a
                        href={normalizeUrl(proj.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-neutral-600 hover:text-neutral-900 underline font-sans break-all"
                      >
                        {proj.urlLabel || proj.url.replace(/^https?:\/\//i, "")}
                      </a>
                    )}
                  </div>

                  {proj.bullets && proj.bullets.length > 0 && (
                    <BulletList
                      bullets={proj.bullets}
                      className="pt-0.5 space-y-1 font-sans"
                      bulletClassName="text-[11.5px] text-neutral-800 leading-relaxed"
                      bulletChar={
                        <span className="text-neutral-700 select-none">•</span>
                      }
                    />
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[11px] text-neutral-600 pt-0.5 font-sans">
                      <span className="font-semibold text-neutral-700">
                        {titles.technologies}:{" "}
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
          titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
          titleStyle={{ color: accentColor, borderColor: accentColor }}
        >
          <div data-cv-entry="true" className="pt-2 font-sans">
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
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div className="pt-2 space-y-1.5 text-[11px] font-sans">
              {certifications.map((c) => (
                <div
                  data-cv-entry="true"
                  key={c.id}
                  className="flex items-baseline justify-between"
                >
                  <div>
                    <strong className="font-semibold text-neutral-900">
                      {c.name}
                    </strong>
                    {c.issuer && (
                      <span className="text-neutral-600"> - {c.issuer}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-neutral-500">
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
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div
              data-cv-entry="true"
              className="pt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] font-sans"
            >
              {languages.map((l) => (
                <span key={l.id} className="text-neutral-800">
                  <strong className="font-semibold text-neutral-900">
                    {l.language}:
                  </strong>{" "}
                  <span className="text-neutral-600">{l.proficiency}</span>
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
            titleClassName="text-[11px] font-bold uppercase tracking-widest pb-1 border-b"
            titleStyle={{ color: accentColor, borderColor: accentColor }}
          >
            <div className="pt-2 space-y-2.5">
              {cs.items.map((item) => (
                <div data-cv-entry="true" key={item.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-[12.5px] text-neutral-900">
                      {item.title}
                    </span>
                    {item.date && (
                      <span className="text-[11px] text-neutral-600 font-sans">
                        {formatResumeDate(item.date, lang)}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <div className="text-[11.5px] italic text-neutral-700">
                      {item.subtitle}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-[11px] text-neutral-700 leading-normal font-sans">
                      {item.description}
                    </p>
                  )}
                  {item.bullets && item.bullets.length > 0 && (
                    <BulletList
                      bullets={item.bullets}
                      className="pt-0.5 space-y-0.5 font-sans"
                      bulletChar={
                        <span className="text-neutral-700 select-none">•</span>
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
