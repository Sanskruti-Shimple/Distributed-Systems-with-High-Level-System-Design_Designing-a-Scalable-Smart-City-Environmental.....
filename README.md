# Metrovale Environmental Monitoring

A Smart City capstone with validated sensor ingestion, Kafka-compatible event streaming, an idempotent threshold processor, REST query API, and React dashboard. The project provides a local Compose demo and a short-lived Azure AKS target.

## Start locally

Prerequisite: Docker Desktop with Compose.

```powershell
docker compose up --build
```

Open the dashboard at `http://localhost:8080`, API docs at `http://localhost:8001/docs`, and ingestion docs at `http://localhost:8000/docs`. The simulator sends synthetic events for four devices every five seconds. Redpanda is exposed at `localhost:19092`; the SQLite read model persists in a Docker volume. Stop with Ctrl+C; remove local event/read-model data with `docker compose down -v`.

## Tests

```powershell
$env:PYTHONPATH = (Resolve-Path 'services\shared\python').Path + ';' + (Resolve-Path 'services\iot-ingestion').Path + ';' + (Resolve-Path 'services\stream-processor').Path + ';' + (Resolve-Path 'services\rest-api').Path
python -m pytest -q services\shared\python\tests services\iot-ingestion\tests services\stream-processor\tests services\rest-api\tests
Push-Location services\dashboard
npm install
npm test
npm run build
Pop-Location
```

## Azure demo

Review [architecture](docs/architecture.md), [data contracts](docs/data-contracts.md), and [operations and cost](docs/operations-and-cost.md). Select a region and review pricing before provisioning. Terraform creates chargeable resources; inspect `terraform plan` and destroy the demo after the walkthrough. Use private encrypted Terraform state because it can contain sensitive values.

Copy `infra/terraform/terraform.tfvars.example` to `terraform.tfvars`, set a real budget notification email, SQL bootstrap password, and Microsoft Entra SQL administrator, then run `terraform init`, `terraform validate`, and `terraform plan`. After apply, run `infra/sql/schema.sql` and `infra/sql/grant-application-identity.sql` against Azure SQL, then run `infra/adx/schema.kql` against the `smartcity` Data Explorer database. The grant script must use the `workload_identity_object_id` Terraform output. Configure the GitHub Environment variables documented in `docs/operations-and-cost.md` before dispatching the deployment workflow. Do not apply until you have reviewed region availability, quotas, and current costs.

GitHub Actions runs test/build/validation on push and PR. Configure GitHub OIDC, required variables, and protected staging/production environments before using the manual deployment workflow.

Branching: `main` is the protected integration branch; use short-lived `feature/<topic>` branches and pull requests for changes. Use protected GitHub Environments for staging and production approvals; deploy immutable image tags from reviewed commits.

## Deliverables

- Architecture and flows: `docs/architecture.md`
- Event and REST contracts: `docs/data-contracts.md`, `contracts/events/sensor-reading.schema.json`
- Relational schema: `infra/sql/schema.sql`
- Operations, security, observability, cost: `docs/operations-and-cost.md`
- 12-minute walkthrough: `docs/walkthrough.md`
- Follow-up interview prompts: `docs/interview-script.md`
- Terraform: `infra/terraform/`
- AKS Helm chart: `deploy/helm/smart-city/`
- CI/CD: `.github/workflows/`

## Implementation boundaries

The local path runs Redpanda and SQLite. In AKS, the shared adapter uses Azure SQL with a Microsoft Entra token and Azure Data Explorer for time-series ingestion and queries; Event Hubs uses its Kafka endpoint with SASL, and Key Vault CSI supplies the broker/device secrets. SQL and ADX schemas and the SQL contained-user grant are explicit bootstrap steps above. The stream processor is a Python Kafka consumer with manual commits, dead-letter routing, idempotency, and threshold alerts; it is not a checkpointed PyFlink job. Terraform provisions Log Analytics and Application Insights, but application telemetry exporters and service-level alert rules still need configuration. Azure resources are not provisioned automatically by this repository setup.
