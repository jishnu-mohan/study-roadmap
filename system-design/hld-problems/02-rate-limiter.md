# Rate Limiter

## Problem 2: Rate Limiter **[SR]**

### Problem Statement
Design a distributed rate limiting service that can throttle API requests based on configurable rules (per user, per IP, per API key).

### Step 1: Requirements

**Functional Requirements**
- Limit requests per client based on configurable rules (e.g., 100 req/min per user)
- Support multiple rate limiting strategies (fixed window, sliding window, token bucket)
- Return appropriate HTTP 429 with Retry-After header when limit exceeded
- Support different limits per API endpoint and user tier

**Non-Functional Requirements**
- Ultra-low latency (< 1ms overhead per request)
- Highly available (if rate limiter is down, should fail open or closed based on config)
- Accurate in a distributed environment (multiple service instances)
- Scale to millions of unique clients

### Step 2: Back-of-Envelope Estimation

```
Assume 10M active users, average 10 requests/min each
Peak QPS: 10M * 10 / 60 = ~1.7M requests/sec to check
Each rate limit check: ~1 Redis round trip = ~1ms

Redis memory per user: ~100 bytes (key + counter + TTL)
Total memory: 10M * 100B = 1GB (fits easily in Redis)
```

### Step 3: High-Level Architecture

```
  Client --> API Gateway --> Rate Limiter Middleware --> Backend Service
                                    |
                                    v
                              +----------+
                              |  Redis   |
                              | Cluster  |
                              +----------+
                              (shared state
                               across all
                               service instances)

  Configuration:
  +------------------+
  | Rules DB/Config  |  <-- rate limit rules loaded on startup / cached
  +------------------+
```

### Step 4: Database Design

**Choice: Redis** -- in-memory, atomic operations (INCR, EXPIRE), sub-millisecond latency, exactly what rate limiting needs.

```
Key patterns:

Fixed window:
  key: "ratelimit:{client_id}:{endpoint}:{window_timestamp}"
  value: request_count (integer)
  TTL: window_size + buffer

Sliding window log:
  key: "ratelimit:{client_id}:{endpoint}"
  value: sorted set of request timestamps
  Score: timestamp, Member: unique request ID

Token bucket:
  key: "ratelimit:{client_id}:{endpoint}"
  value: hash { tokens: N, last_refill: timestamp }
```

Rules stored in PostgreSQL or DynamoDB:

```
Table: rate_limit_rules
  id            UUID
  endpoint      VARCHAR  -- e.g., "/api/v1/orders"
  client_tier   VARCHAR  -- "free", "premium", "enterprise"
  max_requests  INT
  window_seconds INT
  algorithm     VARCHAR  -- "token_bucket", "sliding_window"
```

### Step 5: API Design

This is middleware, not a standalone API. But the configuration API:

```
GET /api/v1/rate-limits/rules
  Response: [{ "endpoint": "/api/orders", "tier": "free", "max": 100, "window": 60 }]

PUT /api/v1/rate-limits/rules/:id
  Body: { "max_requests": 200, "window_seconds": 60 }

-- Response headers added to every API response:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1640000000  (Unix timestamp)

-- When limited:
HTTP 429 Too Many Requests
Retry-After: 30
```

### Step 6: Deep Dive

**1. Token Bucket Implementation in Redis (Lua Script)**

Must be atomic -- use a Redis Lua script to avoid race conditions:

```
Pseudocode (Lua in Redis):
  local tokens = redis.call('HGET', key, 'tokens')
  local last_refill = redis.call('HGET', key, 'last_refill')
  local now = current_time

  -- Refill tokens based on elapsed time
  local elapsed = now - last_refill
  local new_tokens = min(max_tokens, tokens + elapsed * refill_rate)

  if new_tokens >= 1 then
    redis.call('HSET', key, 'tokens', new_tokens - 1)
    redis.call('HSET', key, 'last_refill', now)
    return 1  -- allowed
  else
    return 0  -- rejected
  end
```

**2. Distributed Rate Limiting Challenge**

Problem: multiple service instances, each checking rate limits. Without shared state, each instance only sees its own portion of traffic.

Solutions:
- **Centralized Redis**: all instances check the same Redis. Simple, works at scale. Added network hop.
- **Local + sync**: each instance tracks locally, periodically syncs to central store. Slightly less accurate, lower latency.
- **Sticky sessions**: route same client to same instance. But uneven distribution and breaks on instance failure.

Recommended: Centralized Redis cluster. The 1ms overhead is acceptable.

**3. Fail Open vs Fail Closed**

If Redis is down:
- **Fail open**: allow all requests (availability over protection). Risk: no rate limiting during outage.
- **Fail closed**: reject all requests (protection over availability). Risk: total outage.
- **Recommended**: fail open with local in-memory fallback (less accurate but still provides some protection).

### Step 7: Scaling and Trade-offs

- **Redis Cluster**: shard by client_id hash for horizontal scaling
- **Race conditions**: Lua scripts in Redis ensure atomicity
- **Trade-off**: accuracy vs latency. Sliding window log is most accurate but uses more memory. Token bucket is a good middle ground.
- **Trade-off**: centralized (accurate) vs distributed (fast). Use centralized Redis for most cases.
- **Edge rate limiting**: for DDoS, rate limit at CDN/edge (CloudFront) before traffic hits your infrastructure
