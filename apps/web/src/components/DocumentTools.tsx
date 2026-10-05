"use client";
import { useCopy } from "@/lib/copy";
import React, { useState } from "react";
import { api } from "@/lib/api";
import { ResumeDocument, LibrarySnippet } from "@/lib/types";

const defaults: Record<string, object> = {
  experience: {
    company: "",
    position: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
    bullets: [],
    technologies: [],
  },
  education: {
    institution: "",
    degree: "",
    fieldOfStudy: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    grade: "",
    highlights: [],
  },
  projects: {
    name: "",
    role: "",
    url: "",
    startDate: "",
    endDate: "",
    bullets: [],
    technologies: [],
  },
  skills: { category: "", skills: [] },
  certifications: {
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialUrl: "",
    credentialId: "",
  },
  languages: { language: "", proficiency: "" },
  customSections: { title: "", items: [] },
  items: { title: "", subtitle: "", date: "", description: "", bullets: [] },
  links: { label: "", url: "" },
};
const label = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export function Fields({
  value,
  name,
  change,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
  name: string;
  change: (value: unknown) => void;
}) {
  const copy = useCopy();

  if (Array.isArray(value))
    return (
      <fieldset className="array-field-editor border p-3 my-2">
        <legend>{copy(label(name))}</legend>
        {value.map((item, i) => (
          <div
            key={typeof item === "object" && item?.id ? item.id : i}
            className="array-field-row border-b pb-2 mb-2"
          >
            <Fields
              depth={depth + 1}
              value={item}
              name={`${name} ${i + 1}`}
              change={(v) =>
                change(value.map((old, index) => (index === i ? v : old)))
              }
            />
            <div className="field-row-actions">
              <button
                type="button"
                onClick={() => change(value.filter((_, index) => index !== i))}
              >
                {" "}
                {copy("Remove")} {copy(label(name))} {i + 1}
              </button>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...value];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    change(next);
                  }}
                >
                  {" "}
                  {copy("Move up")}{" "}
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            change([
              ...value,
              defaults[name] && (name !== "skills" || depth === 0)
                ? { ...defaults[name], id: crypto.randomUUID() }
                : "",
            ])
          }
        >
          {" "}
          {copy("Add")} {copy(label(name))}
        </button>
      </fieldset>
    );
  if (typeof value === "object" && value !== null)
    return (
      <div className="grid gap-2">
        {Object.entries(value)
          .filter(([key]) => key !== "id")
          .map(([key, item]) => (
            <Fields
              key={key}
              name={key}
              depth={depth + 1}
              value={item}
              change={(v) => change({ ...value, [key]: v })}
            />
          ))}
      </div>
    );
  if (typeof value === "boolean")
    return (
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => change(e.target.checked)}
        />
        {copy(label(name))}
      </label>
    );
  return (
    <label className="grid gap-1 text-sm">
      {copy(label(name))}
      <input
        className="border rounded p-2"
        value={String(value ?? "")}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}
export function DocumentTools({
  document,
  disabled,
  onChange,
  onRestored,
}: {
  document: ResumeDocument;
  disabled: boolean;
  onChange: (doc: ResumeDocument) => void;
  onRestored: (doc: ResumeDocument) => void;
}) {
  const copy = useCopy();

  const [history, setHistory] = useState<
    Array<{ revision: number; createdAt: string; document: ResumeDocument }>
  >([]);
  const [snippets, setSnippets] = useState<LibrarySnippet[]>([]);
  const [target, setTarget] = useState("summary");
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<ResumeDocument[]>([]);
  const [busy, setBusy] = useState(false);
  function edit(next: ResumeDocument) {
    setUndo((values) => [...values.slice(-49), document]);
    onChange(next);
  }
  return (
    <details className="workspace-tools bg-surface-container-lowest border-b px-4 py-2 no-print shrink-0 max-h-[65vh] overflow-auto">
      <summary> {copy("All fields, history, library and backups")} </summary>
      <div className="document-popover">
        <button
          className="document-popover-close"
          aria-label={copy("Close panel")}
          onClick={(event) =>
            event.currentTarget.closest("details")?.removeAttribute("open")
          }
        >
          {copy("Close panel")}
        </button>
        <fieldset disabled={disabled || busy} className="py-3 space-y-3">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(document, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement("a");
                a.href = url;
                a.download = "resume.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              {" "}
              {copy("Download lossless JSON")}{" "}
            </button>
            <button
              disabled={!undo.length}
              onClick={() => {
                onChange(undo[undo.length - 1]);
                setUndo((values) => values.slice(0, -1));
              }}
            >
              {" "}
              {copy("Undo field edit")}{" "}
            </button>
            <button
              onClick={async () => {
                try {
                  setHistory(await api.history(document.metadata.id));
                  setMessage(
                    "Select a revision to load it into the draft. Save creates a new revision.",
                  );
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              {" "}
              {copy("Load revision history")}{" "}
            </button>
            <button
              onClick={async () => {
                try {
                  setSnippets(await api.listSnippets());
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              {" "}
              {copy("Browse career library")}{" "}
            </button>
          </div>
          {history.map((item) => (
            <button
              className="mr-3"
              key={item.revision}
              onClick={() => {
                edit({
                  ...item.document,
                  metadata: {
                    ...item.document.metadata,
                    revision: document.metadata.revision,
                  },
                });
                setMessage(
                  `Revision ${item.revision} loaded into draft. Review and save.`,
                );
              }}
            >
              {" "}
              {copy("Restore revision")} {item.revision}
            </button>
          ))}
          {!!snippets.length && (
            <div>
              <label>
                {" "}
                {copy("Insert into")}{" "}
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="summary"> {copy("Summary")} </option>
                  {document.experience.map((item, i) => (
                    <option key={item.id} value={`experience:${i}`}>
                      {item.company || "Experience"} {copy("achievements")}{" "}
                    </option>
                  ))}
                  {document.projects.map((item, i) => (
                    <option key={item.id} value={`projects:${i}`}>
                      {item.name || "Project"} {copy("achievements")}{" "}
                    </option>
                  ))}
                </select>
              </label>
              {snippets.map((item) => (
                <button
                  className="block text-left border p-2"
                  key={item.id}
                  onClick={() => {
                    const next = structuredClone(document);
                    if (target === "summary")
                      next.summary = [next.summary, item.content]
                        .filter(Boolean)
                        .join(" ");
                    else {
                      const [section, index] = target.split(":");
                      const entries =
                        section === "experience"
                          ? next.experience
                          : next.projects;
                      if (entries[Number(index)])
                        entries[Number(index)].bullets.push(item.content);
                    }
                    edit(next);
                  }}
                >
                  {item.title}: {item.content}
                </button>
              ))}
            </div>
          )}
          <p role="status">{message}</p>
          {Object.entries(document)
            .filter(([key]) => key !== "metadata")
            .map(([key, value]) => (
              <details key={key} className="border p-2">
                <summary>{copy(label(key))}</summary>
                <Fields
                  name={key}
                  value={value}
                  change={(v) => edit({ ...document, [key]: v })}
                />
              </details>
            ))}
          <label className="block">
            {" "}
            {copy("Tags")}{" "}
            <input
              defaultValue={document.metadata.tags.join(", ")}
              onBlur={(e) =>
                edit({
                  ...document,
                  metadata: {
                    ...document.metadata,
                    tags: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </label>
        </fieldset>
      </div>
    </details>
  );
}
