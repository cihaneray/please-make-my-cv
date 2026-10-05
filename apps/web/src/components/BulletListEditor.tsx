"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/lib/copy";
import { useI18n } from "@/lib/i18n";
import { Icons } from "./Icons";

export function BulletListEditor({
  label,
  values,
  onChange,
  addLabel,
  onPolish,
  polishing = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel?: string;
  onPolish?: (index: number) => void;
  polishing?: boolean;
}) {
  const copy = useCopy();
  const { t } = useI18n();
  const [keys, setKeys] = useState(() => values.map((_, i) => i));
  const nextKey = useRef(values.length);
  const container = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const count = values.length;
  // Keep identity when removing a row; positional keys move focus to the wrong text.
  useEffect(() => {
    setKeys((current) =>
      current.length === count
        ? current
        : Array.from(
            { length: count },
            (_, i) => current[i] ?? nextKey.current++,
          ),
    );
  }, [count]);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    const target =
      index < 0
        ? container.current?.querySelector<HTMLButtonElement>(
            ".list-add-button",
          )
        : container.current?.querySelectorAll<HTMLTextAreaElement>("textarea")[
            index
          ];
    target?.focus();
  }, [keys]);
  return (
    <div
      className="bullet-list-editor"
      role="group"
      aria-label={label}
      ref={container}
    >
      <span className="editor-field-label">{label}</span>
      {!values.length && (
        <p className="editor-empty-hint">
          {copy("Add a detail you want to include in your CV.")}
        </p>
      )}
      {values.map((value, index) => (
        <div
          className="bullet-list-item"
          key={keys[index] ?? `pending-${index}`}
        >
          <label className="bullet-text-field">
            <span className="sr-only">
              {label} {index + 1}
            </span>
            <textarea
              rows={3}
              value={value}
              onChange={(event) =>
                onChange(
                  values.map((text, i) =>
                    i === index ? event.target.value : text,
                  ),
                )
              }
            />
          </label>
          <div className="bullet-row-actions">
            {onPolish && (
              <button
                type="button"
                className="editor-action"
                disabled={polishing}
                onClick={() => onPolish(index)}
              >
                <Icons.Sparkles size={14} />
                {t("aiPolish")}
              </button>
            )}
            <button
              type="button"
              className="editor-action danger"
              aria-label={`${copy("Remove bullet")} ${index + 1}`}
              onClick={() => {
                setKeys((current) => current.filter((_, i) => i !== index));
                pendingFocus.current = Math.min(index, values.length - 2);
                onChange(values.filter((_, i) => i !== index));
              }}
            >
              <Icons.Delete size={14} />
              <span>{copy("Remove")}</span>
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="list-add-button editor-action"
        onClick={() => {
          setKeys((current) => [...current, nextKey.current++]);
          pendingFocus.current = values.length;
          onChange([...values, ""]);
        }}
      >
        <Icons.Add size={15} />
        {addLabel || t("addBullet")}
      </button>
    </div>
  );
}

export function EditorField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="editor-field">
      <span className="editor-field-label">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function EditorListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [text, setText] = useState(() => values.join(", "));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(values.join(", "));
  }, [values]);
  return (
    <label className="editor-field">
      <span className="editor-field-label">{label}</span>
      <input
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(values.join(", "));
        }}
        onChange={(event) => {
          setText(event.target.value);
          onChange(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          );
        }}
      />
    </label>
  );
}
