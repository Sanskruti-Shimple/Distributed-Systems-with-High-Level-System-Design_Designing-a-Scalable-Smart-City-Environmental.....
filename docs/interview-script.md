# Interview Notes

1. **How handle traffic spikes?** The broker absorbs bursts; partition by device ID, scale ingestion and consumer replicas, and watch lag. Preserve per-device order and provision partitions based on throughput.
2. **What if the broker fails?** Producers retry with bounded backoff and return 503 until acknowledged; callers retry with the same event ID. Consumers reconnect from committed offsets. Production devices should buffer offline and alert on lag.
3. **How ensure consistency?** Expect eventual consistency across stream, SQL, and ADX. At-least-once delivery plus idempotent event keys prevents duplicate effects. There is no cross-database transaction.
4. **Why microservices?** Ingestion, processing, API, and dashboard have different scale and release needs. Operational overhead is a trade-off; a modular monolith is sensible at smaller scale.
5. **How reduce latency?** Keep services regional, partition broker writes, batch ADX ingestion, index metadata, bound queries, cache slow-changing registry data, and measure end-to-end p95.

## Trade-offs and next improvements

- Redpanda/SQLite enable a repeatable local demo; Event Hubs/SQL/ADX are the Azure deployment path.
- The worker demonstrates consumption and idempotency, not a full checkpointed PyFlink job.
- Budgets notify but do not stop resources; schedule teardown.
- No user sign-in was selected; protect real operator access with Entra ID.
- Add PyFlink event-time windows, OpenTelemetry exporters, service-level alert rules, private endpoints, and per-device credential enrollment before production.
