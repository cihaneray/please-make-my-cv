"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCopy } from "@/lib/copy";
import { ResumeDocument } from "@/lib/types";
import { sections } from "@/lib/section-order";
type Command = { label: string; run: () => void };
export function EditorCommands({
  document,
  commands,
  onSelect,
  disabled,
}: {
  document: ResumeDocument;
  commands: Command[];
  onSelect: (section: string, entry?: string, text?: string) => void;
  disabled: boolean;
}) {
  const copy = useCopy();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const open = () => {
    if (disabled) return;
    setQuery("");
    dialog.current?.showModal();
    search.current?.focus();
  };
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !disabled
      ) {
        event.preventDefault();
        dialog.current?.showModal();
        setQuery("");
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [disabled]);
  const results = useMemo(() => {
    const matches: {
      key: string;
      section: string;
      entry?: string;
      text: string;
    }[] = [];
    if (!query.trim()) return matches;
    const needle = query.toLocaleLowerCase();
    const visit = (
      value: unknown,
      section: string,
      entry?: string,
      path = section,
    ) => {
      if (
        typeof value === "string" &&
        value.toLocaleLowerCase().includes(needle)
      )
        matches.push({ key: path, section, entry, text: value });
      else if (Array.isArray(value))
        value.forEach((item, i) =>
          visit(
            item,
            section,
            typeof item === "object" && item ? item.id : entry,
            `${path}.${i}`,
          ),
        );
      else if (value && typeof value === "object")
        Object.entries(value)
          .filter(([key]) => key !== "id")
          .forEach(([key, item]) =>
            visit(item, section, entry, `${path}.${key}`),
          );
    };
    visit(document.profile, "profile");
    sections.forEach((key) => visit(document[key], key));
    return matches.slice(0, 25);
  }, [document, query]);
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="studio-undo"
        aria-label={copy("Search and commands")}
        disabled={disabled}
        onClick={open}
      >
        {copy("Search")} <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-dialog"
        aria-label={copy("Search and commands")}
        onCancel={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="command-content">
          <header>
            <h2>{copy("Search and commands")}</h2>
            <button type="button" onClick={close}>
              {copy("Close")}
            </button>
          </header>
          <label>
            {copy("Search CV or actions")}
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  dialog.current
                    ?.querySelector<HTMLButtonElement>(
                      ".command-results button",
                    )
                    ?.focus();
                }
              }}
            />
          </label>
          <div
            className="command-results"
            onKeyDown={(e) => {
              const buttons = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
              );
              const i = buttons.indexOf(
                window.document.activeElement as HTMLButtonElement,
              );
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const next = i + (e.key === "ArrowDown" ? 1 : -1);
                if (next < 0) search.current?.focus();
                else buttons[next % buttons.length]?.focus();
              }
            }}
          >
            {commands
              .filter((action) =>
                copy(action.label)
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((action) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => {
                    close();
                    action.run();
                  }}
                >
                  {copy(action.label)}
                </button>
              ))}
            {results.map((result) => (
              <button
                type="button"
                key={result.key}
                onClick={() => {
                  close();
                  onSelect(result.section, result.entry, result.text);
                }}
              >
                <small>{copy(result.section)}</small>
                <span>{result.text}</span>
              </button>
            ))}
            {!!query &&
              !results.length &&
              !commands.some((action) =>
                copy(action.label)
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              ) && <p>{copy("No matching content or actions.")}</p>}
          </div>
        </div>
      </dialog>
    </>
  );
}
