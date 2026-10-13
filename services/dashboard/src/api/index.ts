import type { ApiClient } from "./types";
import { mockClient } from "./mockClient";
import { HttpApiClient } from "./httpClient";

const runtimeConfig =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};
const apiBaseUrl = runtimeConfig.VITE_API_BASE_URL;
const ingestionBaseUrl = runtimeConfig.VITE_INGESTION_BASE_URL ?? "/ingestion";

export const api: ApiClient =
  apiBaseUrl !== undefined
    ? new HttpApiClient(apiBaseUrl, ingestionBaseUrl)
    : mockClient;
export type { ApiClient } from "./types";
