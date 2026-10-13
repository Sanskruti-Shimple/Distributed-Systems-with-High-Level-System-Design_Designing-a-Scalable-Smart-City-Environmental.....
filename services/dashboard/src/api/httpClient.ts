import type {
  AlertListQuery,
  AlertListResponse,
  ApiClient,
  HistoricalReadingsQuery,
  HistoricalReadingsResponse,
  HealthResponse,
  LatestReadingsQuery,
  LatestReadingsResponse,
  IngestReadingsRequest,
  IngestReadingsResponse,
  LivenessResponse,
  ReadinessResponse,
  SensorDetailResponse,
  SensorListQuery,
  SensorListResponse,
} from "./types";

function queryString(values: object): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export class HttpApiClient implements ApiClient {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly ingestionBaseUrl: string,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`);
    if (!response.ok)
      throw new Error(`Environmental API returned ${response.status}`);
    return (await response.json()) as T;
  }

  async getHealth(): Promise<HealthResponse> {
    return this.get("/api/health");
  }

  async listSensors(
    query = {} as SensorListQuery,
  ): Promise<SensorListResponse> {
    return this.get(`/api/v1/sensors${queryString(query)}`);
  }

  async getSensor(sensorId: string): Promise<SensorDetailResponse> {
    return this.get(`/api/v1/sensors/${encodeURIComponent(sensorId)}`);
  }

  async getLatestReadings(
    query = {} as LatestReadingsQuery,
  ): Promise<LatestReadingsResponse> {
    return this.get(`/api/v1/readings/latest${queryString(query)}`);
  }

  async listReadings(
    query: HistoricalReadingsQuery,
  ): Promise<HistoricalReadingsResponse> {
    return this.get(`/api/v1/readings${queryString(query)}`);
  }

  async listAlerts(query = {} as AlertListQuery): Promise<AlertListResponse> {
    return this.get(`/api/v1/alerts${queryString(query)}`);
  }

  async ingestReadings(
    request: IngestReadingsRequest,
  ): Promise<IngestReadingsResponse> {
    const response = await fetch(
      `${this.ingestionBaseUrl}/api/v1/ingest/readings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    if (!response.ok)
      throw new Error(`Ingestion service returned ${response.status}`);
    return (await response.json()) as IngestReadingsResponse;
  }

  async getLiveness(): Promise<LivenessResponse> {
    return this.get("/health/live");
  }

  async getReadiness(): Promise<ReadinessResponse> {
    return this.get("/health/ready");
  }
}
