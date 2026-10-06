"use client";
import { useLayoutEffect, useRef, useState } from "react";

export function SlidingIndicator({
  active,
  variant,
}: {
  active: string;
  variant: "rail" | "tab" | "section";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const selected = parent.querySelector<HTMLElement>(
        '[aria-current="page"], [aria-pressed="true"], [aria-selected="true"]',
      );
      if (!selected) {
        setBox(null);
        return;
      }
      const p = parent.getBoundingClientRect();
      const b = selected.getBoundingClientRect();
      setBox({
        x: b.left - p.left + parent.scrollLeft,
        y: b.top - p.top + parent.scrollTop,
        width: b.width,
        height: b.height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    Array.from(parent.children).forEach((child) => {
      if (child !== ref.current) observer.observe(child);
    });
    return () => observer.disconnect();
  }, [active]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`sliding-indicator sliding-${variant}`}
      data-ready={!!box}
      style={
        box
          ? {
              width: box.width,
              height: box.height,
              transform: `translate(${box.x}px, ${box.y}px)`,
            }
          : { opacity: 0 }
      }
    />
  );
}
