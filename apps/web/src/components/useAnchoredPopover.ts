"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Keep an auto popover in the top layer and within the visible viewport. */
export function useAnchoredPopover({
  width = 280,
  maxHeight = 320,
  align = "left",
}: {
  width?: number;
  maxHeight?: number;
  align?: "left" | "right";
} = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;
    const sync = (event: Event) =>
      setOpen((event as ToggleEvent).newState === "open");
    popup.addEventListener("toggle", sync);
    return () => popup.removeEventListener("toggle", sync);
  }, []);

  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;
    if (open && !popup.matches(":popover-open")) popup.showPopover();
    if (!open && popup.matches(":popover-open")) popup.hidePopover();
    if (!open) return;
    const position = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const margin = 8;
      const gap = 6;
      const rect = trigger.getBoundingClientRect();
      const popupWidth = Math.max(
        0,
        Math.min(Math.max(rect.width, width), viewportWidth - margin * 2),
      );
      popup.style.width = `${popupWidth}px`;
      popup.style.maxHeight = `${Math.min(maxHeight, viewportHeight - margin * 2)}px`;
      const belowRoom = Math.max(
        0,
        viewportTop + viewportHeight - rect.bottom - margin - gap,
      );
      const aboveRoom = Math.max(0, rect.top - viewportTop - margin - gap);
      const below =
        belowRoom >= popup.getBoundingClientRect().height ||
        belowRoom >= aboveRoom;
      popup.style.maxHeight = `${Math.min(maxHeight, below ? belowRoom : aboveRoom)}px`;
      const height = popup.getBoundingClientRect().height;
      const wantedLeft =
        align === "right" ? rect.right - popupWidth : rect.left;
      popup.style.left = `${Math.max(viewportLeft + margin, Math.min(wantedLeft, viewportLeft + viewportWidth - popupWidth - margin))}px`;
      const wantedTop = below ? rect.bottom + gap : rect.top - height - gap;
      popup.style.top = `${Math.max(viewportTop + margin, Math.min(wantedTop, viewportTop + viewportHeight - height - margin))}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const observer = new ResizeObserver(position);
    observer.observe(popup);
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      observer.disconnect();
    };
  }, [open, width, maxHeight, align]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !popupRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return { open, setOpen, triggerRef, popupRef };
}
