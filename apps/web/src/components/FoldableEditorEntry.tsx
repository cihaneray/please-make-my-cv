"use client";
import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useCopy } from "@/lib/copy";
import styles from "./FoldableEditorEntry.module.css";

export function FoldableEditorEntry({
  id,
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const copy = useCopy();
  return (
    <div
      id={`entry-${id}`}
      data-motion-id={id}
      className={`editor-entry ${styles.entry}`}
    >
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={!collapsed}
        aria-controls={`entry-fields-${id}`}
        aria-label={`${copy(collapsed ? "Expand entry" : "Collapse entry")}: ${title}`}
        onClick={onToggle}
      >
        <span className={styles.summary}>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={collapsed ? styles.closedChevron : styles.openChevron}
        />
      </button>
      <div
        id={`entry-fields-${id}`}
        hidden={collapsed}
        className={styles.fields}
      >
        {children}
      </div>
    </div>
  );
}
