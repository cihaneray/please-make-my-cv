"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import styles from "./SelectMenu.module.css";
import { useAnchoredPopover } from "./useAnchoredPopover";
import { useCopy } from "@/lib/copy";

type Option = {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
  group?: string;
};
type ChoiceProps = {
  children?: ReactNode;
  value?: string | number;
  label?: string;
  disabled?: boolean;
};
function plainText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<ChoiceProps>(child)
        ? plainText(child.props.children)
        : String(child),
    )
    .join("");
}
function choices(
  children: ReactNode,
  group?: string,
  disabled = false,
): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ChoiceProps>(child)) return [];
    if (child.type === "option")
      return [
        {
          value: String(child.props.value ?? plainText(child.props.children)),
          label: child.props.label ?? child.props.children,
          text: child.props.label ?? plainText(child.props.children),
          disabled: disabled || !!child.props.disabled,
          group,
        },
      ];
    return choices(
      child.props.children,
      child.type === "optgroup" ? child.props.label : group,
      disabled || !!child.props.disabled,
    );
  });
}

export function SelectMenu({
  value,
  onValueChange,
  children,
  disabled = false,
  className = "",
  rootClassName = "",
  id,
  name,
  title,
  required,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  rootClassName?: string;
  id?: string;
  name?: string;
  title?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const copy = useCopy();
  const options = choices(children);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const {
    open,
    setOpen,
    triggerRef: trigger,
    popupRef: popup,
  } = useAnchoredPopover({ width: 180 });
  const [active, setActive] = useState(0);
  const [implicitLabel, setImplicitLabel] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const prefix = useRef({ text: "", time: 0 });
  const popupId = useId();
  useLayoutEffect(() => {
    if (ariaLabel || labelledBy) return;
    const label =
      trigger.current?.closest("label") ??
      (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null);
    if (!label) return;
    const clone = label.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("[data-select-menu-root]")
      .forEach((node) => node.remove());
    setImplicitLabel(clone.textContent?.replace(/\s+/g, " ").trim());
  }, [ariaLabel, labelledBy, id, children, trigger]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled, setOpen]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, popup]);
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  function show() {
    setActive(
      selectedIndex >= 0 && !selected?.disabled
        ? selectedIndex
        : (enabled[0] ?? 0),
    );
    setOpen(true);
  }
  function select(index: number) {
    if (!options[index] || options[index].disabled) return;
    onValueChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      data-select-menu-root
      className={`${styles.root} ${rootClassName}`}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled || !enabled.length}
        aria-label={ariaLabel ?? implicitLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-required={required}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={popupId}
        aria-activedescendant={open ? `${popupId}-${active}` : undefined}
        title={title}
        className={`${className} ${styles.trigger}`}
        popoverTarget={popupId}
        onClick={(event) => {
          event.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            setOpen(false);
            return;
          }
          if (event.key === "Escape") {
            if (open) event.preventDefault();
            setOpen(false);
            return;
          }
          if (
            ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              select(active);
              return;
            }
            const index = enabled.indexOf(active);
            setActive(
              event.key === "Home"
                ? enabled[0]
                : event.key === "End"
                  ? enabled[enabled.length - 1]
                  : enabled[
                      (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        enabled.length) %
                        enabled.length
                    ],
            );
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            const now = Date.now();
            prefix.current.text =
              (now - prefix.current.time > 700 ? "" : prefix.current.text) +
              event.key.toLocaleLowerCase();
            prefix.current.time = now;
            const index = options.findIndex(
              (option) =>
                !option.disabled &&
                option.text
                  .trim()
                  .toLocaleLowerCase()
                  .startsWith(prefix.current.text),
            );
            if (index >= 0) {
              event.preventDefault();
              if (!open) setOpen(true);
              setActive(index);
            }
          }
        }}
      >
        <span className={styles.selectedValue}>{selected?.label ?? value}</span>
        <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      <div
        ref={popup}
        id={popupId}
        popover="auto"
        role="listbox"
        aria-label={copy("Options")}
        className={styles.popup}
        onClick={event => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={`${option.value}-${index}`}
            data-option-group={option.group}
          >
            {option.group && option.group !== options[index - 1]?.group && (
              <div className={styles.group}>{option.group}</div>
            )}
            <div
              id={`${popupId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-value={option.value}
              data-option-index={index}
              className={`${styles.option} ${active === index ? styles.activeOption : ""}`}
              onMouseEnter={() => !option.disabled && setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(index)}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg
                  className={styles.check}
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="m4 10 4 4 8-8" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
