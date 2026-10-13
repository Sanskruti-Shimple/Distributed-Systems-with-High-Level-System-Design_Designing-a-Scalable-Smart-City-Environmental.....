# Data Contracts

## Sensor events

Topic: `sensor-readings`; partition key: `deviceId`; content type: JSON; schema: `contracts/events/sensor-reading.schema.json`. Delivery is at least once. Consumers deduplicate `(deviceId, eventId)`. Invalid broker messages go to `sensor-readings-dead-letter` with original key and bytes.

```json
{
  "deviceId": "MV-021",
  "eventId": "e3af9b3c-8b6d-4d40-9e48-0d0e18b4c179",
  "observedAt": "2026-10-07T10:43:48Z",
  "location": "Civic Center, Downtown",
  "readings": [
    { "metric": "AQI", "value": 42, "unit": "AQI" },
    { "metric": "PM2.5", "value": 8.7, "unit": "ug/m3" }
  ]
}
```

Supported bounds: AQI 0-500, PM2.5 0-1000 ug/m3, temperature -50-80 C, humidity 0-100%, noise 0-200 dBA. `observedAt` must include a timezone.

## REST API

OpenAPI is exposed at `/openapi.json` on the API service.

| Method | Path                            | Purpose                                             |
| ------ | ------------------------------- | --------------------------------------------------- |
| GET    | `/api/health`                   | Dependency and sensor coverage summary              |
| GET    | `/api/v1/sensors`               | Filtered, paginated sensor registry                 |
| GET    | `/api/v1/sensors/{sensorId}`    | Sensor and latest values                            |
| GET    | `/api/v1/readings/latest`       | Latest values with optional location/metric filters |
| GET    | `/api/v1/readings?from=&to=`    | Bounded history; maximum 30 days                    |
| GET    | `/api/v1/alerts`                | Threshold anomalies                                 |
| POST   | `/api/v1/ingest/readings`       | Validate and enqueue an event                       |
| GET    | `/health/live`, `/health/ready` | Kubernetes probes                                   |

Ingestion returns HTTP 202 only after broker acknowledgement. Local Compose sets `DEVICE_TOKENS` from `.env`; AKS reads a generated per-deployment token from Key Vault via CSI. This shared demo token is suitable only for a capstone; production should provision and rotate per-device credentials.
