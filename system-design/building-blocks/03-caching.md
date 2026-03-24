# Caching

## 3. Caching **[SR]**

### What It Is
Storing frequently accessed data in a fast-access layer (usually in-memory) to reduce latency and load on the primary data store.

### How It Works -- Caching Strategies

```
CACHE-ASIDE (Lazy Loading)          READ-THROUGH
App checks cache first.             Cache sits in front of DB.
Miss? App reads DB, writes cache.   Miss? Cache reads DB itself.

  App -----> Cache (hit? return)      App -----> Cache -----> DB
   |            |                                  |
   +---(miss)-> DB                    (cache handles miss internally)
   |            |
   +-- write -> Cache


WRITE-THROUGH                       WRITE-BEHIND (Write-Back)
Write to cache AND DB together.     Write to cache, async flush to DB.

  App --> Cache --> DB (sync)         App --> Cache --async--> DB
  (consistent but slower writes)     (fast writes, risk of data loss)
```

### Cache Invalidation Strategies
- **TTL (Time-To-Live)**: expire after N seconds. Simple, eventual consistency.
- **Event-based invalidation**: on DB write, publish event to invalidate cache. More consistent but complex.
- **Version keys**: append version number to cache key, increment on update.

There are only two hard things in CS: cache invalidation and naming things.

### Redis vs Memcached

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, lists, sets, sorted sets, hashes | Strings only |
| Persistence | RDB snapshots, AOF | None |
| Replication | Built-in leader-follower | None |
| Pub/Sub | Yes | No |
| Clustering | Redis Cluster (hash slots) | Client-side sharding |
| Use case | Versatile: caching, sessions, leaderboards, queues | Pure caching, simpler |

### Key Trade-offs

| Gain | Lose |
|------|------|
| Dramatically lower latency (sub-ms vs 5-50ms DB) | Data staleness risk, memory cost |
| Reduced DB load | Cache stampede risk (many misses at once), cold start problem |
| Write-behind: fast writes | Write-behind: potential data loss on crash |

### When to Use (Interview Triggers)
- "This endpoint is read-heavy" -- cache-aside with Redis
- "How to reduce database load?" -- caching layer
- "How to handle hot keys?" -- local cache + distributed cache

### Real-World Mapping
- **ElastiCache (Redis)**: managed Redis for session caching, API response caching
- **CloudFront caching**: edge-level HTTP response caching (see CDN section)
- **DynamoDB DAX**: purpose-built cache in front of DynamoDB (microsecond reads)
- In your Lambda stack: cache in Lambda memory (/tmp or global scope) for warm invocations, ElastiCache for shared cache
