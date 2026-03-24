# Rate Limiter

## Problem 3: Rate Limiter **[SR]**

### Requirements
- Support multiple rate limiting algorithms (token bucket, sliding window)
- Configure limits per client/key
- Return whether a request is allowed
- Track remaining tokens/requests
- Thread-safe (atomic operations)

### Key Design Patterns
- **Strategy Pattern**: swap rate limiting algorithms at runtime
- **Factory Pattern**: create the right limiter based on configuration

### Class Diagram

```
+-------------------+       +------------------------+
| RateLimiterManager|       |<<interface>>           |
|-------------------|       | IRateLimitAlgorithm    |
| - limiters: Map   |       |------------------------|
|-------------------|       | + tryAcquire(key): bool |
| + isAllowed(key)  |       | + getRemainingTokens() |
| + configure(...)  |       +------------------------+
+-------------------+              ^          ^
         |                         |          |
         | uses                    |          |
         v                         |          |
+-------------------+    +-----------+  +-------------+
| RateLimitResult   |    |TokenBucket|  |SlidingWindow|
|-------------------|    |Algorithm  |  |Algorithm    |
| - allowed: bool   |    +-----------+  +-------------+
| - remaining: num  |
| - retryAfter: num |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Rate Limit Result
// ============================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // 0 if allowed
  limit: number;
}

// ============================================================
// Rate Limit Algorithm Interface (Strategy Pattern)
// ============================================================

interface IRateLimitAlgorithm {
  tryAcquire(key: string): RateLimitResult;
  reset(key: string): void;
}

// ============================================================
// Token Bucket Algorithm
// ============================================================

interface TokenBucketState {
  tokens: number;
  lastRefillTime: number; // ms since epoch
}

class TokenBucketAlgorithm implements IRateLimitAlgorithm {
  private buckets: Map<string, TokenBucketState> = new Map();

  constructor(
    private maxTokens: number,       // bucket capacity
    private refillRate: number,      // tokens per second
    private refillInterval: number = 1000 // ms between refills
  ) {}

  tryAcquire(key: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefillTime: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefillTime;
    const tokensToAdd = Math.floor(
      (elapsedMs / this.refillInterval) * this.refillRate
    );

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    }

    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
        limit: this.maxTokens,
      };
    }

    // No tokens available
    const msUntilNextToken =
      this.refillInterval / this.refillRate -
      (now - bucket.lastRefillTime);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, Math.ceil(msUntilNextToken)),
      limit: this.maxTokens,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

// ============================================================
// Sliding Window Counter Algorithm
// ============================================================

interface SlidingWindowState {
  currentCount: number;
  previousCount: number;
  currentWindowStart: number; // ms since epoch
}

class SlidingWindowAlgorithm implements IRateLimitAlgorithm {
  private windows: Map<string, SlidingWindowState> = new Map();

  constructor(
    private maxRequests: number,    // max requests per window
    private windowSizeMs: number    // window size in milliseconds
  ) {}

  tryAcquire(key: string): RateLimitResult {
    const now = Date.now();
    let state = this.windows.get(key);

    if (!state) {
      state = {
        currentCount: 0,
        previousCount: 0,
        currentWindowStart: this.getWindowStart(now),
      };
      this.windows.set(key, state);
    }

    // Check if we need to advance the window
    const currentWindowStart = this.getWindowStart(now);

    if (currentWindowStart > state.currentWindowStart + this.windowSizeMs) {
      // We are two or more windows ahead -- reset both
      state.previousCount = 0;
      state.currentCount = 0;
      state.currentWindowStart = currentWindowStart;
    } else if (currentWindowStart > state.currentWindowStart) {
      // We are in the next window
      state.previousCount = state.currentCount;
      state.currentCount = 0;
      state.currentWindowStart = currentWindowStart;
    }

    // Calculate weighted count using sliding window
    const elapsedInCurrentWindow = now - state.currentWindowStart;
    const previousWindowWeight =
      1 - elapsedInCurrentWindow / this.windowSizeMs;

    const estimatedCount =
      state.currentCount + Math.floor(state.previousCount * previousWindowWeight);

    if (estimatedCount < this.maxRequests) {
      state.currentCount += 1;
      return {
        allowed: true,
        remaining: this.maxRequests - estimatedCount - 1,
        retryAfterMs: 0,
        limit: this.maxRequests,
      };
    }

    // Rate limited
    const retryAfterMs = this.windowSizeMs - elapsedInCurrentWindow;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.ceil(retryAfterMs),
      limit: this.maxRequests,
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private getWindowStart(timestampMs: number): number {
    return Math.floor(timestampMs / this.windowSizeMs) * this.windowSizeMs;
  }
}

// ============================================================
// Rate Limiter Factory
// ============================================================

type AlgorithmType = "token_bucket" | "sliding_window";

interface RateLimiterConfig {
  algorithm: AlgorithmType;
  maxRequests: number;         // max tokens or max requests per window
  windowSizeMs?: number;       // for sliding window (default 60000 = 1 min)
  refillRate?: number;         // for token bucket (tokens per second)
}

class RateLimiterFactory {
  static create(config: RateLimiterConfig): IRateLimitAlgorithm {
    switch (config.algorithm) {
      case "token_bucket":
        return new TokenBucketAlgorithm(
          config.maxRequests,
          config.refillRate ?? config.maxRequests / 60 // default: refill to max in 60s
        );
      case "sliding_window":
        return new SlidingWindowAlgorithm(
          config.maxRequests,
          config.windowSizeMs ?? 60_000
        );
      default:
        throw new Error(`Unknown algorithm: ${config.algorithm}`);
    }
  }
}

// ============================================================
// Rate Limiter Manager (Facade)
// ============================================================

class RateLimiterManager {
  private limiters: Map<string, IRateLimitAlgorithm> = new Map();
  private defaultLimiter: IRateLimitAlgorithm;

  constructor(defaultConfig: RateLimiterConfig) {
    this.defaultLimiter = RateLimiterFactory.create(defaultConfig);
  }

  configureEndpoint(endpoint: string, config: RateLimiterConfig): void {
    this.limiters.set(endpoint, RateLimiterFactory.create(config));
  }

  isAllowed(key: string, endpoint?: string): RateLimitResult {
    const limiter = endpoint
      ? this.limiters.get(endpoint) ?? this.defaultLimiter
      : this.defaultLimiter;

    return limiter.tryAcquire(key);
  }
}

// ============================================================
// Example Usage
// ============================================================

// Token bucket: 10 requests max, refills 2 per second
const manager = new RateLimiterManager({
  algorithm: "token_bucket",
  maxRequests: 10,
  refillRate: 2,
});

// Specific endpoint with sliding window: 5 requests per 10 seconds
manager.configureEndpoint("/api/expensive", {
  algorithm: "sliding_window",
  maxRequests: 5,
  windowSizeMs: 10_000,
});

// Simulate requests
const clientKey = "user-123";

for (let i = 0; i < 12; i++) {
  const result = manager.isAllowed(clientKey);
  console.log(
    `Request ${i + 1}: ${result.allowed ? "ALLOWED" : "BLOCKED"} ` +
    `(remaining: ${result.remaining})`
  );
}

// Check specific endpoint
const expensiveResult = manager.isAllowed(clientKey, "/api/expensive");
console.log(`Expensive endpoint: ${expensiveResult.allowed ? "ALLOWED" : "BLOCKED"}`);
```

### SOLID Principles Applied
- **S**: Each algorithm class handles only its own logic. The manager handles routing.
- **O**: New algorithms (leaky bucket, fixed window) can be added by implementing IRateLimitAlgorithm -- no existing code changes.
- **L**: Any IRateLimitAlgorithm implementation can be swapped in anywhere an algorithm is expected.
- **I**: IRateLimitAlgorithm is minimal -- just tryAcquire and reset.
- **D**: RateLimiterManager depends on IRateLimitAlgorithm (abstraction), not on concrete algorithm classes.

### Extension Points
- **Redis-backed**: replace in-memory Maps with Redis commands (INCR, EXPIRE, Lua scripts) for distributed rate limiting
- **Leaky bucket algorithm**: implement IRateLimitAlgorithm with a fixed-rate output queue
- **Weighted requests**: some endpoints cost more tokens than others (e.g., search costs 5 tokens, profile view costs 1)
- **Dynamic configuration**: load limits from a config service, hot-reload without restart
- **Metrics**: track allowed/blocked counts per key for monitoring dashboards
