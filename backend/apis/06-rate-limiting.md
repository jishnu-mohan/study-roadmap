# Rate Limiting

### Algorithms

#### Token Bucket

A bucket holds up to B tokens. Tokens are added at a fixed rate of R tokens per second. Each request consumes one token. If the bucket is empty, the request is rejected.

```
Bucket capacity (B): 10 tokens
Refill rate (R): 2 tokens/second

Time 0s: Bucket has 10 tokens
  -> 6 requests arrive, all allowed. Bucket: 4 tokens
Time 1s: 2 tokens refilled. Bucket: 6 tokens
  -> 8 requests arrive, 6 allowed, 2 rejected. Bucket: 0 tokens
Time 2s: 2 tokens refilled. Bucket: 2 tokens
```

**Characteristics:**
- Allows bursts up to the bucket size (good for APIs with bursty traffic)
- Average rate converges to the refill rate
- Used by AWS API Gateway, Stripe, and most cloud providers
- Most commonly used algorithm in practice

#### Leaky Bucket

Requests enter a queue (bucket). The queue is processed at a fixed rate. If the queue is full, new requests are dropped.

```
Queue capacity: 10
Processing rate: 2 requests/second

Requests enter the queue and are drained at a constant rate,
regardless of how bursty the input is.
```

**Characteristics:**
- Smooths out bursts -- output rate is always constant
- Good for APIs that need a consistent processing rate (e.g., sending emails, writing to a rate-limited downstream)
- Requests may experience queuing delay even when the system is not fully loaded

#### Fixed Window Counter

Divide time into fixed windows (e.g., each minute). Count requests per window. Reject when count exceeds the limit.

```
Window: 60 seconds, Limit: 100 requests

[00:00 - 01:00] -> 100 requests allowed
[01:00 - 02:00] -> counter resets, 100 more allowed

Problem: A burst of 100 requests at 00:59 and 100 at 01:01
         = 200 requests in 2 seconds, even though the limit is 100/min
```

**Characteristics:**
- Simplest to implement (single counter per window)
- The boundary burst problem: 2x the rate limit can pass in a short period at the window boundary
- Acceptable for non-critical rate limiting where simplicity matters

#### Sliding Window Log

Store the timestamp of every request. For each new request, count how many timestamps fall within the last window duration. If count exceeds limit, reject.

```
Window: 60 seconds, Limit: 100

Incoming request at T=125s:
  Count all stored timestamps where timestamp > (125 - 60) = 65s
  If count >= 100, reject
  Otherwise, allow and store timestamp 125s
  Clean up timestamps older than 65s
```

**Characteristics:**
- Most accurate -- no boundary burst issue
- Memory-intensive: stores every request timestamp
- Cleanup overhead: must periodically remove old entries
- Use for critical rate limiting where accuracy justifies the cost

#### Sliding Window Counter

Combines fixed window and sliding window. Uses the weighted count from the previous window plus the current window's count.

```
Window: 60 seconds, Limit: 100
Previous window count: 84
Current window count: 36
Current position in window: 25% through (15 seconds in)

Weighted count = (84 * 0.75) + 36 = 63 + 36 = 99
Next request: 99 < 100 -> ALLOW

If current count were 37:
Weighted count = (84 * 0.75) + 37 = 100 -> REJECT
```

**Characteristics:**
- Smooth rate limiting without the boundary burst problem
- Memory efficient: only two counters (previous window + current window)
- Not perfectly accurate, but very close in practice
- Best balance of accuracy, memory, and complexity

---

### Algorithm Comparison

| Algorithm              | Burst Handling            | Memory       | Accuracy   | Complexity |
|------------------------|---------------------------|-------------|------------|------------|
| Token Bucket           | Allows controlled bursts  | Low (1 counter + timestamp) | Good | Low        |
| Leaky Bucket           | Smooths out bursts        | Low (queue) | Good       | Low        |
| Fixed Window Counter   | 2x burst at boundary      | Very Low    | Poor       | Very Low   |
| Sliding Window Log     | No burst issue            | High        | Excellent  | Medium     |
| Sliding Window Counter | Minimal burst issue       | Low         | Very Good  | Low        |

