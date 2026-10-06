"use client";
import { ReactNode } from "react";
import { useCopy } from "@/lib/copy";
import { ResumeDocument } from "@/lib/types";
import { EditorField } from "./BulletListEditor";
import { BulletListEditor } from "./BulletListEditor";
import { ReorderControls } from "./ReorderControls";
import { moveItem } from "@/lib/section-order";
import { Icons } from "./Icons";

type Section = "certifications" | "languages" | "customSections";
function Entry({
  label,
  index,
  count,
  group,
  onMove,
  onRemove,
  children,
}: {
  label: string;
  index: number;
  count: number;
  group: string;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const copy = useCopy();
  return (
    <div className="editor-entry">
      <div className="structured-entry-fields">{children}</div>
      <div className="structured-entry-actions">
        <ReorderControls
          label={label}
          index={index}
          count={count}
          group={group}
          onMove={onMove}
        />
        <button
          type="button"
          className="editor-action danger"
          aria-label={`${copy("Remove")} ${label} ${index + 1}`}
          onClick={onRemove}
        >
          <Icons.Delete size={14} />
          {copy("Remove")}
        </button>
      </div>
    </div>
  );
}
export function StructuredSectionEditor({
  section,
  document,
  onChange,
}: {
  section: Section;
  document: ResumeDocument;
  onChange: (doc: ResumeDocument) => void;
}) {
  const copy = useCopy();
  const names = {
    certifications: "Certifications",
    languages: "Languages",
    customSections: "Custom Sections",
  };
  const name = names[section];
  const update = (index: number, patch: Record<string, unknown>) =>
    onChange({
      ...document,
      [section]: document[section].map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  const add = () => {
    const row =
      section === "certifications"
        ? {
            id: crypto.randomUUID(),
            name: "",
            issuer: "",
            issueDate: "",
            expiryDate: "",
            credentialUrl: "",
            credentialId: "",
          }
        : section === "languages"
          ? { id: crypto.randomUUID(), language: "", proficiency: "" }
          : { id: crypto.randomUUID(), title: "", items: [] };
    onChange({ ...document, [section]: [...document[section], row] });
  };
  return (
    <section className="editor-section" aria-label={copy(name)}>
      <header className="editor-section-heading">
        <h2 className="font-headline-md">{copy(name)}</h2>
        <button type="button" className="editor-action" onClick={add}>
          <Icons.Add size={14} />
          {copy(`Add ${name}`)}
        </button>
      </header>
      {!document[section].length && (
        <p className="editor-empty-hint">
          {copy("Add a detail you want to include in your CV.")}
        </p>
      )}
      {document[section].map((row, index) => (
        <Entry
          key={row.id}
          label={copy(name)}
          index={index}
          count={document[section].length}
          group={section}
          onMove={(from, to) =>
            onChange({
              ...document,
              [section]: moveItem([...document[section]], from, to),
            })
          }
          onRemove={() =>
            onChange({
              ...document,
              [section]: document[section].filter((_, i) => i !== index),
            })
          }
        >
          {section === "certifications" &&
            (() => {
              const item = document.certifications[index];
              return (
                <>
                  <EditorField
                    label={copy("Name")}
                    value={item.name}
                    onChange={(name) => update(index, { name })}
                  />
                  <EditorField
                    label={copy("Issuer")}
                    value={item.issuer}
                    onChange={(issuer) => update(index, { issuer })}
                  />
                  <div className="editor-field-grid">
                    <EditorField
                      label={copy("Issue Date")}
                      value={item.issueDate}
                      onChange={(issueDate) => update(index, { issueDate })}
                    />
                    <EditorField
                      label={copy("Expiry Date")}
                      value={item.expiryDate}
                      onChange={(expiryDate) => update(index, { expiryDate })}
                    />
                  </div>
                  <EditorField
                    label={copy("Credential Url")}
                    value={item.credentialUrl}
                    onChange={(credentialUrl) =>
                      update(index, { credentialUrl })
                    }
                  />
                  <EditorField
                    label={copy("Credential Id")}
                    value={item.credentialId}
                    onChange={(credentialId) => update(index, { credentialId })}
                  />
                </>
              );
            })()}
          {section === "languages" &&
            (() => {
              const item = document.languages[index];
              return (
                <div className="editor-field-grid">
                  <EditorField
                    label={copy("Language")}
                    value={item.language}
                    onChange={(language) => update(index, { language })}
                  />
                  <EditorField
                    label={copy("Proficiency")}
                    value={item.proficiency}
                    onChange={(proficiency) => update(index, { proficiency })}
                  />
                </div>
              );
            })()}
          {section === "customSections" &&
            (() => {
              const item = document.customSections[index];
              const updateItem = (i: number, patch: Record<string, unknown>) =>
                update(index, {
                  items: item.items.map((entry, j) =>
                    i === j ? { ...entry, ...patch } : entry,
                  ),
                });
              return (
                <>
                  <EditorField
                    label={copy("Title")}
                    value={item.title}
                    onChange={(title) => update(index, { title })}
                  />
                  <section
                    className="custom-entry-list"
                    aria-label={copy("Items")}
                  >
                    <header className="editor-section-heading">
                      <h3>{copy("Items")}</h3>
                      <button
                        type="button"
                        className="editor-action"
                        onClick={() =>
                          update(index, {
                            items: [
                              ...item.items,
                              {
                                id: crypto.randomUUID(),
                                title: "",
                                subtitle: "",
                                date: "",
                                description: "",
                                bullets: [],
                              },
                            ],
                          })
                        }
                      >
                        <Icons.Add size={14} />
                        {copy("Add Items")}
                      </button>
                    </header>
                    {item.items.map((entry, i) => (
                      <Entry
                        key={entry.id}
                        label={copy("Items")}
                        index={i}
                        count={item.items.length}
                        group={`custom-${item.id}`}
                        onMove={(from, to) =>
                          update(index, {
                            items: moveItem(item.items, from, to),
                          })
                        }
                        onRemove={() =>
                          update(index, {
                            items: item.items.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <EditorField
                          label={copy("Title")}
                          value={entry.title}
                          onChange={(title) => updateItem(i, { title })}
                        />
                        <EditorField
                          label={copy("Subtitle")}
                          value={entry.subtitle}
                          onChange={(subtitle) => updateItem(i, { subtitle })}
                        />
                        <EditorField
                          label={copy("Date")}
                          value={entry.date}
                          onChange={(date) => updateItem(i, { date })}
                        />
                        <EditorField
                          multiline
                          label={copy("Description")}
                          value={entry.description}
                          onChange={(description) =>
                            updateItem(i, { description })
                          }
                        />
                        <BulletListEditor
                          label={copy("Bullets")}
                          values={entry.bullets}
                          onChange={(bullets) => updateItem(i, { bullets })}
                        />
                      </Entry>
                    ))}
                  </section>
                </>
              );
            })()}
        </Entry>
      ))}
    </section>
  );
}
