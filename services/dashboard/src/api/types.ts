export type SensorState = "online" | "delayed" | "offline";
export type Metric = "AQI" | "PM2.5" | "Temperature" | "Humidity" | "Noise";
export type AlertSeverity = "Informational" | "Warning" | "Critical";
export type AlertState = "Open" | "Resolved";

export interface SensorReading {
  sensorId: string;
  metric: Metric;
  value: number;
  unit: string;
  observedAt: string;
}

export interface Sensor {
  id: string;
  location: string;
  metrics: Metric[];
  latestReadings: SensorReading[];
  state: SensorState;
  freshnessLabel: string;
  observedAt: string;
}

export interface SensorListQuery {
  location?: string;
  metric?: Metric;
  state?: SensorState;
  cursor?: string;
  limit?: number;
}

export interface SensorListResponse {
  items: Sensor[];
  nextCursor: string | null;
}

export interface SensorDetailResponse {
  sensor: Sensor | null;
}

export interface LatestReadingsQuery {
  location?: string;
  metric?: Metric;
}

export interface LatestReadingsResponse {
  items: Sensor[];
  observedAt: string;
}

export interface HistoricalReadingsQuery {
  from: string;
  to: string;
  location?: string;
  metric?: Metric;
  cursor?: string;
  limit?: number;
}

export interface HistoricalReadingsResponse {
  items: SensorReading[];
  nextCursor: string | null;
}

export interface Alert {
  id: string;
  sensorId: string;
  location: string;
  condition: string;
  severity: AlertSeverity;
  state: AlertState;
  createdAt: string;
  timeLabel: string;
}

export interface AlertListQuery {
  from?: string;
  to?: string;
  severity?: AlertSeverity;
  state?: AlertState;
  cursor?: string;
  limit?: number;
}

export interface AlertListResponse {
  items: Alert[];
  nextCursor: string | null;
}

export type DependencyState = "healthy" | "degraded" | "unavailable";

export interface ServiceHealth {
  name: string;
  state: DependencyState;
  detail: string;
}

export interface HealthResponse {
  status: DependencyState;
  services: ServiceHealth[];
  sensorCoverage: {
    online: number;
    total: number;
    delayed: number;
    onlinePercent: number;
  };
  lastEventFreshness: string;
}

export interface LivenessResponse {
  status: "alive";
}

export interface ReadinessResponse {
  status: "ready" | "not-ready";
  dependencies: ServiceHealth[];
}

export interface IngestReading {
  metric: Metric;
  value: number;
  unit: string;
}

export interface IngestReadingsRequest {
  deviceId: string;
  eventId: string;
  observedAt: string;
  readings: IngestReading[];
}

export interface IngestReadingsResponse {
  accepted: number;
  eventId: string;
}

export interface ApiClient {
  getHealth(): Promise<HealthResponse>;
  listSensors(query?: SensorListQuery): Promise<SensorListResponse>;
  getSensor(sensorId: string): Promise<SensorDetailResponse>;
  getLatestReadings(
    query?: LatestReadingsQuery,
  ): Promise<LatestReadingsResponse>;
  listReadings(
    query: HistoricalReadingsQuery,
  ): Promise<HistoricalReadingsResponse>;
  listAlerts(query?: AlertListQuery): Promise<AlertListResponse>;
  ingestReadings(
    request: IngestReadingsRequest,
  ): Promise<IngestReadingsResponse>;
  getLiveness(): Promise<LivenessResponse>;
  getReadiness(): Promise<ReadinessResponse>;
}
