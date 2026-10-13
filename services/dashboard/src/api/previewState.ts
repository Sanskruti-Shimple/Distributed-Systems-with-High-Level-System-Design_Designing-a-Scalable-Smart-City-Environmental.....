export type PreviewDataState = "data" | "loading" | "empty" | "error";

const states: PreviewDataState[] = ["data", "loading", "empty", "error"];
const listeners = new Set<() => void>();

function isPreviewDataState(value: string | null): value is PreviewDataState {
  return value !== null && states.includes(value as PreviewDataState);
}

function readInitialState(): PreviewDataState {
  if (!import.meta.env.DEV) return "data";

  try {
    const queryValue = new URLSearchParams(window.location.search).get(
      "previewState",
    );
    if (isPreviewDataState(queryValue)) return queryValue;

    const storedValue = window.localStorage.getItem("previewState");
    if (isPreviewDataState(storedValue)) return storedValue;
  } catch {
    return "data";
  }

  return "data";
}

let currentState = readInitialState();

export function getPreviewState(): PreviewDataState {
  return import.meta.env.DEV ? currentState : "data";
}

export function subscribePreviewState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPreviewState(state: PreviewDataState): void {
  if (!import.meta.env.DEV) return;

  currentState = state;
  try {
    window.localStorage.setItem("previewState", state);
    const url = new URL(window.location.href);
    url.searchParams.set("previewState", state);
    window.history.replaceState({}, "", url);
  } catch {
    // State still updates in memory when browser storage is unavailable.
  }

  listeners.forEach((listener) => listener());
}
