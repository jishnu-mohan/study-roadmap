# URL Shortener

## Problem 1: URL Shortener **[SR]**

### Problem Statement
Design a service like bit.ly that takes long URLs and returns short, unique URLs. When users visit the short URL, they are redirected to the original.

### Step 1: Requirements

**Functional Requirements**
- Given a long URL, generate a unique short URL
- When a short URL is accessed, redirect to the original long URL
- Users can optionally set custom short URLs
- URLs expire after a configurable TTL (default: 5 years)
- Track click analytics (count, referrer, geo)

**Non-Functional Requirements**
- Low latency for redirection (< 50ms)
- High availability (reads >> writes, read-heavy system)
- Short URLs should not be guessable/sequential
- Scale to 100M URLs created per month

### Step 2: Back-of-Envelope Estimation

```
Writes: 100M URLs/month = ~40 URLs/sec
Read:Write ratio = 100:1 (assumption)
Reads: 4,000 redirects/sec

Storage per URL: ~500 bytes (short URL + long URL + metadata)
Storage per month: 100M * 500B = 50GB/month
5 years: 50GB * 60 = 3TB total

Cache: 80/20 rule, cache top 20% of daily reads
Daily reads: 4,000 * 86,400 = ~346M reads/day
Cache 20%: ~70M entries * 500B = ~35GB cache (fits in a single Redis node)
```

### Step 3: High-Level Architecture

```
                         +------------------+
  Client ------>         |   Load Balancer  |
                         +------------------+
                          /                \
               +-----------+          +-----------+
               | URL Service|         | URL Service|
               | (stateless)|        | (stateless)|
               +-----------+          +-----------+
                    |     \                |
                    |      \               |
              +--------+  +--------+  +--------+
              | Redis  |  |  DB    |  |Analytics|
              | Cache  |  |(Postgres)| | Service|
              +--------+  +--------+  +--------+
                                          |
                                      +--------+
                                      | Kafka  |
                                      |(clicks)|
                                      +--------+
```

### Step 4: Database Design

**Choice: PostgreSQL** -- structured data, strong consistency needed for URL uniqueness, moderate write volume (40/sec is trivial for Postgres).

```sql
Table: urls
  id            BIGSERIAL PRIMARY KEY
  short_code    VARCHAR(7) UNIQUE NOT NULL  -- indexed for fast lookup
  long_url      TEXT NOT NULL
  user_id       BIGINT (nullable)
  created_at    TIMESTAMP
  expires_at    TIMESTAMP
  click_count   BIGINT DEFAULT 0

Index: unique index on short_code (B-tree, primary lookup path)
```

For analytics at scale, use a separate store (Kafka -> analytics DB/data warehouse).

### Step 5: API Design

```
POST /api/v1/urls
  Body: { "long_url": "https://...", "custom_alias": "mylink", "ttl_days": 365 }
  Response: { "short_url": "https://short.ly/abc1234", "expires_at": "..." }
  Status: 201 Created

GET /:short_code
  Response: 301 Moved Permanently (cacheable) or 302 Found (not cached, better for analytics)
  Header: Location: https://original-long-url.com/...

GET /api/v1/urls/:short_code/stats
  Response: { "clicks": 12345, "created_at": "...", "top_referrers": [...] }
```

### Step 6: Deep Dive

**1. Short Code Generation -- Hashing Strategies**

Option A: Hash the long URL (MD5/SHA256) and take first 7 chars in Base62.
- Problem: collisions. Must check DB and retry with salt.
- Deterministic: same URL always produces same short code (dedup).

Option B: Auto-increment ID converted to Base62.
- No collision. But sequential IDs are guessable.
- Fix: use a distributed ID generator (Snowflake) or encode with a shuffle.

Option C: Pre-generate random codes and store in a key pool.
- No collision checking at write time. Pull from pool.
- Need to maintain the pool (background job).

Recommended: Counter-based approach (Snowflake-like ID -> Base62). 7 chars in Base62 = 62^7 = 3.5 trillion unique codes.

**2. Read-Heavy Optimization**

```
Read path:
  Client -> LB -> Service -> Check Redis cache
                                |
                          hit?  -> return long_url, 301 redirect
                          miss? -> query DB -> populate cache -> return

Cache policy: cache-aside with TTL matching URL expiry
Hot URLs: most URLs follow power law, top 20% cache handles 80% of reads
```

**3. 301 vs 302 Redirect**
- 301 (Moved Permanently): browser caches the redirect. Fewer requests to our service. But we lose analytics visibility.
- 302 (Found): browser does NOT cache. Every click hits our service. Better for analytics.
- Decision: use 302 if analytics matter, 301 if reducing server load is priority.

### Step 7: Scaling and Trade-offs

- **Database sharding**: shard by short_code hash when single Postgres is not enough (unlikely until billions of URLs)
- **Cache stampede**: use cache locking (Redis SETNX) to prevent thundering herd on popular URL cache miss
- **Rate limiting**: prevent abuse (someone generating millions of URLs). Token bucket per user/IP.
- **Trade-off**: 301 vs 302 is a core trade-off between performance and analytics
- **Trade-off**: hash-based vs counter-based short codes -- determinism vs simplicity
