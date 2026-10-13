# Project Plan

**Status**: In Progress
**Created**: 2026-10-07
**Mode**: NEW
**Execution Mode**: auto

---

## 1. Project Overview

**Goal**: Build a Smart City Environmental Monitoring capstone for Metrovale, with validated IoT ingestion, reliable Kafka-compatible event delivery, stateful Flink processing, Azure SQL metadata, Azure Data Explorer time-series analytics, a documented REST API, and a responsive React dashboard. Include secure AKS deployment, observability, cost controls, Terraform, GitHub Actions, architecture documentation, and a demo walkthrough/interview script. Every module is independently testable.

**App Type**: SPA + API

**API Login**: No

**Mode**: NEW

**Deployment Plan**: No deployment plan found

The Azure deployment is a short-lived demonstration, not an always-on environment. Keep the Azure region as a deployment-time choice. Treat the selected $50-$200/month budget as a ceiling to validate, not a guaranteed cost: AKS and Azure Data Explorer sizing can exceed it, so use small demo SKUs, schedule a short run, set a budget alert, and tear down resources after demonstrations.

---

## 2. IoT Ingestion Service — Backend

| Component           | Technology            |
| ------------------- | --------------------- |
| **Language**        | Python                |
| **Framework**       | FastAPI + Pydantic v2 |
| **Runtime**         | CPython 3.12          |
| **Package Manager** | pip                   |
| **Test Runner**     | pytest                |
| **Mocking Library** | unittest.mock         |
| **Test Command**    | pytest -q             |
| **Orchestration**   | docker-compose        |

Accept documented HTTP sensor submissions; validate device identity, payload schema, timestamps, units, and metric-specific ranges; publish versioned events to the Kafka-compatible broker; use bounded retries, idempotency keys, backpressure, and a quarantine topic for poison messages. Expose liveness/readiness endpoints and ingestion counters. Do not add human-user login.

---

## 3. Stream Processing Worker — Worker

| Component           | Technology                        |
| ------------------- | --------------------------------- |
| **Language**        | Python                            |
| **Framework**       | Apache Flink (PyFlink)            |
| **Runtime**         | CPython 3.12 + Apache Flink 1.20+ |
| **Package Manager** | pip                               |
| **Test Runner**     | pytest                            |
| **Mocking Library** | unittest.mock                     |
| **Test Command**    | pytest -q                         |
| **Orchestration**   | docker-compose                    |

Consume sensor events with checkpoints and event-time watermarks; filter invalid/out-of-range readings; deduplicate by device and event ID; calculate location/metric windows; detect threshold anomalies; and write time-series results to Azure Data Explorer plus metadata/health summaries to Azure SQL where appropriate. Use at-least-once delivery with idempotent writes, expose consumer lag and checkpoint health, and test transformations independently from Azure clients.

---

## 4. REST API — Backend

| Component           | Technology            |
| ------------------- | --------------------- |
| **Language**        | Python                |
| **Framework**       | FastAPI + Pydantic v2 |
| **Runtime**         | CPython 3.12          |
| **Package Manager** | pip                   |
| **Test Runner**     | pytest                |
| **Mocking Library** | unittest.mock         |
| **Test Command**    | pytest -q             |
| **Orchestration**   | docker-compose        |

Provide bounded, validated endpoints for sensor metadata, latest and historical readings, location/metric filters, trends, and alert summaries. Read device/location metadata from Azure SQL and time-series data from Azure Data Explorer. Use managed identity in Azure, Key Vault for deployment secrets, parameterized queries, bounded time windows, pagination, and consistent error responses. Human user login remains disabled.

---

## 5. Smart City Dashboard — Frontend

| Component           | Technology   |
| ------------------- | ------------ |
| **Language**        | TypeScript   |
| **Framework**       | React + Vite |
| **Package Manager** | npm          |
| **Test Runner**     | vitest       |
| **Mocking Library** | vi.mock      |
| **Test Command**    | npm test     |

