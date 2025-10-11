# 📘 Metrics Contract

## 0) Principles

* **Format:** Prometheus exposition format on `/metrics`.
* **Naming:** `snake_case`; include units in names (`_seconds`, `_bytes`, `_total`).
* **Types:** `counter` (monotonic), `gauge` (up/down), `histogram` (distribution).
* **Mandatory labels:** `service`, `env`. Avoid high-cardinality labels (no user IDs).
* **Latency buckets:** `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5`.

---

## 1) HTTP Server (all services)

Inspired by Otel `http.server.request.duration`.

| Metric                           | Type      | Unit     | Labels                                     |
| -------------------------------- | --------- | -------- | ------------------------------------------ |
| `http_server_requests_seconds`   | histogram | seconds  | `service, env, method, route, status_code` |
| `http_server_requests_in_flight` | gauge     | requests | `service, env`                             |
| `http_server_requests_total`     | counter   | requests | `service, env, method, route, status_code` |

**Notes**

* Use templated routes (`/payments/{id}`), not real IDs.
* `status_code` as string (e.g. `"201"`).

**PromQL**

```promql
# p95 latency
histogram_quantile(0.95, sum by (le)(
  rate(http_server_requests_seconds_bucket[5m])
))
# Error rate
sum(rate(http_server_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_server_requests_total[5m]))
```

---

## 2) Database / ORM (optional but recommended)

Inspired by Otel `db.client.operations.duration`.

| Metric                         | Type      | Unit        | Labels                                  |
| ------------------------------ | --------- | ----------- | --------------------------------------- |
| `db_client_operations_seconds` | histogram | seconds     | `service, env, db_system, db_operation` |
| `db_connections_current`       | gauge     | connections | `service, env, db_system`               |

`db_system`: `postgresql`, `mongodb`, etc.
`db_operation`: `select`, `insert`, `update`, `delete`.

---

## 3) Messaging (RabbitMQ/Kafka)

Inspired by Otel `messaging.publish.messages`.

| Metric                               | Type    | Unit     | Labels                                        |
| ------------------------------------ | ------- | -------- | --------------------------------------------- |
| `messaging_published_messages_total` | counter | messages | `service, env, messaging_system, destination` |
| `messaging_consumed_messages_total`  | counter | messages | `service, env, messaging_system, destination` |
| `messaging_consumer_lag`             | gauge   | messages | `service, env, destination`                   |

`messaging_system`: `rabbitmq`.
`destination`: queue or topic name (low cardinality).

---

## 4) Outbox (consistency pattern)

| Metric                          | Type    | Unit   | Labels         |
| ------------------------------- | ------- | ------ | -------------- |
| `outbox_pending`                | gauge   | events | `service, env` |
| `outbox_published_total`        | counter | events | `service, env` |
| `outbox_publish_failures_total` | counter | events | `service, env` |

**Alert example**

```promql
increase(outbox_publish_failures_total[5m]) > 0
```

---

## 5) Business Domain – Payments

| Metric                      | Type    | Unit     | Labels                   |
| --------------------------- | ------- | -------- | ------------------------ |
| `payments_created_total`    | counter | payments | `service, env, currency` |
| `payments_authorized_total` | counter | payments | `service, env, outcome`  |
| `payments_captured_total`   | counter | payments | `service, env, outcome`  |
| `payments_refunded_total`   | counter | payments | `service, env, outcome`  |

`outcome`: `ok` / `fail`.

**Throughput per outcome**

```promql
sum(rate(payments_authorized_total[5m])) by (outcome)
```

---

## 6) Webhooks (reliable delivery)

| Metric                              | Type      | Unit       | Labels                 |
| ----------------------------------- | --------- | ---------- | ---------------------- |
| `webhook_deliveries_total`          | counter   | deliveries | `service, env, status` |
| `webhook_delivery_duration_seconds` | histogram | seconds    | `service, env, status` |
| `webhook_pending`                   | gauge     | deliveries | `service, env`         |

`status`: `sent`, `failed`, `retried`.

**Failure rate**

```promql
sum(rate(webhook_deliveries_total{status="failed"}[5m]))
/
sum(rate(webhook_deliveries_total[5m]))
```

---

## 7) Jobs / Workers (sagas, retries)

| Metric                        | Type      | Unit    | Labels                       |
| ----------------------------- | --------- | ------- | ---------------------------- |
| `worker_jobs_total`           | counter   | jobs    | `service, env, job, outcome` |
| `worker_job_duration_seconds` | histogram | seconds | `service, env, job, outcome` |
| `worker_jobs_in_progress`     | gauge     | jobs    | `service, env, job`          |

`job`: logical name (`authorize`, `capture`).
`outcome`: `ok`, `fail`, `retry`.

---

## 8) Process / Runtime

| Metric                          | Type    | Unit    | Labels          |
| ------------------------------- | ------- | ------- | --------------- |
| `process_cpu_seconds_total`     | counter | seconds | `service, env`  |
| `process_resident_memory_bytes` | gauge   | bytes   | `service, env`  |
| `up`                            | gauge   | 0/1     | `instance, job` |

---

## 9) Cardinality Rules

* ❌ **Do not** use labels with high variability: user IDs, request IDs, payment IDs.
* ✅ Allowed: `service`, `env`, `route` (templated), `destination` (limited set), `currency` (few values).
* Target: <50k active series locally; <5M in production.

---

## 10) Suggested Buckets

* HTTP / Webhooks / Jobs: `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5`
* DB Operations: `0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1`

Keep buckets consistent across services to reuse dashboards.

---

## 11) Reference PromQL Queries

| Goal                               | Query                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **p95 latency per service**        | `histogram_quantile(0.95, sum by (service, le)(rate(http_server_requests_seconds_bucket[5m])))`                     |
| **Global error rate**              | `(sum(rate(http_server_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_server_requests_total[5m]))) * 100` |
| **Outbox pending per service**     | `max(outbox_pending) by (service)`                                                                                  |
| **Webhook failure rate**           | `(sum(rate(webhook_deliveries_total{status="failed"}[5m])) / sum(rate(webhook_deliveries_total[5m]))) * 100`        |
| **Authorized payments throughput** | `sum(rate(payments_authorized_total[1m])) by (outcome)`                                                             |

---

## 12) Definition of Done (per service)

* `/metrics` endpoint exposes HELP/TYPE correctly.
* Includes HTTP histogram and relevant business metrics.
* Labels `service` and `env` are always present.
* Grafana dashboards display **p95**, **error rate**, and **throughput**.
* No high-cardinality labels.
* Basic exposure test in CI (status 200, contains expected metrics).

---

## 13) Example Exposition Snippet

```text
# HELP payments_created_total Total number of payments created.
# TYPE payments_created_total counter
payments_created_total{service="checkout-api",env="local",currency="ARS"} 42

# HELP http_server_requests_seconds Duration of HTTP requests in seconds.
# TYPE http_server_requests_seconds histogram
http_server_requests_seconds_bucket{service="checkout-api",env="local",method="POST",route="/payments",status_code="201",le="0.1"} 120
...
http_server_requests_seconds_sum{service="checkout-api",env="local",method="POST",route="/payments",status_code="201"} 12.4
http_server_requests_seconds_count{service="checkout-api",env="local",method="POST",route="/payments",status_code="201"} 180
```

---

## 14) Versioning

* File: `docs/observability/metrics-contract.md`
* **Compatible change:** add new metrics or optional labels → minor version.
* **Breaking change:** rename or remove metrics/labels → major version + CHANGELOG note.

---