**Recommendation:** Token Bucket for most API rate limiting (simple, allows reasonable bursts, industry standard). Sliding Window Counter when you need more accuracy without the memory cost of Sliding Window Log.

---

### Distributed Rate Limiting with Redis

In a multi-server deployment, rate limiting must be centralized. Redis is the standard choice due to its atomic operations and low latency.

**Simple approach: INCR + EXPIRE (Fixed Window)**
```
-- Pseudocode
key = "rate_limit:{user_id}:{current_minute}"

count = redis.INCR(key)
if count == 1:
    redis.EXPIRE(key, 60)  -- set TTL on first request

if count > limit:
    return 429 Too Many Requests
```

**Problem:** The INCR and EXPIRE are two separate commands. If the server crashes between them, the key persists forever without a TTL.

**Solution: Lua script for atomicity**
```lua
-- Redis Lua script (executed atomically)
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, window)
end

if current > limit then
    return 0  -- rejected
else
    return 1  -- allowed
end
```

```typescript
// TypeScript usage
const RATE_LIMIT_SCRIPT = `...`;  // Lua script above

async function checkRateLimit(
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const result = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, limit, windowSeconds);

  const currentCount = await redis.get(key);
  return {
    allowed: result === 1,
    remaining: Math.max(0, limit - Number(currentCount)),
  };
}
```

**Token Bucket in Redis (more sophisticated):**
```lua
-- Token Bucket Lua script
local key = KEYS[1]
local capacity = tonumber(ARGV[1])     -- max tokens
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])          -- current timestamp (ms)

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Calculate tokens to add based on elapsed time
local elapsed = (now - last_refill) / 1000
local new_tokens = math.min(capacity, tokens + (elapsed * refill_rate))

if new_tokens >= 1 then
    new_tokens = new_tokens - 1
    redis.call("HMSET", key, "tokens", new_tokens, "last_refill", now)
    redis.call("EXPIRE", key, capacity / refill_rate * 2)  -- auto-cleanup
    return 1  -- allowed
else
    redis.call("HMSET", key, "tokens", new_tokens, "last_refill", now)
    return 0  -- rejected
end
```

---

### Rate Limit Response Headers

When rate limiting is active, include these headers in every response so clients can self-regulate:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100          -- max requests allowed in window
X-RateLimit-Remaining: 57       -- requests remaining in current window
X-RateLimit-Reset: 1711401600   -- Unix timestamp when the window resets

-- On rate limit exceeded:
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711401600
Retry-After: 30                 -- seconds until the client should retry
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit of 100 requests per minute.",
    "retry_after": 30
  }
}
```

**Implementation tip for API Gateway:** AWS API Gateway supports usage plans with throttling (token bucket algorithm). Configure burst limit (bucket size) and rate limit (refill rate) per API key or per Cognito user group. This offloads rate limiting from application code entirely.

---

## Quick Reference: Interview Talking Points

1. **REST vs GraphQL vs gRPC:** REST for public/simple APIs, GraphQL for flexible client-driven queries, gRPC for internal high-performance service mesh.

2. **Auth flow for SPAs:** Authorization Code + PKCE. Never use Implicit flow. Store tokens in memory or httpOnly cookies, never localStorage.

3. **Rate limiting at scale:** Token Bucket in Redis with Lua scripts for atomicity. Return proper headers so clients can back off gracefully.

4. **Real-time communication:** WebSocket for bidirectional, SSE for server-push, Long Polling only as a fallback. Scale WebSocket with Redis Pub/Sub.

5. **Pagination:** Cursor-based for feeds and large/mutable datasets. Offset-based only for small/static datasets or when "jump to page" is required.

6. **Idempotency:** GET, PUT, DELETE are naturally idempotent. POST needs explicit idempotency keys (client-generated UUID, server caches result).

7. **JWT lifecycle:** Short-lived access tokens (15 min) + long-lived refresh tokens with rotation and reuse detection.