---

## 6. Services Required

| Azure Service                                                           | Role in App                                                                                    | Environment Variable                    | Default Value (Local)                                                                                                       | Classification |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Azure Kubernetes Service (AKS)                                          | Run the ingestion API, Flink worker, REST API, and dashboard as container workloads            | `TF_VAR_aks_name`                       | `smartcity-demo-aks`                                                                                                        | Essential      |
| Azure Container Registry                                                | Store versioned service images for AKS deployment                                              | `TF_VAR_acr_name`                       | `smartcitydemo<unique-suffix>`                                                                                              | Essential      |
| Azure Event Hubs (Standard, Kafka endpoint)                             | Durable partitioned sensor-event stream between ingestion and Flink                            | `EVENTHUBS_BOOTSTRAP_SERVERS`           | `localhost:9092` (Redpanda in local Compose)                                                                                | Essential      |
| Azure SQL Database                                                      | Sensor, device, location, and threshold metadata                                               | `SQL_CONNECTION_STRING`                 | `Server=localhost,1433;Database=smartcity;User Id=sa;Password=${SQL_SA_PASSWORD};Encrypt=False;TrustServerCertificate=True` | Essential      |
| Azure Data Explorer                                                     | Time-series readings, window aggregates, and anomaly queries                                   | `ADX_CLUSTER_URI`                       | Empty; local tests use a mocked ADX adapter                                                                                 | Essential      |
| Azure Key Vault                                                         | Hold production secrets and device credentials; workloads access secrets with managed identity | `KEY_VAULT_URI`                         | Empty; inject local-only values from an untracked `.env` file                                                               | Essential      |
| Azure Monitor (Log Analytics, Application Insights, managed Prometheus) | Central logs, traces, service health, processing lag, and AKS metrics                          | `APPLICATIONINSIGHTS_CONNECTION_STRING` | Empty; local telemetry uses `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`                                             | Enhancement    |
| Azure Cost Management budget                                            | Alert before demo spend reaches the selected monthly ceiling                                   | `TF_VAR_monthly_budget_usd`             | `150`                                                                                                                       | Enhancement    |

The local Compose stack substitutes Redpanda for the Event Hubs Kafka endpoint and a SQL Server container for Azure SQL. Unit/component tests use an ADX adapter mock; Azure integration tests target a short-lived real ADX cluster. Do not put production secrets in source control or container images. Configure Azure resources and workload identity through Terraform, and keep all resource SKUs and region parameters visible for cost review.

---

## 7. Prerequisites

### Run

| Tool      | Service(s)                                | Installed | Version                                                                 |
| --------- | ----------------------------------------- | --------- | ----------------------------------------------------------------------- |
| Python    | iot-ingestion, stream-processor, rest-api | ✅        | 3.14.3 detected; install/use CPython 3.12 for the planned PyFlink stack |
| pip       | iot-ingestion, stream-processor, rest-api | ✅        | 25.3 (paired with detected Python 3.14)                                 |
| Node.js   | dashboard                                 | ✅        | v22.22.1                                                                |
| npm       | dashboard                                 | ✅        | 10.9.4                                                                  |
| Terraform | \*                                        | ✅        | v1.16.2                                                                 |
| Azure CLI | \*                                        | ✅        | 2.90.0                                                                  |
| kubectl   | \*                                        | ✅        | v1.34.1                                                                 |
| Helm      | \*                                        | ✅        | v4.3.0                                                                  |
| Git       | \*                                        | ✅        | 2.49.0.windows.1                                                        |

### Debug

| Tool           | Service(s)                                | Installed | Version                                                              |
| -------------- | ----------------------------------------- | --------- | -------------------------------------------------------------------- |
| Docker         | iot-ingestion, stream-processor, rest-api | ❓        | CLI 29.2.1 detected; Docker Desktop engine is not running/accessible |
| Docker Compose | iot-ingestion, stream-processor, rest-api | ✅        | v5.1.0                                                               |
| Google Chrome  | dashboard                                 | ✅        | 154.0.8037.98                                                        |

