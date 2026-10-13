# 12-Minute Walkthrough

## 0:00-1:30 | Problem and requirements

Metrovale needs near-real-time visibility into air quality, particles, temperature, humidity, and noise. Devices produce independent streams; operators need city status, sensor health, history, and threshold alerts. The goals are burst absorption, low latency, at-least-once delivery, idempotent processing, and bounded queries. Human login is outside this learning demo.

## 1:30-4:00 | Architecture and data flow

Show `architecture.md`. Devices post versioned JSON to FastAPI. Ingestion validates identity, timezone, units, and ranges, then publishes with device ID as the Kafka key. Redpanda is the local broker; Event Hubs Kafka endpoint is the Azure target. A consumer deduplicates, stores readings, and emits threshold alerts. The API serves the React overview, sensor explorer, and alert views.

## 4:00-6:00 | Messaging and processing

The broker decouples sensor throughput from consumers, allows replay, and supports partition parallelism. Show dead-letter routing, commit-after-write, idempotency, and reconnect behavior. The local consumer demonstrates stream processing but is not a PyFlink cluster; production follow-up is event-time windows, checkpoints, and managed sinks.

## 6:00-8:00 | Storage and API

Local SQLite WAL keeps the demo portable. In AKS, Azure SQL stores sensor/location metadata and alerts while ADX stores readings; the app uses the federated workload identity. The SQL and KQL bootstrap scripts must be applied once. The API bounds historical queries to 30 days and paginates. Open `/docs` and demonstrate health, sensors, history, and alerts.

## 8:00-9:30 | Live dashboard

Show overview, sensor explorer, and alerts. Let the simulator submit events, then refresh to see current readings and any threshold alerts. The dashboard uses the real API when configured and mock data for UI previews/tests.

## 9:30-11:00 | Containers, AKS, CI/CD, security

Show Compose, Dockerfiles, Helm limits/HPA, restricted namespace, Azure RBAC, ACR identity, Key Vault, and GitHub OIDC. CI tests Python, TypeScript, and Terraform. Deployment is manual; production approval is configured in GitHub Environment settings.

## 11:00-12:00 | Monitoring, cost, trade-offs

Show Terraform resources and monthly budget notifications. Discuss cost variability and teardown. Mention horizontal scale, broker replay, eventual consistency, the current non-Flink consumer, and the remaining telemetry/alert-rule work.

## Demo commands

```powershell
docker compose up --build
```

Open `http://localhost:8080`, `http://localhost:8001/docs`, and `http://localhost:8000/docs`. Stop and remove state with `docker compose down -v`.
