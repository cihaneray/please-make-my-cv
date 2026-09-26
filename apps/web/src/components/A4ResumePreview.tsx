'use client';

import React, { useState } from 'react';
import { ResumeDocument } from '@/lib/types';

interface A4ResumePreviewProps {
  document: ResumeDocument;
}

export function A4ResumePreview({ document }: A4ResumePreviewProps) {
  const [zoom, setZoom] = useState<number>(100);

  const { profile, summary, experience, education, projects, skills, design, visibility } = document;
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || 'Your Name';
  const accentColor = design?.accentColor || '#0F172A';
  const fontFamily = design?.fontFamily || 'Inter';

  const zoomScale = zoom / 100;

  return (
    <div className="flex-1 bg-surface-container relative overflow-auto flex flex-col items-center justify-start p-space-lg select-text min-h-full">
      {/* A4 Sheet Presentation Wrapper */}
      <div
        className="w-[595px] min-h-[842px] bg-surface-container-lowest rounded-sm shadow-2xl p-10 flex flex-col justify-between my-auto transition-transform duration-150 origin-top a4-sheet border border-neutral-200/50"
        style={{
          transform: `scale(${zoomScale})`,
          fontFamily: `${fontFamily}, sans-serif`,
        }}
      >
        <div className="flex flex-col gap-5">
          {/* Header Block */}
          <div className="flex flex-col gap-1.5 pb-3 border-b border-surface-container-highest">
            <div className="flex items-baseline justify-between">
              <h1
                className="text-[20px] font-bold tracking-tight"
                style={{ color: accentColor }}
              >
                {fullName}
              </h1>
              {profile.location && (
                <span className="text-[12px] text-secondary font-medium">
                  {profile.location}
                </span>
              )}
            </div>

            {profile.headline && (
              <div className="text-[13px] text-on-surface-variant font-medium tracking-tight">
                {profile.headline}
              </div>
            )}

            {/* Contacts Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-secondary pt-0.5">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="hover:text-on-surface">
                  {profile.email}
                </a>
              )}
              {profile.phone && (
                <>
                  <span>/</span>
                  <span>{profile.phone}</span>
                </>
              )}
              {profile.website && (
                <>
                  <span>/</span>
                  <span className="hover:text-on-surface">{profile.website}</span>
                </>
              )}
              {profile.linkedin && (
                <>
                  <span>/</span>
                  <span className="hover:text-on-surface">{profile.linkedin}</span>
                </>
              )}
              {profile.github && (
                <>
                  <span>/</span>
                  <span className="hover:text-on-surface">{profile.github}</span>
                </>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {summary && visibility?.showSummary !== false && (
            <div className="flex flex-col gap-1.5">
              <h3
                className="text-[10px] uppercase tracking-widest font-semibold pb-1 border-b border-surface-container-high"
                style={{ color: accentColor }}
              >
                Summary
              </h3>
              <p className="text-[11.5px] text-on-surface leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {experience && experience.length > 0 && visibility?.showExperience !== false && (
            <div className="flex flex-col gap-3">
              <h3
                className="text-[10px] uppercase tracking-widest font-semibold pb-1 border-b border-surface-container-high"
                style={{ color: accentColor }}
              >
                Experience
              </h3>

              {experience.map((exp) => (
                <div key={exp.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-on-surface">
                      {exp.position || 'Untitled Role'}
                    </span>
                    <span className="text-[11px] text-secondary font-medium">
                      {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>

                  <div className="text-[11.5px] text-secondary font-medium">
                    {exp.company}
                    {exp.location ? ` • ${exp.location}` : ''}
                  </div>

                  {exp.summary && (
                    <p className="text-[11px] text-on-surface-variant leading-normal">
                      {exp.summary}
                    </p>
                  )}

                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="flex flex-col gap-1 pt-0.5">
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-on-surface leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="text-[10.5px] text-secondary pt-0.5">
                      <span className="font-semibold text-on-surface-variant">Tech: </span>
                      {exp.technologies.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {education && education.length > 0 && visibility?.showEducation !== false && (
            <div className="flex flex-col gap-2.5">
              <h3
                className="text-[10px] uppercase tracking-widest font-semibold pb-1 border-b border-surface-container-high"
                style={{ color: accentColor }}
              >
                Education
              </h3>

              {education.map((edu) => (
                <div key={edu.id} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] font-semibold text-on-surface">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    </span>
                    <span className="text-[11px] text-secondary">
                      {edu.startDate} — {edu.current ? 'Present' : edu.endDate}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-secondary">
                    {edu.institution} {edu.grade ? `(${edu.grade})` : ''}
                  </div>
                  {edu.highlights && edu.highlights.length > 0 && (
                    <ul className="flex flex-col gap-0.5 pt-0.5">
                      {edu.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-on-surface">
                          <span className="w-1 h-1 rounded-full bg-secondary shrink-0 mt-1.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && visibility?.showProjects !== false && (
            <div className="flex flex-col gap-2.5">
              <h3
                className="text-[10px] uppercase tracking-widest font-semibold pb-1 border-b border-surface-container-high"
                style={{ color: accentColor }}
              >
                Projects
              </h3>

              {projects.map((proj) => (
                <div key={proj.id} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] font-semibold text-on-surface">
                      {proj.name}
                    </span>
                    {proj.url && (
                      <span className="text-[11px] text-secondary hover:underline">
                        {proj.url}
                      </span>
                    )}
                  </div>
                  {proj.role && (
                    <div className="text-[11px] text-secondary">{proj.role}</div>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className="flex flex-col gap-1 pt-0.5">
                      {proj.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-on-surface leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {skills && skills.length > 0 && visibility?.showSkills !== false && (
            <div className="flex flex-col gap-1.5">
              <h3
                className="text-[10px] uppercase tracking-widest font-semibold pb-1 border-b border-surface-container-high"
                style={{ color: accentColor }}
              >
                Core Proficiencies
              </h3>
              <div className="flex flex-col gap-1 pt-0.5">
                {skills.map((group) => (
                  <div key={group.id} className="flex items-baseline gap-2 text-[11px]">
                    <span className="font-semibold text-on-surface shrink-0">
                      {group.category}:
                    </span>
                    <span className="text-secondary">
                      {group.skills.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer line */}
        <div className="flex items-center justify-between text-secondary text-[10px] pt-6 border-t border-surface-container-high mt-4">
          <span>{fullName} — Curriculum Vitae</span>
          <span>1 / 1</span>
        </div>
      </div>

      {/* Floating Bottom Preview Controls */}
      <div className="sticky bottom-4 mt-6 flex items-center gap-1 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg z-30 select-none no-print border border-surface-container-highest">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="w-6 h-6 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title="Zoom Out"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>

        <span className="text-[11px] font-medium px-2 text-on-surface w-12 text-center">
          {zoom}%
        </span>

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(150, z + 10))}
          className="w-6 h-6 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title="Zoom In"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>

        <div className="w-px h-3.5 bg-surface-container-high mx-1" />

        <button
          type="button"
          onClick={() => setZoom(100)}
          className="px-2 py-0.5 rounded text-[11px] text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-2 py-0.5 rounded text-[11px] font-medium text-primary hover:bg-surface-container transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">print</span>
          <span>Print</span>
        </button>
      </div>
    </div>
  );
}
