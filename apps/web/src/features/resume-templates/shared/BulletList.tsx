import React from 'react';

interface BulletListProps {
  bullets?: string[];
  className?: string;
  bulletClassName?: string;
  bulletChar?: React.ReactNode;
}

export function BulletList({
  bullets,
  className = 'space-y-1',
  bulletClassName = 'text-neutral-700 leading-relaxed text-[11px]',
  bulletChar,
}: BulletListProps) {
  if (!bullets || bullets.length === 0) return null;

  return (
    <ul className={`list-none pl-0 ${className}`}>
      {bullets.map((bullet, idx) => (
        <li key={idx} className={`flex items-start gap-2 ${bulletClassName}`}>
          {bulletChar !== undefined ? (
            <span className="shrink-0 select-none">{bulletChar}</span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5 select-none" />
          )}
          <span className="flex-1">{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
