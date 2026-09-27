import React from 'react';
import { ResumeTemplateProps } from '../../types';
import { formatDateRange, formatResumeDate } from '../../utils/date-formatter';
import { getSectionTitles } from '../../utils/section-i18n';
import { ContactLine } from '../../shared/ContactLine';
import { ResumeSection } from '../../shared/ResumeSection';
import { BulletList } from '../../shared/BulletList';
import { TechStackBadge } from '../../shared/TechStackBadge';
import { normalizeUrl } from '../../utils/contact-helpers';

export function TechnicalTemplate({ document, isPrintMode, className = '' }: ResumeTemplateProps) {
  const { profile, summary, experience, education, projects, skills, certifications, languages, customSections, design, visibility } = document;
  const lang = document.metadata?.language || 'en';
  const isTr = lang === 'tr';
  const titles = getSectionTitles(lang, 'technical');

  const accentColor = design?.accentColor || '#0F172A';
  const fontFamily = design?.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || (isTr ? 'Ad Soyad' : 'Your Name');

  // Spacing helper
  const spacingClass =
    design?.spacing === 'compact' ? 'space-y-3.5' :
    design?.spacing === 'relaxed' ? 'space-y-6' : 'space-y-4.5';

  return (
    <div
      className={`cv-technical-template select-text text-neutral-900 bg-white leading-normal ${spacingClass} ${className}`}
      style={{
        fontFamily,
        color: '#0F172A',
      }}
    >
      {/* Technical Header */}
      <header className="pb-2.5 border-b-2" style={{ borderColor: accentColor }}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h1
              className="text-[22px] font-bold tracking-tight uppercase"
              style={{ color: accentColor }}
            >
              {fullName}
            </h1>
            {profile.location && (
              <span className="text-[11px] font-mono text-neutral-500">
                [{profile.location}]
              </span>
            )}
          </div>

          {profile.headline && (
            <div className="text-[12.5px] font-semibold text-neutral-700 tracking-tight">
              {profile.headline}
            </div>
          )}

          <div className="pt-1 text-[10.5px] font-mono text-neutral-600">
            <ContactLine
              profile={profile}
              separator="|"
              linkClassName="hover:text-neutral-900 hover:underline transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Summary */}
      {summary && visibility?.showSummary !== false && (
        <ResumeSection
          title={titles.summary}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <p className="pt-1.5 text-[11px] text-neutral-800 leading-relaxed font-normal">
            {summary}
          </p>
        </ResumeSection>
      )}

      {/* Technical Skills - Prominently placed at the top for Technical layout */}
      {skills && skills.length > 0 && visibility?.showSkills !== false && (
        <ResumeSection
          title={titles.skills}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 space-y-1 text-[11px]">
            {skills.map((group) => (
              <div key={group.id} className="flex items-baseline gap-2">
                <span className="font-semibold text-neutral-900 shrink-0 font-mono text-[10.5px]">
                  {group.category}:
                </span>
                <span className="text-neutral-700 leading-snug">
                  {group.skills.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Work Experience */}
      {experience && experience.length > 0 && visibility?.showExperience !== false && (
        <ResumeSection
          title={titles.experience}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 space-y-3.5">
            {experience.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[12px] font-bold text-neutral-900">
                    <span>{exp.position}</span>
                    {exp.company && (
                      <span className="font-semibold text-neutral-600"> @ {exp.company}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] font-mono text-neutral-500 shrink-0">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current, lang)}
                    {exp.location && ` | ${exp.location}`}
                  </div>
                </div>

                {exp.summary && (
                  <p className="text-[11px] text-neutral-700 leading-normal">
                    {exp.summary}
                  </p>
                )}

                {exp.bullets && exp.bullets.length > 0 && (
                  <BulletList
                    bullets={exp.bullets}
                    className="pt-0.5 space-y-1"
                    bulletClassName="text-[11px] text-neutral-800 leading-relaxed"
                    bulletChar={<span className="text-neutral-500 font-mono select-none">›</span>}
                  />
                )}

                {exp.technologies && exp.technologies.length > 0 && (
                  <TechStackBadge
                    technologies={exp.technologies}
                    label={`${titles.technologies}:`}
                    variant="subtle"
                  />
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Technical Projects */}
      {projects && projects.length > 0 && visibility?.showProjects !== false && (
        <ResumeSection
          title={titles.projects}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 space-y-3">
            {projects.map((proj) => (
              <div key={proj.id} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[12px] font-bold text-neutral-900 flex items-center gap-2">
                    <span>{proj.name}</span>
                    {proj.role && <span className="font-normal text-[11px] text-neutral-600">({proj.role})</span>}
                  </div>
                  {proj.url && (
                    <a
                      href={normalizeUrl(proj.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-neutral-500 hover:text-neutral-900 hover:underline transition-colors shrink-0"
                    >
                      {proj.url.replace(/^https?:\/\//i, '')}
                    </a>
                  )}
                </div>

                {proj.bullets && proj.bullets.length > 0 && (
                  <BulletList
                    bullets={proj.bullets}
                    className="pt-0.5 space-y-0.5"
                    bulletClassName="text-[11px] text-neutral-800 leading-relaxed"
                    bulletChar={<span className="text-neutral-500 font-mono select-none">›</span>}
                  />
                )}

                {proj.technologies && proj.technologies.length > 0 && (
                  <TechStackBadge
                    technologies={proj.technologies}
                    label={`${titles.technologies}:`}
                    variant="subtle"
                  />
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Education */}
      {education && education.length > 0 && visibility?.showEducation !== false && (
        <ResumeSection
          title={titles.education}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 space-y-2">
            {education.map((edu) => (
              <div key={edu.id} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[12px] font-semibold text-neutral-900">
                    <span>{edu.degree}</span>
                    {edu.fieldOfStudy && <span> in {edu.fieldOfStudy}</span>}
                    {edu.institution && (
                      <span className="font-normal text-neutral-600"> — {edu.institution}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] font-mono text-neutral-500 shrink-0">
                    {formatDateRange(edu.startDate, edu.endDate, edu.current, lang)}
                    {edu.location && ` | ${edu.location}`}
                  </div>
                </div>

                {edu.highlights && edu.highlights.length > 0 && (
                  <BulletList
                    bullets={edu.highlights}
                    className="pt-0.5 space-y-0.5"
                    bulletClassName="text-[10.5px] text-neutral-700"
                    bulletChar={<span className="text-neutral-400 font-mono select-none">›</span>}
                  />
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && visibility?.showCertifications !== false && (
        <ResumeSection
          title={titles.certifications}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 space-y-1 text-[11px]">
            {certifications.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between">
                <div>
                  <span className="font-semibold text-neutral-900">{c.name}</span>
                  {c.issuer && <span className="text-neutral-600"> — {c.issuer}</span>}
                  {c.credentialId && (
                    <span className="text-[10px] font-mono text-neutral-500 ml-2">ID: {c.credentialId}</span>
                  )}
                </div>
                <div className="text-[10.5px] font-mono text-neutral-500">
                  {formatResumeDate(c.issueDate, lang)}
                </div>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Languages */}
      {languages && languages.length > 0 && visibility?.showLanguages !== false && (
        <ResumeSection
          title={titles.languages}
          titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
          titleStyle={{ color: accentColor }}
        >
          <div className="pt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {languages.map((l) => (
              <span key={l.id} className="text-neutral-700 font-mono">
                <strong className="font-semibold text-neutral-900 font-sans">{l.language}</strong>
                {l.proficiency && <span className="text-neutral-500 text-[10.5px]"> [{l.proficiency}]</span>}
              </span>
            ))}
          </div>
        </ResumeSection>
      )}

      {/* Custom Sections */}
      {customSections && customSections.length > 0 && (
        customSections.map((cs) => (
          <ResumeSection
            key={cs.id}
            title={cs.title.toUpperCase()}
            titleClassName="text-[10px] font-bold tracking-wider pb-0.5 border-b border-neutral-300"
            titleStyle={{ color: accentColor }}
          >
            <div className="pt-1.5 space-y-2">
              {cs.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-[12px] text-neutral-900">{item.title}</span>
                    {item.date && (
                      <span className="text-[10.5px] font-mono text-neutral-500">{formatResumeDate(item.date, lang)}</span>
                    )}
                  </div>
                  {item.subtitle && <div className="text-[11px] text-neutral-600">{item.subtitle}</div>}
                  {item.description && <p className="text-[11px] text-neutral-700 leading-normal">{item.description}</p>}
                  {item.bullets && item.bullets.length > 0 && (
                    <BulletList
                      bullets={item.bullets}
                      className="pt-0.5 space-y-0.5"
                      bulletChar={<span className="text-neutral-500 font-mono select-none">›</span>}
                    />
                  )}
                </div>
              ))}
            </div>
          </ResumeSection>
        ))
      )}
    </div>
  );
}
