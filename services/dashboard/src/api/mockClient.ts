import { getPreviewState } from "./previewState";
import { alerts, health, sensors } from "./mockData";
import type {
  AlertListQuery,
  AlertListResponse,
  ApiClient,
  HistoricalReadingsQuery,
  HistoricalReadingsResponse,
  LatestReadingsQuery,
  LatestReadingsResponse,
  ReadinessResponse,
  Sensor,
  SensorListQuery,
  SensorListResponse,
} from "./types";

function respond<T>(data: T, empty: () => T): Promise<T> {
  const state = getPreviewState();
  if (state === "loading") return new Promise<T>(() => undefined);
  if (state === "error")
    return Promise.reject(
      new Error("The environmental data service is temporarily unavailable."),
    );
  return Promise.resolve(state === "empty" ? empty() : data);
}

function filterSensors(query: SensorListQuery = {}): Sensor[] {
  return sensors.filter((sensor) => {
    const locationMatch = !query.location || sensor.location === query.location;
    const metricMatch = !query.metric || sensor.metrics.includes(query.metric);
    const stateMatch = !query.state || sensor.state === query.state;
    return locationMatch && metricMatch && stateMatch;
  });
}

function filterLatest(query: LatestReadingsQuery = {}): Sensor[] {
  return filterSensors({ location: query.location, metric: query.metric });
}

function filterAlerts(query: AlertListQuery = {}): AlertListResponse {
  const matching = alerts.filter((alert) => {
    const stateMatch = !query.state || alert.state === query.state;
    const severityMatch = !query.severity || alert.severity === query.severity;
    const fromMatch = !query.from || alert.createdAt >= query.from;
    const toMatch = !query.to || alert.createdAt <= query.to;
    return stateMatch && severityMatch && fromMatch && toMatch;
  });
  return { items: matching, nextCursor: null };
}

function filterReadings(
  query: HistoricalReadingsQuery,
): HistoricalReadingsResponse {
  const readings = sensors
    .filter((sensor) => !query.location || sensor.location === query.location)
    .flatMap((sensor) => sensor.latestReadings)
    .filter((reading) => !query.metric || reading.metric === query.metric);
  return { items: readings, nextCursor: null };
}

export const mockClient: ApiClient = {
  getHealth: () => respond(health, () => ({ ...health, services: [] })),
  listSensors: (query) => {
    const result: SensorListResponse = {
      items: filterSensors(query),
      nextCursor: null,
    };
    return respond(result, () => ({ items: [], nextCursor: null }));
  },
  getSensor: (sensorId) => {
    const sensor = sensors.find((item) => item.id === sensorId) ?? null;
    return respond({ sensor }, () => ({ sensor: null }));
  },
  getLatestReadings: (query) => {
    const result: LatestReadingsResponse = {
      items: filterLatest(query),
      observedAt: "2026-10-07T10:44:00Z",
    };
    return respond(result, () => ({
      items: [],
      observedAt: "2026-10-07T10:44:00Z",
    }));
  },
  listReadings: (query) =>
    respond(filterReadings(query), () => ({ items: [], nextCursor: null })),
  listAlerts: (query) =>
    respond(filterAlerts(query), () => ({ items: [], nextCursor: null })),
  ingestReadings: (request) =>
    respond(
      { accepted: request.readings.length, eventId: request.eventId },
      () => ({ accepted: 0, eventId: request.eventId }),
    ),
  getLiveness: () => respond({ status: "alive" }, () => ({ status: "alive" })),
  getReadiness: () => {
    const result: ReadinessResponse = {
      status: "ready",
      dependencies: health.services,
    };
    return respond(result, () => ({ status: "not-ready", dependencies: [] }));
  },
};
