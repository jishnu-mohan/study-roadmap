# Monitoring and Observability

## 15. Monitoring and Observability **[SR]**

### What It Is
The ability to understand the internal state of your system from its external outputs. Essential for debugging, alerting, and maintaining reliability in production.

### The Three Pillars

```
+------------+    +------------+    +------------+
|  METRICS   |    |   LOGS     |    |  TRACES    |
|            |    |            |    |            |
| Numerical  |    | Discrete   |    | End-to-end |
| time-series|    | events     |    | request    |
| data       |    | with       |    | journey    |
|            |    | context    |    | across     |
| CPU: 75%   |    | "Order     |    | services   |
| QPS: 1200  |    |  created   |    |            |
| p99: 230ms |    |  for user  |    | ServiceA   |
|            |    |  #42"      |    |  -> SvcB   |
+------------+    +------------+    |  -> SvcC   |
                                    +------------+
```

### Metrics
- **Types**: counters (requests total), gauges (current CPU), histograms (latency distribution)
- **Key metrics**: RED method (Rate, Errors, Duration) for services; USE method (Utilization, Saturation, Errors) for resources
- **Percentiles**: p50, p95, p99 latency. Averages lie -- always use percentiles.

### Logs
- Structured logging (JSON) over unstructured text
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs: a unique ID passed through all services for a single request, enabling tracing through logs

### Traces (Distributed Tracing)
- Each request gets a trace ID
- Each service creates a span (unit of work)
- Spans are nested to show the full call tree
- OpenTelemetry: vendor-neutral standard for metrics, logs, and traces

### Key Trade-offs

| Gain | Lose |
|------|------|
| Fast debugging, proactive alerting | Cost (storage, compute for processing) |
| Understanding system behavior at scale | Noise (too many alerts = alert fatigue) |
| Capacity planning from historical data | Instrumentation effort in code |

### When to Use (Interview Triggers)
- "How would you monitor this system?" -- mention all three pillars
- "How to debug issues in production?" -- structured logs + distributed tracing
- "What alerts would you set up?" -- error rate spike, p99 latency breach, queue depth growing

### Real-World Mapping
- **CloudWatch**: metrics (Lambda duration, error count), logs (Lambda logs auto-shipped), alarms
- **CloudWatch X-Ray**: distributed tracing for Lambda/API Gateway
- **Prometheus + Grafana**: popular self-hosted stack for metrics and dashboards (EKS)
- In your Lambda stack: CloudWatch Metrics for invocation count/errors/duration, CloudWatch Logs for structured logging, X-Ray for tracing across Lambda -> SQS -> Lambda chains
