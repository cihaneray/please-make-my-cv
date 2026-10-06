"use client";
import { useCallback, useReducer, type SetStateAction } from "react";
import { ResumeDocument } from "./types";
type State = {
  document: ResumeDocument | null;
  past: ResumeDocument[];
  future: ResumeDocument[];
  group: Element | null;
  time: number;
  removed: boolean;
};
type Action =
  | {
      type: "edit";
      value: SetStateAction<ResumeDocument | null>;
      group: Element | null;
      time: number;
    }
  | { type: "undo" | "redo" };
const itemCount = (value: unknown): number =>
  Array.isArray(value)
    ? value.length + value.reduce((total, child) => total + itemCount(child), 0)
    : value && typeof value === "object"
      ? Object.values(value).reduce<number>(
          (total, child) => total + itemCount(child),
          0,
        )
      : 0;
const signature = (doc: ResumeDocument) =>
  JSON.stringify({
    ...doc,
    metadata: { ...doc.metadata, revision: 0, updatedAt: "" },
  });
function reducer(state: State, action: Action): State {
  if (action.type !== "edit") {
    const from = action.type === "undo" ? state.past : state.future;
    const next = from.at(-1);
    if (!next || !state.document) return state;
    const document = {
      ...structuredClone(next),
      metadata: {
        ...next.metadata,
        revision: state.document.metadata.revision,
        updatedAt: state.document.metadata.updatedAt,
      },
    };
    return {
      ...state,
      document,
      past:
        action.type === "undo"
          ? state.past.slice(0, -1)
          : [...state.past, state.document].slice(-100),
      future:
        action.type === "redo"
          ? state.future.slice(0, -1)
          : [...state.future, state.document].slice(-100),
      group: null,
      time: 0,
      removed: false,
    };
  }
  const document =
    typeof action.value === "function"
      ? action.value(state.document)
      : action.value;
  if (
    !document ||
    !state.document ||
    document.metadata.id !== state.document.metadata.id
  )
    return {
      document,
      past: [],
      future: [],
      group: null,
      time: 0,
      removed: false,
    };
  if (signature(document) === signature(state.document))
    return { ...state, document, group: null, time: 0 };
  const coalesced =
    action.group &&
    action.group === state.group &&
    action.time - state.time < 800;
  return {
    document,
    past: coalesced ? state.past : [...state.past, state.document].slice(-100),
    future: [],
    group: action.group,
    time: action.time,
    removed: itemCount(document) < itemCount(state.document),
  };
}
export function useDraftHistory() {
  const [state, dispatch] = useReducer(reducer, {
    document: null,
    past: [],
    future: [],
    group: null,
    time: 0,
    removed: false,
  });
  const setDocument = useCallback(
    (value: SetStateAction<ResumeDocument | null>) => {
      const element = window.document.activeElement;
      dispatch({
        type: "edit",
        value,
        group: element?.matches('input:not([type="checkbox"]), textarea')
          ? element
          : null,
        time: Date.now(),
      });
    },
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  return {
    document: state.document,
    setDocument,
    undo,
    redo,
    canUndo: !!state.past.length,
    canRedo: !!state.future.length,
    removed: state.removed,
  };
}
