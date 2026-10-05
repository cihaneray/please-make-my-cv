"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";

type Snapshot = {
  top: number;
  left: number;
  width: number;
  height: number;
  node: HTMLElement;
};
export function useListMotion(
  ref: RefObject<HTMLDivElement | null>,
  identity: string,
) {
  const previous = useRef(new Map<string, Snapshot>());
  const ghosts = useRef(new Set<HTMLElement>());
  useEffect(() => {
    const nodes = ghosts.current;
    return () => nodes.forEach((node) => node.remove());
  }, []);
  useLayoutEffect(() => {
    const parent = ref.current;
    if (!parent) return;
    const origin = parent.getBoundingClientRect();
    const next = new Map<string, Snapshot>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    parent
      .querySelectorAll<HTMLElement>(":scope > [data-motion-id]")
      .forEach((node) => {
        const key = node.dataset.motionId!;
        const rect = node.getBoundingClientRect();
        const box = {
          top: rect.top - origin.top + parent.scrollTop,
          left: rect.left - origin.left + parent.scrollLeft,
          width: rect.width,
          height: rect.height,
          node,
        };
        next.set(key, box);
        const old = previous.current.get(key);
        if (!reduced && old && Math.abs(old.top - box.top) > 1)
          node.animate(
            [
              { transform: `translateY(${old.top - box.top}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
      });
    if (!reduced)
      previous.current.forEach((old, key) => {
        if (next.has(key)) return;
        const ghost = old.node.cloneNode(true) as HTMLElement;
        old.node
          .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
            "input,textarea",
          )
          .forEach((input, i) => {
            ghost.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
              "input,textarea",
            )[i].value = input.value;
          });
        ghost.removeAttribute("data-motion-id");
        ghost.removeAttribute("id");
        ghost
          .querySelectorAll("[id]")
          .forEach((node) => node.removeAttribute("id"));
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        ghost.classList.add("motion-list-ghost");
        Object.assign(ghost.style, {
          position: "absolute",
          top: `${old.top}px`,
          left: `${old.left}px`,
          width: `${old.width}px`,
          height: `${old.height}px`,
        });
        parent.appendChild(ghost);
        ghosts.current.add(ghost);
        const animation = ghost.animate(
          [{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }],
          { duration: 140, fill: "forwards" },
        );
        animation.onfinish = () => {
          ghost.remove();
          ghosts.current.delete(ghost);
        };
      });
    previous.current = next;
  }, [ref, identity]);
}
export function MotionList({
  children,
  motionKey,
  className,
}: {
  children: ReactNode;
  motionKey: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useListMotion(ref, motionKey);
  return (
    <div ref={ref} className={`motion-list ${className || ""}`}>
      {children}
    </div>
  );
}
