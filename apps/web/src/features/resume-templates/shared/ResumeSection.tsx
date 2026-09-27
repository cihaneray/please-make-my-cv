import React from 'react';

interface ResumeSectionProps {
  title?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResumeSection({
  title,
  titleClassName = '',
  titleStyle,
  children,
  className = '',
  style,
}: ResumeSectionProps) {
  return (
    <section
      data-cv-section="true"
      className={`break-inside-avoid print:break-inside-avoid ${className}`}
      style={{
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        ...style,
      }}
    >
      {title && (
        <h2
          data-cv-heading="true"
          className={`font-semibold tracking-wider select-text ${titleClassName}`}
          style={{
            breakAfter: 'avoid',
            pageBreakAfter: 'avoid',
            ...titleStyle,
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