Verify the unknown Docker engine status and start Docker Desktop before running local emulators or Compose workflows. Install/select CPython 3.12 for PyFlink compatibility; the detected 3.14 installation is not the planned runtime. Recheck these prerequisites in the initialized development environment before scaffolding or local execution.

---

## 8. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A crisp civic-operations console for scanning city conditions quickly: daylight-neutral surfaces, deep teal navigation and primary actions, restrained signal-rust for alerts, compact tables, and clear freshness/status indicators. Use 4px corners, fine dividers, and restrained elevation rather than nested cards.
**Typography**: IBM Plex Sans, Segoe UI Variable, sans-serif

### Color Palette

| Token     | Hex       | Usage                                                               |
| --------- | --------- | ------------------------------------------------------------------- |
| `primary` | `#135E58` | City navigation, selected filters, primary actions, and chart focus |
| `accent`  | `#B64F32` | Threshold breaches, critical highlights, and secondary emphasis     |
| `surface` | `#F4F7F5` | Dashboard canvas and unframed page regions                          |
| `text`    | `#1C302D` | Sensor names, readings, table content, and page headings            |
| `muted`   | `#657672` | Units, timestamps, help text, and secondary metadata                |
| `border`  | `#D5DFDA` | Table rules, filter boundaries, and compact panel outlines          |

### Pages

| Page                   | Route      | Purpose                                                                                                     | Layout                                                |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| City Overview          | `/`        | Scan current city air quality, sensor coverage, event freshness, and the latest readings.                   | `header, nav, hero, main, grid, table, footer`        |
| Sensor Explorer        | `/sensors` | Filter the sensor registry by location, metric, and operational state; inspect freshness and last readings. | `header, nav, form, main, table, footer`              |
| Alerts & System Health | `/alerts`  | Review threshold anomalies and pipeline health, with clear degraded, empty, and retry states.               | `header, nav, hero, main, tabs, table, empty, footer` |

### Sample Content

City Overview — Metrovale snapshot:
| Metric / sensor | Location | Latest value | State / freshness |
|-----------------|----------|--------------|-------------------|
| City air quality | Metrovale | AQI 42 | Good, updated 12 sec ago |
| Fine particles | Civic Center, Downtown | PM2.5 8.7 ug/m3 | Normal |
| Sensor coverage | 47 of 49 sensors | 96% online | 2 sensors delayed |
| MV-021 | Civic Center, Downtown | AQI 42; PM2.5 8.7 ug/m3 | Online, 12 sec ago |
| MV-034 | Riverside Park | 22.4 C; humidity 48% | Online, 19 sec ago |
| MV-048 | East Market | PM2.5 36.2 ug/m3 | Delayed, 4 min ago |

Sensor Explorer — sensor:
| Sensor ID | Location | Metrics | Latest reading | State |
|-----------|----------|---------|----------------|-------|
| MV-021 | Civic Center, Downtown | AQI, PM2.5 | AQI 42; 8.7 ug/m3 | Online |
| MV-034 | Riverside Park | Temperature, humidity | 22.4 C; 48% | Online |
| MV-048 | East Market | AQI, PM2.5 | 36.2 ug/m3 | Delayed 4 min |

Alerts & System Health — alert:
| Alert ID | Sensor / location | Condition | Severity | State |
|----------|-------------------|-----------|----------|-------|
| ALT-104 | MV-048, East Market | PM2.5 36.2 ug/m3; limit 35 | Warning | Open, 10:42 |
| ALT-103 | MV-017, West Station | Noise 78 dBA; limit 75 | Critical | Open, 10:39 |
| ALT-101 | MV-034, Riverside Park | Temperature 31.8 C | Informational | Resolved, 09:58 |

