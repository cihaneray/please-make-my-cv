import React from "react";

interface TechStackBadgeProps {
  technologies?: string[];
  label?: string;
  variant?: "tags" | "inline" | "subtle";
  className?: string;
}

export function TechStackBadge({
  technologies,
  label = "Technologies:",
  variant = "tags",
  className = "",
}: TechStackBadgeProps) {
  if (!technologies || technologies.length === 0) return null;

  if (variant === "inline") {
    return (
      <div
        className={`text-[11px] text-neutral-600 leading-normal ${className}`}
      >
        <span className="font-medium text-neutral-800 mr-1.5">{label}</span>
        <span>{technologies.join(", ")}</span>
      </div>
    );
  }

  if (variant === "subtle") {
    return (
      <div
        className={`flex flex-wrap items-center gap-1.5 pt-0.5 ${className}`}
      >
        {label && (
          <span className="text-[10px] font-medium text-neutral-500 mr-0.5">
            {label}
          </span>
        )}
        {technologies.map((t, i) => (
          <span
            key={i}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200/60"
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 pt-1 ${className}`}>
      {label && (
        <span className="text-[10px] font-medium text-neutral-600 mr-1">
          {label}
        </span>
      )}
      {technologies.map((t, i) => (
        <span
          key={i}
          className="text-[10.5px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-medium"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
