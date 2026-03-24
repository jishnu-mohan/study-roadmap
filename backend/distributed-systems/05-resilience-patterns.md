# Resilience Patterns

### Circuit Breaker

Prevents a service from repeatedly calling a failing downstream dependency, which would waste resources, increase latency, and potentially cause cascading failures.

**Three states:**

```
         success threshold met
              |
  [Closed] --failures exceed threshold--> [Open]
     ^                                      |
     |                                      | timeout expires
     |                                      v
     +-----success threshold met----- [Half-Open]
     |                                      |
     +------failure in half-open-----------+
                (back to Open)
```

- **Closed (normal operation):** Requests pass through. The circuit breaker counts consecutive failures (or failure rate over a window). When the failure count exceeds the threshold, the circuit trips to Open.
- **Open (failing fast):** All requests immediately fail without calling the downstream service. After a configured timeout (e.g., 30 seconds), the circuit moves to Half-Open.
- **Half-Open (testing recovery):** A limited number of test requests are allowed through. If they succeed (meeting the success threshold), the circuit closes. If any fail, the circuit re-opens.

**Configuration parameters:**
- `failureThreshold`: Number of failures before tripping (e.g., 5).
- `timeout`: How long to stay Open before trying Half-Open (e.g., 30s).
- `successThreshold`: Number of successes in Half-Open before closing (e.g., 3).

**When to use:** Any remote call -- external APIs, database connections, calls to other microservices.

### Retry with Exponential Backoff + Jitter

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay,
        maxDelay
      );
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

function isTransientError(error: any): boolean {
  // Retry on 5xx, timeouts, network errors. Do NOT retry on 4xx.
  const status = error?.statusCode || error?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return true;
}
```

**Why jitter matters:** Without jitter, if 1000 clients all fail at the same time (e.g., a downstream service recovers from an outage), they all retry at the same intervals: 1s, 2s, 4s, 8s. This creates periodic spikes (thundering herd). Adding random jitter spreads the retries across time, smoothing the load.

**Only retry transient errors:** 5xx (server error), 429 (rate limited -- but respect Retry-After header), connection timeouts, network errors. Do NOT retry 4xx client errors (400 Bad Request, 404 Not Found) -- those will never succeed on retry.

### Bulkhead

Isolate resources so that one failing dependency cannot consume all available resources and take down the entire service.

**Thread/connection pool isolation:**
```
Service A
  |-- Pool for Database (max 20 connections)
  |-- Pool for External API X (max 10 connections)
  |-- Pool for Service B (max 15 connections)
```

If External API X becomes slow and all 10 of its connections are occupied, the service can still serve requests that depend on the Database or Service B. Without bulkheading, all 45 connections could be consumed by the slow API X, blocking everything.

**In Lambda context:** Bulkheading is achieved through separate Lambda functions per dependency, with reserved concurrency. If the payment-processing Lambda hits its concurrency limit, the order-listing Lambda is unaffected.

### Timeout Patterns

Always set timeouts. A missing timeout is a resource leak waiting to happen.

| Timeout Type | Typical Value | Purpose |
|-------------|--------------|---------|
| Connection timeout | 1-5 seconds | How long to wait to establish a TCP connection |
| Read/response timeout | Depends on operation (1-30s) | How long to wait for the response after connection is established |
| Overall request timeout | Sum of connection + read + retries | Total time the caller is willing to wait |
| Idle timeout | 30-60 seconds | Close connections that have been idle too long |

**Key principle:** The timeout at each layer should be shorter than the timeout at the layer above it. If your API gateway has a 30s timeout, your service should have a 25s timeout, and its downstream calls should have a 20s timeout. Otherwise, the gateway might time out and return an error to the client while the downstream call is still running (wasting resources).

### Dead Letter Queues (DLQ)

Messages that fail processing after N attempts are moved to a DLQ instead of being retried forever or lost.

**DLQ processing strategies:**
1. **Alerting:** Trigger a CloudWatch alarm when DLQ depth > 0. Someone investigates.
2. **Automated retry with fixes:** A scheduled Lambda reads from the DLQ, applies any necessary transformations or fixes, and re-publishes to the original queue.
3. **Manual review dashboard:** Build a simple UI that lets engineers inspect, edit, and replay DLQ messages.
4. **Expiry:** Set a retention period on the DLQ. Messages older than the retention are discarded. Only appropriate for non-critical data.

**Connecting to Jishnu's SQS DLQ experience:**
- Each SQS queue has a corresponding DLQ configured with a `maxReceiveCount` (e.g., 3).
- If a Lambda consumer fails to process a message 3 times, SQS moves it to the DLQ.
- CloudWatch alarm on DLQ message count triggers PagerDuty/Slack notification.
- A separate Lambda or manual process replays DLQ messages after the root cause is fixed.

---
