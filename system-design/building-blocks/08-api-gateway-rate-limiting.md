# API Gateway and Rate Limiting

## 8. API Gateway and Rate Limiting **[SR]**

### What It Is
An API Gateway is a single entry point for all client requests, handling cross-cutting concerns (auth, rate limiting, routing, transformation). Rate limiting protects services from being overwhelmed.

### How It Works

```
Client --> [API Gateway] --> Service A
               |          --> Service B
               |          --> Service C
               |
        Responsibilities:
        - Authentication/Authorization
        - Rate Limiting
        - Request routing
        - SSL termination
        - Request/Response transformation
        - Logging and monitoring
```

### Rate Limiting Algorithms

**Token Bucket**
```
Bucket has capacity N tokens.
Tokens refill at rate R per second.
Each request consumes 1 token.
No tokens? Request rejected (429).

  [Bucket: 10 tokens]
  Request comes in -> consume 1 -> [9 tokens]
  ...
  [0 tokens] -> 429 Too Many Requests
  After 1 second -> refill R tokens
```
- Allows bursts (up to bucket size)
- Simple to implement
- Most common in practice

**Leaky Bucket**
```
Requests enter a queue (bucket).
Processed at fixed rate, like water leaking.
Queue full? Request rejected.

  Incoming --> [Queue/Bucket] --fixed rate--> Process
  (if queue full, reject)
```
- Smooths out bursts
- Fixed output rate

**Sliding Window Log**
- Keep timestamp of each request in a sorted set
- Count requests in the last N seconds
- Precise but memory-intensive

**Sliding Window Counter**
- Hybrid: use counters per time window, weight current + previous window
- Good balance of precision and memory

### Key Trade-offs

| Gain | Lose |
|------|------|
| Protection from abuse, fair resource sharing | Legitimate traffic may be throttled during spikes |
| Centralized cross-cutting concerns at gateway | Gateway becomes a bottleneck/SPOF if not scaled |

### When to Use (Interview Triggers)
- "How to protect your API from abuse?" -- rate limiting
- "How do multiple clients access your microservices?" -- API gateway
- "Design a rate limiter" -- token bucket is the go-to answer

### Real-World Mapping
- **AWS API Gateway**: managed gateway with built-in throttling (token bucket), API keys, usage plans, Lambda authorizers (Cognito integration you use)
- **Rate limiting in API Gateway**: account-level (10,000 RPS default), per-stage, per-method throttling
- Your stack: API Gateway -> Lambda with Cognito authorizer is your standard pattern