Alert page states: the active alert query can show an inline retry banner when Azure Data Explorer is unavailable; the resolved-alert tab may show an empty state when no resolved alerts match the selected window. The Sensor Explorer's latest-reading panel shows CSS skeleton rows while its refresh is in flight. Filters: Location = All locations; Metric = All metrics; State = Any state; Time window = Last 24 hours.

---

## 9. Project Structure

```text
smart-city-environmental-monitoring/
├── .azure/
│   └── project-plan.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-demo.yml
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── data-contracts.md
│   ├── operations-and-cost.md
│   ├── walkthrough.md
│   └── interview-script.md
├── infra/
│   └── terraform/
│       ├── modules/
│       │   ├── aks/
│       │   ├── data/
│       │   ├── event-hubs/
│       │   └── observability/
│       └── environments/
│           └── demo/
├── deploy/
│   ├── helm/
│   │   └── smart-city/
│   └── dashboards/
├── contracts/
│   ├── events/
│   │   └── sensor-reading.schema.json
│   └── openapi.yaml
├── services/
│   ├── iot-ingestion/
│   │   ├── src/
│   │   └── tests/
│   ├── stream-processor/
│   │   ├── src/
│   │   └── tests/
│   ├── rest-api/
│   │   ├── src/
│   │   └── tests/
│   └── dashboard/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   └── pages/
│       └── tests/
├── shared/
│   ├── python/
│   │   └── sensor_contracts/
│   └── typescript/
│       └── api-client/
└── tools/
    └── sensor-simulator/
```

---

## 10. Route Definitions

| #   | Method | Path                         | Description                                                                                      | Request Body                                    | Response Body              | Status Codes                      |
| --- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------- | --------------------------------- |
| 1   | GET    | `/api/health`                | REST API health and dependency summary                                                           | —                                               | `{ status, services }`     | 200, 503                          |
| 2   | GET    | `/api/v1/sensors`            | List sensors with optional location, metric, and state filters; bounded pagination               | —                                               | `{ items, nextCursor }`    | 200, 422, 500                     |
| 3   | GET    | `/api/v1/sensors/{sensorId}` | Read one sensor and its metadata from Azure SQL                                                  | —                                               | `{ sensor }`               | 200, 404, 500                     |
| 4   | GET    | `/api/v1/readings/latest`    | Latest readings, optionally filtered by location and metric                                      | —                                               | `{ items, observedAt }`    | 200, 422, 502, 503                |
| 5   | GET    | `/api/v1/readings`           | Query historical readings with required bounded `from`/`to`, location, metric, and page limit    | —                                               | `{ items, nextCursor }`    | 200, 400, 422, 502, 503           |
| 6   | GET    | `/api/v1/alerts`             | List threshold anomalies by time window, severity, and state                                     | —                                               | `{ items, nextCursor }`    | 200, 422, 502, 503                |
| 7   | POST   | `/api/v1/ingest/readings`    | Validate and publish a sensor batch to the event stream; enforce device identity and idempotency | `{ deviceId, eventId, observedAt, readings[] }` | `{ accepted, eventId }`    | 202, 400, 401, 409, 422, 429, 503 |
| 8   | GET    | `/health/live`               | Container liveness probe for each service                                                        | —                                               | `{ status }`               | 200                               |
| 9   | GET    | `/health/ready`              | Readiness probe including required broker/database connectivity                                  | —                                               | `{ status, dependencies }` | 200, 503                          |

All API errors use `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": null } }`; use 422 for schema validation, 404 for missing sensors, 429 for ingestion throttling, and 5xx for dependency failures. Bound time-series query windows and response sizes to protect the API and Azure Data Explorer spend.

---

## 11. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification. Keep the deployment short-lived, validate actual AKS and Azure Data Explorer costs against the $50-$200/month ceiling, configure budget alerts, choose the region at deployment, and tear down after demos.
