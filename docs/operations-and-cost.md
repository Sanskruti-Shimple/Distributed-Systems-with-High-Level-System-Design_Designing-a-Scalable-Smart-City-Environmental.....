# Operations, Security, and Cost

## Local demo

Prerequisite: Docker Desktop with Compose. Run `docker compose up --build`; dashboard: `http://localhost:8080`, API docs: `http://localhost:8001/docs`, ingestion docs: `http://localhost:8000/docs`, Kafka: `localhost:19092`. The simulator sends synthetic readings every five seconds. Stop with Ctrl+C; `docker compose down -v` removes local event and read-model data.

## Azure short-lived demo

1. Check the selected region supports AKS, Event Hubs, SQL, Data Explorer, Key Vault, and Log Analytics; verify quotas and current prices.
2. Copy `infra/terraform/terraform.tfvars.example` to an untracked `terraform.tfvars`; set a real budget contact email, strong one-time SQL bootstrap password, and the Entra SQL administrator UPN/object ID using a secure local mechanism.
3. Run `terraform init`, `terraform validate`, inspect `terraform plan`, and review cost and network exposure before apply.
4. Apply `infra/sql/schema.sql`, then run `infra/sql/grant-application-identity.sql` after replacing its identity object ID with Terraform's `workload_identity_object_id` output. Run `infra/adx/schema.kql` against the provisioned `smartcity` database.
5. Configure GitHub OIDC and staging/production environments; protect production with required reviewers. Set environment variables `AZURE_RESOURCE_GROUP`, `AKS_CLUSTER_NAME`, `ACR_LOGIN_SERVER`, `EVENTHUB_BOOTSTRAP_SERVERS`, `AZURE_SQL_SERVER`, `ADX_CLUSTER_URI`, `ADX_INGEST_URI`, `AZURE_TENANT_ID`, `WORKLOAD_IDENTITY_CLIENT_ID`, and `KEY_VAULT_NAME` from Terraform outputs.
6. Deploy and verify dashboard, ingestion, SQL, and ADX. Destroy resources after the demo.

Terraform state contains sensitive values, including the bootstrap SQL password and broker connection strings. Use a private encrypted remote backend, restrict state access, and rotate bootstrap credentials after provisioning. Never commit state, populated tfvars, kubeconfig, `.env`, or tokens.

## Security checklist

- AKS Azure RBAC and restricted Pod Security admission are enabled.
- Containers run non-root, drop Linux capabilities, disable privilege escalation, and define resource bounds.
- ACR admin credentials are disabled; AKS image pull uses its managed identity.
- Key Vault uses RBAC, soft delete, purge protection, workload identity, and CSI-mounted Event Hubs/device secrets. Azure SQL and ADX use the AKS federated workload identity; the SQL contained user must be bootstrapped with the provided grant script.
- Keep SQL firewall closed by default; use only temporary operator IP rules if needed.
- Use TLS 1.2+, least-privileged Event Hubs credentials, and rotate device tokens.
- Use GitHub OIDC, not long-lived Azure client secrets; require human approval for production.
- The dashboard has no user login by design. Do not expose it to real operators without Entra ID or an equivalent identity-aware gateway.

## Monitoring and cost

Terraform configures AKS container logs to Log Analytics and creates Application Insights. The application does not yet export OpenTelemetry traces/metrics to Application Insights, and service-level alert rules are not provisioned; configure alerts for API availability, 5xx rate, p95 latency, ingestion failures, consumer lag, dead-letter count, CPU/memory saturation, and SQL/ADX throttling before operational use. The Terraform budget sends notifications but does not cap spend or stop resources.

The resource-group budget sends notifications; it does not cap spend or stop resources. AKS nodes, public load balancers, and an ADX D11 cluster can exceed $50-$200/month if left on. Use Azure Pricing Calculator for the chosen region and SKUs before apply; cost varies with region, currency, discounts, and usage. Run only during the demo and destroy promptly.
