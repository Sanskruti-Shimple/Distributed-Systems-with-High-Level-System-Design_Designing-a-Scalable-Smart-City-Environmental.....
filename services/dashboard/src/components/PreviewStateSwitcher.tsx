import { useSyncExternalStore } from "react";
import { Button, Field, Select } from "@fluentui/react-components";
import {
  setPreviewState,
  subscribePreviewState,
  getPreviewState,
} from "../api/previewState";
import type { PreviewDataState } from "../api/previewState";

const labels: Record<PreviewDataState, string> = {
  data: "Data",
  loading: "Loading",
  empty: "Empty",
  error: "Error",
};

export function usePreviewDataState(): PreviewDataState {
  return useSyncExternalStore(
    subscribePreviewState,
    getPreviewState,
    () => "data",
  );
}

export function PreviewStateSwitcher() {
  const state = usePreviewDataState();
  if (!import.meta.env.DEV) return null;

  return (
    <Field label="Preview data state" className="preview-switcher__field">
      <Select
        aria-label="Preview data state"
        value={state}
        onChange={(_, data) => setPreviewState(data.value as PreviewDataState)}
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Button
        appearance="subtle"
        size="small"
        className="preview-switcher__query-link"
        onClick={() => setPreviewState(state)}
        title="Keep the selected preview state in the URL and local storage"
      >
        {labels[state]}
      </Button>
    </Field>
  );
}
