import React from 'react';
import { SkillGroup } from '@/lib/types';

interface SkillGroupListProps {
  skills?: SkillGroup[];
  variant?: 'categorized-lines' | 'pill-tags' | 'technical-grid';
  className?: string;
}

export function SkillGroupList({
  skills,
  variant = 'categorized-lines',
  className = '',
}: SkillGroupListProps) {
  if (!skills || skills.length === 0) return null;

  if (variant === 'pill-tags') {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {skills.map((group) => (
          <div key={group.id} className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-800 uppercase tracking-wider block">
              {group.category}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.skills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="text-[11px] px-2 py-0.5 rounded bg-neutral-100/90 text-neutral-800 font-medium border border-neutral-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'technical-grid') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[11px] ${className}`}>
        {skills.map((group) => (
          <div key={group.id} className="flex items-baseline gap-2">
            <span className="font-semibold text-neutral-900 shrink-0 font-mono text-[10.5px]">
              {group.category}:
            </span>
            <span className="text-neutral-700 leading-relaxed">
              {group.skills.join(', ')}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Default: categorized-lines (pure ATS safe lines)
  return (
    <div className={`space-y-1.5 text-[11.5px] ${className}`}>
      {skills.map((group) => (
        <div key={group.id} className="flex items-baseline gap-2">
          <span className="font-semibold text-neutral-900 shrink-0">
            {group.category}:
          </span>
          <span className="text-neutral-600">
            {group.skills.join(', ')}
          </span>
        </div>
      ))}
    </div>
  );
}
