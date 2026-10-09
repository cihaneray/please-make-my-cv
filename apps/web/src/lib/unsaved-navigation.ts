"use client";
import { useEffect } from "react";
let guard = () => true;
export const canNavigate = () => guard();
export function useUnsavedNavigation(dirty: boolean, message: string) {
  useEffect(() => {
    guard = () => !dirty || window.confirm(message);
    const url = window.location.href,
      state = window.history.state;
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        event.ctrlKey ||
        event.metaKey ||
        anchor.href.split("#")[0] === window.location.href.split("#")[0] ||
        new URL(anchor.href).origin !== window.location.origin
      )
        return;
      if (!guard()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const pop = (event: PopStateEvent) => {
      if (window.location.href === url || guard()) return;
      event.stopImmediatePropagation();
      window.history.pushState(state, "", url);
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("popstate", pop, true);
    document.addEventListener("click", click, true);
    return () => {
      guard = () => true;
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", pop, true);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, message]);
}
