import type { Alert, HealthResponse, Sensor } from "./types";

export const sensors: Sensor[] = [
  {
    id: "MV-021",
    location: "Civic Center, Downtown",
    metrics: ["AQI", "PM2.5"],
    latestReadings: [
      {
        sensorId: "MV-021",
        metric: "AQI",
        value: 42,
        unit: "AQI",
        observedAt: "2026-10-07T10:43:48Z",
      },
      {
        sensorId: "MV-021",
        metric: "PM2.5",
        value: 8.7,
        unit: "ug/m3",
        observedAt: "2026-10-07T10:43:48Z",
      },
    ],
    state: "online",
    freshnessLabel: "12 sec ago",
    observedAt: "2026-10-07T10:43:48Z",
  },
  {
    id: "MV-034",
    location: "Riverside Park",
    metrics: ["Temperature", "Humidity"],
    latestReadings: [
      {
        sensorId: "MV-034",
        metric: "Temperature",
        value: 22.4,
        unit: "C",
        observedAt: "2026-10-07T10:43:41Z",
      },
      {
        sensorId: "MV-034",
        metric: "Humidity",
        value: 48,
        unit: "%",
        observedAt: "2026-10-07T10:43:41Z",
      },
    ],
    state: "online",
    freshnessLabel: "19 sec ago",
    observedAt: "2026-10-07T10:43:41Z",
  },
  {
    id: "MV-048",
    location: "East Market",
    metrics: ["AQI", "PM2.5"],
    latestReadings: [
      {
        sensorId: "MV-048",
        metric: "PM2.5",
        value: 36.2,
        unit: "ug/m3",
        observedAt: "2026-10-07T10:39:48Z",
      },
    ],
    state: "delayed",
    freshnessLabel: "4 min ago",
    observedAt: "2026-10-07T10:39:48Z",
  },
];

export const alerts: Alert[] = [
  {
    id: "ALT-104",
    sensorId: "MV-048",
    location: "East Market",
    condition: "PM2.5 36.2 ug/m3; limit 35",
    severity: "Warning",
    state: "Open",
    createdAt: "2026-10-07T10:42:00Z",
    timeLabel: "10:42",
  },
  {
    id: "ALT-103",
    sensorId: "MV-017",
    location: "West Station",
    condition: "Noise 78 dBA; limit 75",
    severity: "Critical",
    state: "Open",
    createdAt: "2026-10-07T10:39:00Z",
    timeLabel: "10:39",
  },
  {
    id: "ALT-101",
    sensorId: "MV-034",
    location: "Riverside Park",
    condition: "Temperature 31.8 C",
    severity: "Informational",
    state: "Resolved",
    createdAt: "2026-10-07T09:58:00Z",
    timeLabel: "09:58",
  },
];

export const health: HealthResponse = {
  status: "healthy",
  services: [
    {
      name: "Ingestion API",
      state: "healthy",
      detail: "Receiving sensor events",
    },
    {
      name: "Stream processor",
      state: "healthy",
      detail: "Checkpoints current",
    },
    {
      name: "Event stream",
      state: "healthy",
      detail: "Consumer lag within target",
    },
    {
      name: "Time-series store",
      state: "healthy",
      detail: "Queries responding",
    },
  ],
  sensorCoverage: { online: 47, total: 49, delayed: 2, onlinePercent: 96 },
  lastEventFreshness: "12 sec ago",
};
