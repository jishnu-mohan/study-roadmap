# Observability

### Three Pillars

#### 1. Metrics

Numerical measurements collected over time. Metrics tell you what is happening at a high level.

**Types:**
- **Counter:** Monotonically increasing value. Examples: total requests served, total errors, total bytes transferred. You derive rates from counters (requests per second = delta counter / delta time).
- **Gauge:** Current value that can go up or down. Examples: current CPU usage, current queue depth, number of active connections.
- **Histogram:** Distribution of values. Examples: request latency percentiles (p50, p95, p99), response body sizes. Implemented as buckets that count how many observations fell into each range.

**USE Method (for resources -- CPU, memory, disk, network):**
- **Utilization:** Percentage of time the resource is busy (CPU at 80%).
- **Saturation:** Amount of work the resource cannot service (queue depth, waiting threads).
- **Errors:** Count of error events (disk I/O errors, network packet drops).

**RED Method (for services -- APIs, microservices):**
- **Rate:** Requests per second.
- **Errors:** Errors per second (or error rate as percentage).
- **Duration:** Latency distribution (p50, p95, p99).

**Interview insight:** USE is for infrastructure, RED is for application services. Together they give a complete picture.

#### 2. Logging

**Structured logging (JSON) over unstructured:**

Bad:
```
[2024-01-15 10:30:45] ERROR - Payment failed for user 12345, order 67890, amount $50.00
```

Good:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "requestId": "req-abc-123",
  "userId": "12345",
  "orderId": "67890",
  "amount": 50.00,
  "error": "InsufficientFunds",
  "message": "Payment failed"
}
```

Structured logs are machine-parseable, queryable, and can be indexed by any field.

**Log levels and when to use them:**
- **ERROR:** Something is broken and requires human attention. An alert should fire. Example: payment processing failed, database connection lost.
- **WARN:** Something unexpected happened but the system handled it. Worth investigating if it becomes frequent. Example: retry succeeded after initial failure, approaching rate limit.
- **INFO:** Normal business events. Example: order created, user logged in, payment processed. This is the default level in production.
- **DEBUG:** Detailed information for development and troubleshooting. Example: request/response payloads, intermediate computation steps. Disabled in production unless actively debugging.

**Essential fields in every log entry:** request ID (correlation ID), timestamp (ISO 8601), service name, log level. Include user ID and relevant entity IDs when available.

#### 3. Distributed Tracing

Follow a single request as it traverses multiple services. A **trace** is a tree of **spans**, where each span represents a unit of work.

```
Trace: "GET /api/orders/123"
  |-- Span: API Gateway (12ms)
       |-- Span: OrderService.getOrder (8ms)
            |-- Span: DynamoDB.getItem (3ms)
            |-- Span: InventoryService.getStock (4ms)
                 |-- Span: Redis.get (1ms)
```

**Span attributes:**
- `traceId`: Unique ID for the entire trace (generated at the entry point).
- `spanId`: Unique ID for this span.
- `parentSpanId`: The span that initiated this span.
- `startTime`, `duration`: When this span started and how long it took.
- `tags/attributes`: Key-value pairs (http.method, http.status_code, db.statement, etc.).

**OpenTelemetry:** The emerging standard for instrumentation. Vendor-neutral APIs and SDKs for generating traces, metrics, and logs. Exporters send data to backends (Jaeger, Zipkin, AWS X-Ray, Datadog).

### Correlation IDs

Generate a unique ID at the API gateway (or the first service that receives the request). Propagate it through all downstream services via HTTP headers (e.g., `X-Request-Id` or `traceparent`). Include it in every log entry.

When debugging a production issue, search for the correlation ID across all services' logs to reconstruct the entire request flow.

### SLIs, SLOs, SLAs

- **SLI (Service Level Indicator):** A measurement. "99.9% of requests complete in under 200ms." "99.95% of requests return a non-5xx response."
- **SLO (Service Level Objective):** A target for an SLI. "We aim for 99.9% availability measured monthly." SLOs are internal targets.
- **SLA (Service Level Agreement):** A contract with customers that specifies consequences (usually financial) for not meeting the SLO. SLAs are typically less strict than SLOs (so you have a buffer).

**Error budgets:** If your SLO is 99.9% availability (43.2 minutes of downtime per month), you have a 0.1% error budget. As long as you have budget remaining, you can deploy risky changes. When the budget is exhausted, you slow down and focus on reliability.

### Mapping to Jishnu's Stack

- **CloudWatch Metrics:** Built-in Lambda metrics (invocations, errors, duration, throttles). Custom metrics via CloudWatch Embedded Metric Format.
- **CloudWatch Logs:** Structured JSON logs from Lambda. Log Insights for querying.
- **Prometheus + Grafana:** For custom application metrics if running ECS/EKS workloads. Grafana dashboards for visualization and alerting.
- **AWS X-Ray or OpenTelemetry:** Distributed tracing across Lambda, API Gateway, SQS, DynamoDB. X-Ray integrates natively with AWS services. OpenTelemetry provides vendor-neutral instrumentation with an X-Ray exporter.

---
