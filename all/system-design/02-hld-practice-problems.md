# High-Level Design Practice Problems

12 structured HLD problems following a consistent framework. Each problem walks through requirements, estimation, architecture, database design, API design, deep dives, and scaling trade-offs.

---

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

---

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

---

## Problem 3: Chat/Messaging System **[SR]**

### Problem Statement
Design a real-time messaging system like Slack or WhatsApp supporting 1:1 chats, group chats, online/offline status, and message delivery guarantees.

### Step 1: Requirements

**Functional Requirements**
- Send and receive messages in real-time (1:1 and group)
- Message persistence and history
- Online/offline presence indicators
- Read receipts (delivered, read)
- Support for multimedia messages (images, files)

**Non-Functional Requirements**
- Real-time delivery (< 100ms for online users)
- Message ordering guaranteed within a conversation
- No message loss (at-least-once delivery)
- Support 50M DAU, 1B messages/day

### Step 2: Back-of-Envelope Estimation

```
1B messages/day = ~12,000 messages/sec
Average message size: 200 bytes
Storage per day: 1B * 200B = 200GB/day
Storage per year: ~73TB

Concurrent WebSocket connections: 50M DAU, ~30% concurrent = 15M connections
Each connection ~10KB memory = 150GB connection state
Need ~150 chat servers (1M connections each, standard limit)
```

### Step 3: High-Level Architecture

```
                       +------------------+
  Client <--WebSocket-->| Chat Server Pool |
  (mobile/              | (stateful WS     |
   web)                 |  connections)    |
                        +------------------+
                         |              |
                    +--------+    +---------+
                    |Message |    |Presence |
                    |Service |    |Service  |
                    +--------+    +---------+
                      |    |          |
                +------+ +------+  +-----+
                |Kafka | | DB   |  |Redis|
                |(msg  | |(msg  |  |(who |
                | fan  | | store|  | is  |
                | out) | |      |  |online)|
                +------+ +------+  +-----+
                            |
                      +----------+
                      |Cassandra |
                      |(messages)|
                      +----------+
```

### Step 4: Database Design

**Choice: Cassandra for messages** -- write-heavy, time-series nature (messages are append-only), partition by conversation_id for locality, handles massive scale.

**Redis for presence** -- ephemeral data, needs sub-ms reads.

```
Cassandra - messages table:
  conversation_id  UUID    -- partition key
  message_id       TIMEUUID -- clustering key (time-ordered)
  sender_id        UUID
  content          TEXT
  content_type     VARCHAR  -- "text", "image", "file"
  media_url        TEXT     -- nullable, S3 pre-signed URL
  created_at       TIMESTAMP
  status           VARCHAR  -- "sent", "delivered", "read"

  PRIMARY KEY (conversation_id, message_id)
  -- All messages for a conversation are co-located
  -- Ordered by time within partition

PostgreSQL - conversations/users:
  Table: users (id, name, avatar_url, last_seen)
  Table: conversations (id, type, created_at)
  Table: conversation_members (conversation_id, user_id, joined_at)

Redis - presence:
  key: "presence:{user_id}"
  value: { "status": "online", "last_active": timestamp, "server_id": "chat-server-3" }
  TTL: 60 seconds (heartbeat refreshes)
```

### Step 5: API Design

```
-- WebSocket connection
WS /ws/chat?token=jwt_token

-- WebSocket messages (bidirectional JSON):

Client -> Server:
  { "type": "send_message", "conversation_id": "...", "content": "Hello", "client_msg_id": "uuid" }
  { "type": "typing", "conversation_id": "..." }
  { "type": "read_receipt", "conversation_id": "...", "message_id": "..." }

Server -> Client:
  { "type": "new_message", "conversation_id": "...", "message": {...} }
  { "type": "delivery_receipt", "client_msg_id": "uuid", "message_id": "server-uuid" }
  { "type": "user_typing", "conversation_id": "...", "user_id": "..." }

-- REST APIs for non-real-time operations:
GET /api/v1/conversations
GET /api/v1/conversations/:id/messages?before=cursor&limit=50
POST /api/v1/conversations  (create group)
POST /api/v1/conversations/:id/members
```

### Step 6: Deep Dive

**1. WebSocket Connection Management**

Each chat server maintains a mapping: user_id -> WebSocket connection. When User A sends a message to User B:
- Chat server looks up which server User B is connected to (from Redis)
- Routes message to that server
- That server pushes to User B's WebSocket

```
User A (Server 1) --> Message Service --> lookup User B's server (Redis)
                                      --> route to Server 3
                                      --> Server 3 pushes to User B's WebSocket
```

**2. Offline Message Handling**

If User B is offline:
- Message is stored in DB with status "sent"
- When User B comes online and connects via WebSocket:
  1. Query for all undelivered messages (status != "delivered")
  2. Push them in order
  3. Update status to "delivered"

**3. Group Chat Fan-out**

For a group of 100 members:
- Write message to Kafka topic partitioned by conversation_id
- Consumer reads and fans out to each member's chat server
- For very large groups (1000+), use a tiered approach: batch notifications

### Step 7: Scaling and Trade-offs

- **Chat server scaling**: add more servers, use service discovery (Redis) to track user-to-server mapping
- **Message ordering**: Kafka partition by conversation_id ensures ordering within a conversation
- **Trade-off**: push (WebSocket) vs pull (polling). Push is better for latency, but requires persistent connections and connection management.
- **Trade-off**: storing messages in Cassandra (write-optimized, scalable) vs PostgreSQL (easier to query, harder to scale writes). Cassandra wins for chat's append-heavy pattern.
- **Media messages**: upload to S3 via pre-signed URL, store S3 key in message record

---

## Problem 4: News Feed / Timeline **[SR]**

### Problem Statement
Design the news feed system for a social network (like Twitter's home timeline or Facebook's news feed) that shows posts from followed users, ranked by relevance.

### Step 1: Requirements

**Functional Requirements**
- Users create posts (text, images, videos)
- Users follow other users
- Home feed shows posts from followed users, ranked
- Support pagination (infinite scroll)
- Near-real-time: new posts appear in followers' feeds within seconds

**Non-Functional Requirements**
- Low latency feed retrieval (< 200ms)
- High availability (feed always loads)
- Eventual consistency acceptable (slight delay for new posts OK)
- Scale: 500M users, 10M DAU, average user follows 200 people

### Step 2: Back-of-Envelope Estimation

```
Posts created: 10M DAU * 2 posts/day = 20M posts/day = ~230 posts/sec
Feed reads: 10M DAU * 10 feed refreshes/day = 100M reads/day = ~1,150 reads/sec

Fan-out on write:
  Average followers: 200
  Fan-out writes: 230 posts/sec * 200 = 46,000 feed writes/sec

Storage per feed entry: ~100 bytes (post_id + user_id + timestamp + score)
Pre-computed feed per user: 500 entries * 100B = 50KB
Total feed cache: 10M active users * 50KB = 500GB (Redis cluster)
```

### Step 3: High-Level Architecture

```
                    +------------------+
  Client ---------> |   API Gateway    |
                    +------------------+
                     /        |        \
           +----------+ +----------+ +----------+
           |Post      | |Feed      | |User      |
           |Service   | |Service   | |Service   |
           +----------+ +----------+ +----------+
                |              |           |
           +--------+    +--------+  +--------+
           |Post DB | <--|Fan-out | |Graph DB |
           |(Postgres)|  |Workers | |(follows)|
           +--------+    +--------+  +--------+
                              |
                         +--------+
                         | Feed   |
                         | Cache  |
                         | (Redis)|
                         +--------+
```

### Step 4: Database Design

```
PostgreSQL - Posts:
  Table: posts
    id          BIGSERIAL
    author_id   BIGINT
    content     TEXT
    media_urls  JSONB
    created_at  TIMESTAMP
    like_count  INT
    comment_count INT

  Table: follows
    follower_id   BIGINT
    followee_id   BIGINT
    created_at    TIMESTAMP
    PRIMARY KEY (follower_id, followee_id)

Redis - Pre-computed Feed:
  key: "feed:{user_id}"
  value: sorted set (score = timestamp or ranking score, member = post_id)
  -- Keep only top 500 entries per user
  -- Feed retrieval is O(log N) range query on sorted set
```

### Step 5: API Design

```
POST /api/v1/posts
  Body: { "content": "Hello world", "media_urls": ["s3://..."] }
  Response: { "id": "123", "created_at": "..." }
  Status: 201

GET /api/v1/feed?cursor=timestamp&limit=20
  Response: {
    "posts": [{ "id": "123", "author": {...}, "content": "...", "created_at": "..." }],
    "next_cursor": "2024-01-15T10:30:00Z"
  }

POST /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
```

### Step 6: Deep Dive

**1. Fan-out-on-Write vs Fan-out-on-Read**

```
FAN-OUT-ON-WRITE (Push model):
  User posts --> write to all followers' feed caches immediately

  Pros: feed reads are fast (pre-computed)
  Cons: celebrity problem (user with 10M followers = 10M writes per post)

FAN-OUT-ON-READ (Pull model):
  User requests feed --> query posts from all followed users, merge, rank

  Pros: no write amplification
  Cons: slow reads (merge N timelines on the fly)

HYBRID (what Twitter does):
  - Regular users (<10K followers): fan-out-on-write
  - Celebrities (>10K followers): fan-out-on-read
  - Feed = pre-computed feed + merge celebrity posts at read time
```

**2. Feed Ranking**

Simple: reverse chronological (sort by timestamp).
Advanced: ML-based ranking considering:
- Recency (time decay)
- Engagement signals (likes, comments on the post)
- User affinity (how often you interact with the author)
- Content type preference

For interviews, mention the ranking pipeline but do not go deep unless asked.

**3. Cache Strategy**

- Pre-computed feeds in Redis sorted sets
- Only keep feeds for active users (LRU eviction for inactive)
- On cache miss: compute feed from DB (fan-out-on-read as fallback)
- Cache invalidation: fan-out workers update feed caches

### Step 7: Scaling and Trade-offs

- **Celebrity problem**: hybrid fan-out is the key insight interviewers look for
- **Feed cache size**: 500GB fits in a Redis cluster. Shard by user_id hash.
- **Trade-off**: pre-computation (fast reads, expensive writes) vs on-the-fly (cheap writes, slow reads). Hybrid is the answer.
- **Trade-off**: chronological vs ranked feed. Chronological is simpler and more predictable. Ranked increases engagement but requires ML pipeline.
- **Consistency**: followers see posts within seconds (eventual consistency via async fan-out)

---

## Problem 5: Notification System **[SR]**

### Problem Statement
Design a notification system that can deliver notifications across multiple channels (push, email, SMS, in-app) with priority handling, templates, and throttling.

### Step 1: Requirements

**Functional Requirements**
- Send notifications via push, email, SMS, and in-app channels
- Support notification templates with variable substitution
- Priority levels (critical, high, normal, low)
- User notification preferences (opt-in/opt-out per channel)
- Notification history and read/unread status

**Non-Functional Requirements**
- High throughput (millions of notifications per day)
- Reliable delivery (at-least-once, with retry)
- Low latency for critical notifications (< 5 seconds)
- Rate limiting / throttling to prevent notification fatigue

### Step 2: Back-of-Envelope Estimation

```
10M notifications/day across all channels
Peak: 5x average = ~580 notifications/sec

Breakdown by channel: push 60%, email 25%, SMS 10%, in-app 100% (always)
Push: 350/sec, Email: 145/sec, SMS: 58/sec

Storage: 10M * 500B (notification record) = 5GB/day
Retention: 90 days = 450GB
```

### Step 3: High-Level Architecture

```
  Trigger Events                   +------------------+
  (order confirmed,   -----------> | Notification     |
   payment failed,                 | Service          |
   etc.)                           +------------------+
                                         |
                                   +------------------+
                                   | Priority Queue   |
                                   | (SQS/Kafka)      |
                                   +------------------+
                                    /    |    |     \
                              +------+ +-----+ +----+ +-------+
                              | Push | |Email| |SMS | |In-App |
                              |Worker| |Worker| |Wkr| |Worker |
                              +------+ +-----+ +----+ +-------+
                                |        |       |        |
                              FCM/APNs  SES   Twilio   WebSocket
                                                         /DB

  Supporting Services:
  +----------+  +----------+  +----------+
  |Template  |  |User Pref |  |Throttle  |
  |Service   |  |Service   |  |Service   |
  +----------+  +----------+  +----------+
```

### Step 4: Database Design

```
PostgreSQL:
  Table: notifications
    id              UUID
    user_id         BIGINT
    type            VARCHAR  -- "order_confirmed", "payment_failed"
    channel         VARCHAR  -- "push", "email", "sms", "in_app"
    priority        INT      -- 1=critical, 2=high, 3=normal, 4=low
    template_id     VARCHAR
    template_data   JSONB    -- { "order_id": "123", "amount": "$50" }
    status          VARCHAR  -- "pending", "sent", "delivered", "failed"
    sent_at         TIMESTAMP
    read_at         TIMESTAMP (nullable)
    created_at      TIMESTAMP

  Table: notification_templates
    id              VARCHAR  -- "order_confirmed_email"
    channel         VARCHAR
    subject         TEXT     -- for email
    body            TEXT     -- with {{variable}} placeholders
    version         INT

  Table: user_notification_preferences
    user_id         BIGINT
    channel         VARCHAR
    notification_type VARCHAR
    enabled         BOOLEAN
    quiet_hours_start TIME (nullable)
    quiet_hours_end   TIME (nullable)

DynamoDB (alternative for high-throughput in-app notifications):
  PK: user_id, SK: created_at
  -- Fast retrieval of recent notifications per user
```

### Step 5: API Design

```
-- Internal API (called by other services):
POST /api/v1/notifications/send
  Body: {
    "user_id": "123",
    "type": "order_confirmed",
    "channels": ["push", "email", "in_app"],
    "priority": "high",
    "template_data": { "order_id": "456", "amount": "$50.00" }
  }

-- User-facing API:
GET /api/v1/notifications?unread=true&limit=20&cursor=...
  Response: { "notifications": [...], "unread_count": 5, "next_cursor": "..." }

PUT /api/v1/notifications/:id/read
PUT /api/v1/notifications/read-all

GET /api/v1/notifications/preferences
PUT /api/v1/notifications/preferences
  Body: { "email": { "marketing": false, "transactional": true }, "push": { ... } }
```

### Step 6: Deep Dive

**1. Priority Queue Processing**

Use separate SQS queues per priority level:
- Critical: processed immediately, dedicated workers
- High: slight delay acceptable
- Normal/Low: batch-friendly, can be delayed

Or use a single Kafka topic with partitioning and consumer priorities.

**2. Throttling**

Prevent notification fatigue:
- Per-user rate limit: max 10 notifications/hour (configurable per type)
- Quiet hours: respect user timezone, no notifications between 10pm-8am
- Deduplication: same notification type for same entity within N minutes gets merged
- Implementation: Redis counter per user with TTL

**3. Template Engine**

Templates with variables: "Hi {{user_name}}, your order #{{order_id}} has shipped!"
- Store templates versioned in DB
- Render at send time (not at queue time -- allows template fixes for queued messages)
- Support per-channel templates (email has HTML, push has short text)

### Step 7: Scaling and Trade-offs

- **Fan-out**: a single event (e.g., "flash sale") might trigger millions of notifications. Use a fan-out service that generates individual notification tasks.
- **Third-party rate limits**: email providers (SES), SMS (Twilio) have rate limits. Workers must respect them with backoff.
- **Trade-off**: real-time delivery vs batching. Critical notifications go immediately, low-priority can be batched for efficiency.
- **Trade-off**: push reliability. APNs/FCM are best-effort. Track delivery via callbacks and retry intelligently.
- **DLQ**: failed notifications go to a dead-letter queue for inspection and retry.

---

## Problem 6: Distributed Cache **[SR]**

### Problem Statement
Design a distributed caching system like Redis/Memcached that provides low-latency key-value storage across multiple nodes with high availability.

### Step 1: Requirements

**Functional Requirements**
- GET/SET/DELETE operations with O(1) average time
- TTL support for automatic expiration
- Support for multiple data types (strings, lists, hashes)
- Eviction when memory limit is reached
- Replication for high availability

**Non-Functional Requirements**
- Sub-millisecond latency for reads and writes
- Horizontal scalability (add nodes to increase capacity)
- High availability (no single point of failure)
- Handle 1M+ operations/sec

### Step 2: Back-of-Envelope Estimation

```
1M ops/sec across the cluster
Average value size: 1KB
Total data: 1TB distributed across nodes
Per node (assume 10 nodes): 100GB data, 100K ops/sec
Each node: 128GB RAM (100GB data + overhead)
Network: 100K ops * 1KB = 100MB/sec per node (easily handled by 10Gbps NIC)
```

### Step 3: High-Level Architecture

```
  Clients (with client-side library)
    |
    | (client hashes key to determine node)
    |
    +------+--------+--------+--------+
    |      |        |        |        |
    v      v        v        v        v
  +----+ +----+  +----+  +----+  +----+
  |N1  | |N2  |  |N3  |  |N4  |  |N5  |
  |+R  | |+R  |  |+R  |  |+R  |  |+R  |
  +----+ +----+  +----+  +----+  +----+
    |      |        |        |        |
  +----+ +----+  +----+  +----+  +----+
  |R1  | |R2  |  |R3  |  |R4  |  |R5  |  (replicas)
  +----+ +----+  +----+  +----+  +----+

  N = primary node, R = replica
  Consistent hashing ring determines key -> node mapping
```

### Step 4: Database Design

This is an in-memory system, not a traditional database.

```
Per node, internal data structure:

HashMap<String, CacheEntry>

CacheEntry:
  value: any (string, list, hash, set)
  ttl: timestamp (nullable)
  created_at: timestamp
  last_accessed: timestamp (for LRU)
  size_bytes: int

Eviction tracking (for LRU):
  Doubly-linked list ordered by access time
  HashMap for O(1) lookup
  (Same as LRU Cache LLD problem)
```

### Step 5: API Design

```
-- Wire protocol (Redis-like):

SET key value [EX seconds] [PX milliseconds] [NX|XX]
GET key
DEL key [key ...]
MGET key [key ...]   -- multi-get for batch reads
TTL key
EXPIRE key seconds
INCR key             -- atomic increment
LPUSH key value      -- list operations
HSET key field value -- hash operations

-- HTTP API (for services without native client):
PUT /cache/:key  Body: { "value": "...", "ttl": 3600 }
GET /cache/:key  Response: { "value": "...", "ttl_remaining": 2400 }
DELETE /cache/:key
```

### Step 6: Deep Dive

**1. Consistent Hashing for Key Distribution**

See Building Block #9 for the ring concept. In this design:
- Hash ring with virtual nodes (150 vnodes per physical node)
- Client library computes hash(key) and routes to correct node
- When a node is added, only ~1/N of keys are redistributed
- When a node fails, its keys move to the next node on the ring, and its replica is promoted

**2. Eviction Policies**

| Policy | How | When |
|--------|-----|------|
| LRU (Least Recently Used) | Evict least recently accessed key | General purpose, default |
| LFU (Least Frequently Used) | Evict least frequently accessed key | Access frequency matters |
| TTL-based | Evict expired keys first | When TTL is consistently set |
| Random | Evict random key | When simplicity matters |

Redis uses approximated LRU: sample N random keys, evict the one with oldest access time. This avoids the overhead of maintaining a perfect LRU list.

**3. Hot Key Handling**

Problem: one key gets disproportionate traffic (e.g., celebrity profile, viral post).

Solutions:
- **Local cache**: client-side in-memory cache with short TTL (e.g., 1 second). Reduces load on the cache node.
- **Replicated hot keys**: detect hot keys and replicate them across multiple nodes. Client randomly picks a replica.
- **Key splitting**: "hot_key_1", "hot_key_2", ..., "hot_key_N". Client randomly picks a suffix. Spreads load.

### Step 7: Scaling and Trade-offs

- **Adding nodes**: consistent hashing minimizes data movement. But need to migrate data from existing nodes (background transfer).
- **Replication lag**: async replication means reads from replica may be stale. For cache, this is usually acceptable.
- **Trade-off**: memory vs hit rate. More memory = higher hit rate but higher cost.
- **Trade-off**: consistency vs availability. Redis Cluster uses async replication (AP). A write can be lost if primary fails before replicating.
- **Cache coherence**: in multi-region, cache invalidation across regions adds latency. Accept staleness or use versioned keys.

---

## Problem 7: Task Queue / Job Scheduler **[SR]**

### Problem Statement
Design a distributed task queue and job scheduler that supports delayed execution, priorities, retries, and dead-letter handling. This maps directly to your SQS/Lambda architecture.

### Step 1: Requirements

**Functional Requirements**
- Submit tasks for immediate or delayed execution
- Priority-based processing (urgent tasks first)
- Automatic retries with exponential backoff
- Dead-letter queue for permanently failed tasks
- Task deduplication (idempotency)
- Scheduled/recurring tasks (cron-like)

**Non-Functional Requirements**
- At-least-once execution guarantee
- Horizontal scalability (add workers to increase throughput)
- Reliable (no task loss even during worker failures)
- Support 100K+ tasks/day

### Step 2: Back-of-Envelope Estimation

```
100K tasks/day = ~1.2 tasks/sec average
Peak: 10x = 12 tasks/sec
Average task duration: 5 seconds
Workers needed at peak: 12 * 5 = 60 concurrent workers
With buffer: 100 workers (Lambda handles this trivially with concurrency)

Task metadata: ~1KB per task
Storage: 100K * 1KB = 100MB/day
Retention (30 days): 3GB
```

### Step 3: High-Level Architecture

```
  Producers (any service)
       |
       v
  +------------------+
  | Task API         |
  | (enqueue tasks)  |
  +------------------+
       |
       v
  +------------------+       +------------------+
  | Priority Queues  |       | Scheduler        |
  | (SQS FIFO or    |       | (for delayed/    |
  |  Redis sorted    |       |  recurring tasks)|
  |  sets)           |       +------------------+
  +------------------+              |
       |                            v
       +----------------------------+
       |
       v
  +------------------+
  | Worker Pool      |
  | (Lambda or ECS)  |
  +------------------+
       |
       +--- success --> mark complete
       |
       +--- failure --> retry (exponential backoff)
       |
       +--- max retries exceeded --> Dead Letter Queue
                                         |
                                    +---------+
                                    | DLQ     |
                                    | Monitor |
                                    +---------+
```

### Step 4: Database Design

```
PostgreSQL - Task metadata and history:
  Table: tasks
    id                UUID PRIMARY KEY
    idempotency_key   VARCHAR UNIQUE  -- for dedup
    type              VARCHAR         -- "send_email", "process_order"
    payload           JSONB
    priority          INT             -- 1=highest
    status            VARCHAR         -- "pending","processing","completed","failed","dlq"
    scheduled_at      TIMESTAMP       -- for delayed tasks
    started_at        TIMESTAMP
    completed_at      TIMESTAMP
    retry_count       INT DEFAULT 0
    max_retries       INT DEFAULT 3
    last_error        TEXT
    created_at        TIMESTAMP

  Table: recurring_tasks
    id                UUID
    cron_expression   VARCHAR       -- "0 9 * * MON" (every Monday 9am)
    task_type         VARCHAR
    payload           JSONB
    enabled           BOOLEAN
    last_run_at       TIMESTAMP
    next_run_at       TIMESTAMP     -- indexed for scheduler queries

SQS Queues:
  - task-queue-high-priority (FIFO)
  - task-queue-normal (Standard)
  - task-queue-low (Standard)
  - task-dlq (Standard, for failed tasks)
```

### Step 5: API Design

```
POST /api/v1/tasks
  Body: {
    "type": "send_email",
    "payload": { "to": "user@example.com", "template": "welcome" },
    "priority": "high",
    "delay_seconds": 300,
    "idempotency_key": "email-welcome-user123"
  }
  Response: { "task_id": "uuid", "status": "pending", "scheduled_at": "..." }
  Status: 202 Accepted

GET /api/v1/tasks/:id
  Response: { "id": "...", "status": "completed", "result": {...}, "attempts": 2 }

DELETE /api/v1/tasks/:id  (cancel pending task)

POST /api/v1/tasks/recurring
  Body: {
    "type": "generate_report",
    "cron": "0 9 * * MON",
    "payload": { "report_type": "weekly_sales" }
  }

GET /api/v1/tasks/dlq?limit=20
POST /api/v1/tasks/dlq/:id/retry  (manually retry a DLQ task)
```

### Step 6: Deep Dive

**1. Retry with Exponential Backoff**

```
Retry delay = base_delay * 2^(attempt - 1) + random_jitter

Attempt 1: 1s + jitter
Attempt 2: 2s + jitter
Attempt 3: 4s + jitter
...max 3 retries, then DLQ

Jitter prevents thundering herd when many tasks fail simultaneously.
```

In SQS: configure visibility timeout to increase with each retry. Or use delay queues.

**2. Idempotency**

Problem: at-least-once delivery means a task might execute twice.

Solution:
- Each task has an idempotency_key
- Before processing, check if key has been seen (Redis SET NX or DB unique constraint)
- If already processed, skip
- Your DynamoDB conditional writes experience applies here: `attribute_not_exists(idempotency_key)`

**3. Dead Letter Queue Management**

```
Task fails -> retry 1 -> retry 2 -> retry 3 -> move to DLQ

DLQ monitoring:
- CloudWatch alarm on DLQ message count > 0
- Dashboard showing DLQ depth over time
- Manual retry: move message back to main queue after fixing the issue
- Auto-retry: scheduled job attempts DLQ tasks once per hour with longer backoff
```

This is your daily workflow with SQS DLQs in your Lambda architecture.

### Step 7: Scaling and Trade-offs

- **Worker scaling**: Lambda auto-scales based on queue depth. ECS can use SQS queue depth as auto-scaling metric.
- **Priority handling**: separate queues per priority level, workers poll high-priority first
- **Trade-off**: at-least-once (with idempotency) vs exactly-once. At-least-once + idempotent handlers is simpler and more reliable.
- **Trade-off**: visibility timeout. Too short = duplicate processing. Too long = slow retry on worker failure. Set to 6x expected task duration.
- **Poison messages**: tasks that always fail. DLQ catches these, preventing infinite retry loops.

---

## Problem 8: E-commerce Product Catalog **[SR]**

### Problem Statement
Design a product catalog system for an e-commerce platform that handles product ingestion, search, inventory synchronization, and event-driven updates. This directly maps to your Treez cannabis retail/POS experience.

### Step 1: Requirements

**Functional Requirements**
- CRUD operations for products with rich attributes (name, description, variants, pricing, images)
- Full-text search with faceted filtering (category, price range, brand)
- Real-time inventory sync across multiple sales channels
- Bulk product import/update from suppliers
- Product change events for downstream consumers

**Non-Functional Requirements**
- Search latency < 100ms
- Inventory accuracy (strong consistency for stock levels)
- Handle 1M+ products
- Eventual consistency acceptable for catalog updates (search index may lag)
- Event-driven: changes propagate to all consumers within seconds

### Step 2: Back-of-Envelope Estimation

```
1M products, average 5 variants each = 5M SKUs
Product record: ~5KB (with all attributes)
Total catalog: 5M * 5KB = 25GB (fits in a single PostgreSQL instance)

Read QPS: 10,000 product views/sec (cacheable)
Write QPS: 100 product updates/sec (inventory updates are higher)
Inventory updates: 1,000/sec during peak (POS transactions)

Search index: 25GB + inverted index overhead = ~50GB (Elasticsearch)
```

### Step 3: High-Level Architecture

```
  Admin/Supplier             Customer              POS System
       |                        |                      |
       v                        v                      v
  +-----------+          +-----------+          +-----------+
  |Catalog    |          |Search     |          |Inventory  |
  |Service    |          |Service    |          |Service    |
  +-----------+          +-----------+          +-----------+
       |                      |                      |
       v                      v                      v
  +-----------+         +------------+         +-----------+
  |PostgreSQL |-------->|Elasticsearch|        |PostgreSQL |
  |(products) | CDC     |(search)     |        |(inventory)|
  +-----------+         +------------+         +-----------+
       |                                             |
       +----------+     +----------------------------+
                  |     |
                  v     v
            +------------------+
            | EventBridge      |
            | (product.updated,|
            |  inventory.      |
            |  changed)        |
            +------------------+
               /      |      \
              v       v       v
          +------+ +------+ +------+
          |SQS   | |SQS   | |SQS   |
          |Search| |Price  | |Noti- |
          |Index | |Sync   | |fier  |
          +------+ +------+ +------+
              |       |        |
          Lambda  Lambda   Lambda
```

### Step 4: Database Design

```
PostgreSQL - Product Catalog:
  Table: products
    id              UUID PRIMARY KEY
    name            VARCHAR(255)
    slug            VARCHAR(255) UNIQUE
    description     TEXT
    brand           VARCHAR(100)
    category_id     UUID REFERENCES categories(id)
    status          VARCHAR -- "active", "draft", "archived"
    attributes      JSONB  -- flexible product attributes
    images          JSONB  -- [{ "url": "s3://...", "alt": "...", "order": 1 }]
    created_at      TIMESTAMP
    updated_at      TIMESTAMP

  Table: product_variants
    id              UUID PRIMARY KEY
    product_id      UUID REFERENCES products(id)
    sku             VARCHAR(50) UNIQUE
    name            VARCHAR(100)  -- "Large, Red"
    price_cents     INT
    cost_cents      INT
    weight_grams    INT
    attributes      JSONB  -- { "size": "L", "color": "Red" }

  Table: categories
    id              UUID
    name            VARCHAR
    parent_id       UUID (self-referencing for hierarchy)
    path            LTREE  -- PostgreSQL ltree for hierarchical queries

PostgreSQL - Inventory (separate DB / service):
  Table: inventory
    id              UUID
    sku             VARCHAR REFERENCES product_variants(sku)
    location_id     UUID    -- warehouse/store
    quantity        INT
    reserved        INT     -- held for pending orders
    available       INT GENERATED ALWAYS AS (quantity - reserved)
    updated_at      TIMESTAMP

  -- Use SELECT ... FOR UPDATE for inventory reservation (pessimistic locking)
  -- Or optimistic locking with version column

Elasticsearch - Search Index:
  Index: products
    Mapping:
      name: text (analyzed for full-text search)
      brand: keyword (for exact match / faceting)
      category_path: keyword
      price: integer (for range queries)
      attributes: nested object
      in_stock: boolean
```

### Step 5: API Design

```
-- Product CRUD:
POST   /api/v1/products                Body: { product data }
GET    /api/v1/products/:id
PUT    /api/v1/products/:id            Body: { updated fields }
DELETE /api/v1/products/:id

-- Search:
GET /api/v1/products/search?q=organic+flower&category=edibles&min_price=10&max_price=50&sort=price_asc&page=1&limit=20
  Response: {
    "products": [...],
    "facets": {
      "categories": [{ "name": "Edibles", "count": 42 }],
      "brands": [{ "name": "BrandX", "count": 15 }],
      "price_ranges": [{ "range": "10-25", "count": 30 }]
    },
    "total": 150,
    "page": 1
  }

-- Inventory:
GET  /api/v1/inventory/:sku?location_id=...
PUT  /api/v1/inventory/:sku/adjust  Body: { "quantity_change": -1, "reason": "sale" }
POST /api/v1/inventory/:sku/reserve Body: { "quantity": 2, "order_id": "..." }

-- Bulk Import:
POST /api/v1/products/bulk-import
  Body: { "s3_url": "s3://imports/products-2024-01.csv" }
  Response: { "job_id": "...", "status": "processing" }
  Status: 202 Accepted
```

### Step 6: Deep Dive

**1. Event-Driven Catalog Sync**

When a product is updated in PostgreSQL:
1. Service publishes `product.updated` event to EventBridge
2. EventBridge rules route to:
   - SQS -> Lambda: update Elasticsearch index
   - SQS -> Lambda: sync to external sales channels
   - SQS -> Lambda: invalidate CDN cache for product page

```
Event schema:
{
  "source": "catalog-service",
  "detail-type": "product.updated",
  "detail": {
    "product_id": "uuid",
    "changes": ["price", "description"],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

This is the exact pattern you build with EventBridge in your Treez work.

**2. Inventory Reservation (Preventing Oversell)**

```
-- Pessimistic locking:
BEGIN;
SELECT quantity, reserved FROM inventory WHERE sku = 'ABC' FOR UPDATE;
-- Check: quantity - reserved >= requested_amount
UPDATE inventory SET reserved = reserved + 2 WHERE sku = 'ABC';
COMMIT;

-- Optimistic locking:
UPDATE inventory
SET reserved = reserved + 2, version = version + 1
WHERE sku = 'ABC' AND version = 5 AND (quantity - reserved) >= 2;
-- If 0 rows affected, someone else updated -> retry
```

**3. Search Index Consistency**

PostgreSQL is the source of truth. Elasticsearch is eventually consistent.
- Use Change Data Capture (CDC) or application-level events to keep ES in sync
- If ES is behind, searches might show stale data (stock shown but actually out of stock)
- Mitigation: check real inventory on product detail page and at checkout (not just search results)

### Step 7: Scaling and Trade-offs

- **Read scaling**: CDN for product pages, Redis cache for product details, Elasticsearch for search
- **Write scaling**: inventory updates are the hottest path. Use write-ahead log pattern or event sourcing.
- **Trade-off**: strong consistency (inventory) vs eventual consistency (search). Inventory MUST be strongly consistent to prevent overselling. Search index can lag by seconds.
- **Trade-off**: denormalized search index (fast queries) vs normalized DB (data integrity). Both, synced via events.
- **Bulk imports**: process asynchronously via S3 -> Lambda -> batch DB writes to avoid blocking the API

---

## Problem 9: Real-time Analytics Dashboard **[SR]**

### Problem Statement
Design a real-time analytics dashboard that ingests event streams, computes aggregations, and displays live-updating metrics to users.

### Step 1: Requirements

**Functional Requirements**
- Ingest high-volume events (page views, clicks, transactions)
- Real-time aggregations (counts, sums, averages, percentiles) over time windows
- Dashboard with live-updating charts (updates every few seconds)
- Support custom queries: filter by dimension, group by time interval
- Historical data queries (last 7 days, 30 days)

**Non-Functional Requirements**
- Event ingestion latency: < 5 seconds from event to dashboard
- Query latency: < 500ms for dashboard queries
- Handle 100K events/sec at peak
- Data durability (no event loss)

### Step 2: Back-of-Envelope Estimation

```
100K events/sec peak
Average event size: 200 bytes
Ingestion bandwidth: 100K * 200B = 20MB/sec

Storage (raw events):
  100K * 200B * 86400 = ~1.7TB/day
  30-day retention: ~51TB raw (need aggregation/rollup strategy)

Pre-aggregated data:
  1-minute buckets, 100 metric types, 1000 dimension combos
  = 100K records/minute = 144M records/day at ~100B each = 14GB/day
  30-day retention: ~420GB (much more manageable)
```

### Step 3: High-Level Architecture

```
  Event Sources (web, mobile, backend services)
       |
       v
  +------------------+
  | Event Ingestion  |  (Kafka / Kinesis)
  | (append-only log)|
  +------------------+
       |            |
       v            v
  +---------+  +-----------+
  |Stream   |  |Batch      |
  |Processor|  |Processor  |
  |(Flink/  |  |(hourly/   |
  | Lambda) |  | daily     |
  +---------+  | rollups)  |
       |       +-----------+
       v            |
  +-----------+     |
  |Time-Series|<----+
  |DB         |
  |(TimescaleDB|
  | or ClickHouse)
  +-----------+
       |
       v
  +-----------+       +------------------+
  |Query API  |<----->| Dashboard (React)|
  +-----------+       | (WebSocket for   |
       |              |  live updates)   |
       |              +------------------+
  (also serves
   REST for
   historical)
```

### Step 4: Database Design

**Choice: TimescaleDB** (PostgreSQL extension for time-series) or ClickHouse (columnar, fast aggregations).

```
TimescaleDB:
  Table: events_raw (hypertable, partitioned by time)
    event_id        UUID
    event_type      VARCHAR     -- "page_view", "click", "purchase"
    timestamp       TIMESTAMPTZ -- partition key
    user_id         VARCHAR
    session_id      VARCHAR
    properties      JSONB       -- { "page": "/home", "device": "mobile" }
    amount_cents    INT         -- for purchase events

  Table: metrics_1min (continuous aggregate / materialized view)
    bucket          TIMESTAMPTZ  -- 1-minute bucket
    event_type      VARCHAR
    dimension_key   VARCHAR      -- e.g., "page=/home"
    count           BIGINT
    sum_amount      BIGINT
    avg_amount      DOUBLE
    p95_latency     DOUBLE

  Table: metrics_1hour (rolled up from 1min)
    bucket          TIMESTAMPTZ
    event_type      VARCHAR
    dimension_key   VARCHAR
    count           BIGINT
    sum_amount      BIGINT

  -- Retention policies:
  -- raw events: 7 days
  -- 1-min aggregates: 30 days
  -- 1-hour aggregates: 1 year
  -- 1-day aggregates: forever
```

### Step 5: API Design

```
-- Event ingestion:
POST /api/v1/events/batch
  Body: {
    "events": [
      { "type": "page_view", "timestamp": "...", "properties": { "page": "/home" } },
      { "type": "purchase", "timestamp": "...", "amount_cents": 5000 }
    ]
  }
  Status: 202 Accepted

-- Dashboard queries:
GET /api/v1/metrics?event_type=page_view&interval=1m&from=2024-01-15T00:00&to=2024-01-15T23:59&group_by=page
  Response: {
    "buckets": [
      { "timestamp": "2024-01-15T10:00", "count": 1234, "dimensions": { "/home": 800, "/products": 434 } },
      ...
    ]
  }

-- Live updates via WebSocket:
WS /ws/metrics?event_type=page_view&interval=5s
  Server pushes: { "timestamp": "...", "count": 42, "delta": 5 }
```

### Step 6: Deep Dive

**1. Stream Processing Pipeline**

```
Kafka Topic: raw-events (partitioned by event_type)
       |
       v
Stream Processor (Flink / Kinesis Data Analytics / Lambda):
  - Window: tumbling 1-minute window
  - Aggregate: count, sum, avg per (event_type, dimension)
  - Output: write to metrics_1min table
  - Also: trigger alerts if metric exceeds threshold
```

**2. Pre-aggregation Strategy (Lambda Architecture Lite)**

- **Speed layer**: stream processor computes real-time 1-minute aggregates
- **Batch layer**: hourly job rolls up 1-minute -> 1-hour aggregates, daily job rolls up to 1-day
- **Serving layer**: query API reads from the appropriate aggregation level based on time range
  - Last hour: 1-minute buckets
  - Last day: 1-minute buckets
  - Last week: 1-hour buckets
  - Last month: 1-hour buckets
  - Last year: 1-day buckets

**3. WebSocket Live Updates**

Dashboard opens WebSocket connection with subscription:
- Server pushes latest aggregated metric every 5 seconds
- Client merges with existing chart data
- On disconnect/reconnect: REST API backfills the gap

### Step 7: Scaling and Trade-offs

- **Kafka partitioning**: partition by event_type for parallel processing. If one event type is hot, further partition by hash.
- **Trade-off**: real-time accuracy vs query speed. Pre-aggregation makes queries fast but loses granularity. Keep raw data for drill-down.
- **Trade-off**: storage cost vs query range. Rollup reduces storage massively but cannot query sub-minute data after 30 days.
- **Hot dimensions**: if dashboard queries always filter by the same dimension, pre-aggregate by that dimension.
- **Backpressure**: if stream processor is overwhelmed, Kafka buffers. But dashboard may lag. Alert on consumer lag.

---

## Problem 10: File/Image Upload Service **[SR]**

### Problem Statement
Design a service that handles file and image uploads, processes them (resize, transcode), and serves them globally via CDN. Maps directly to your S3 experience.

### Step 1: Requirements

**Functional Requirements**
- Upload files (images, documents, videos) up to 5GB
- Image processing: resize, crop, generate thumbnails, format conversion
- Serve files via CDN with low latency globally
- Access control (private files, time-limited access)
- Metadata storage and search

**Non-Functional Requirements**
- Upload reliability (resume on failure for large files)
- Processing latency: thumbnails within 30 seconds of upload
- High availability for serving (11 9s durability via S3)
- Scale to 10M uploads/day

### Step 2: Back-of-Envelope Estimation

```
10M uploads/day = ~115 uploads/sec
Average file size: 2MB (mix of images and documents)
Peak upload bandwidth: 115 * 2MB = 230MB/sec
Daily storage growth: 10M * 2MB = 20TB/day
Monthly storage: 600TB

Thumbnail generation: 115 images/sec
Each thumbnail: 3 sizes = 345 resize operations/sec
Processing time: ~2s per image = 690 concurrent workers at peak
```

### Step 3: High-Level Architecture

```
  Client
    |
    | 1. Request pre-signed URL
    v
  +------------------+
  | Upload Service   | 2. Generate pre-signed URL
  | (API)            |----> return to client
  +------------------+
    |
    | 3. Client uploads directly to S3
    v
  +------------------+       +------------------+
  |      S3          |------>| S3 Event         |
  | (raw uploads)    | event | Notification     |
  +------------------+       +------------------+
                                    |
                                    v
                             +------------------+
                             | Processing Queue |
                             | (SQS)            |
                             +------------------+
                                    |
                                    v
                             +------------------+
                             | Image Processor  |
                             | (Lambda)         |
                             +------------------+
                                    |
                             +------+------+
                             |             |
                             v             v
                        +--------+   +----------+
                        | S3     |   | Metadata  |
                        |(thumbs)|   | DB        |
                        +--------+   +----------+
                             |
                             v
                        +----------+
                        | CloudFront|
                        | (CDN)     |
                        +----------+
                             |
                             v
                          Clients
```

### Step 4: Database Design

```
PostgreSQL - File Metadata:
  Table: files
    id              UUID PRIMARY KEY
    user_id         UUID
    original_name   VARCHAR(255)
    content_type    VARCHAR(100)   -- "image/jpeg", "application/pdf"
    size_bytes      BIGINT
    s3_key          VARCHAR(500)   -- "uploads/user123/uuid.jpg"
    status          VARCHAR        -- "uploading", "processing", "ready", "failed"
    variants        JSONB          -- { "thumb_sm": "s3://...", "thumb_lg": "s3://..." }
    metadata        JSONB          -- EXIF data, dimensions, etc.
    is_public       BOOLEAN
    created_at      TIMESTAMP

  Index on (user_id, created_at) for listing user's files
  Index on content_type for filtering

S3 Bucket Structure:
  uploads/
    {user_id}/
      {file_id}/
        original.jpg
        thumb_small.jpg   (150x150)
        thumb_medium.jpg  (400x400)
        thumb_large.jpg   (800x800)
```

### Step 5: API Design

```
-- Request upload URL:
POST /api/v1/files/upload-url
  Body: { "filename": "photo.jpg", "content_type": "image/jpeg", "size_bytes": 2048000 }
  Response: {
    "file_id": "uuid",
    "upload_url": "https://s3.amazonaws.com/bucket/...?X-Amz-Signature=...",
    "expires_in": 3600
  }

-- Confirm upload complete (or rely on S3 event):
POST /api/v1/files/:id/complete

-- Get file info:
GET /api/v1/files/:id
  Response: {
    "id": "uuid",
    "status": "ready",
    "urls": {
      "original": "https://cdn.example.com/uploads/.../original.jpg",
      "thumb_small": "https://cdn.example.com/uploads/.../thumb_small.jpg"
    },
    "metadata": { "width": 4032, "height": 3024 }
  }

-- Get download URL (for private files):
GET /api/v1/files/:id/download-url
  Response: { "url": "https://...signed...", "expires_in": 3600 }

-- List user files:
GET /api/v1/files?page=1&limit=20&content_type=image
```

### Step 6: Deep Dive

**1. Pre-signed URL Flow**

```
Why pre-signed URLs?
  - File never touches your servers (saves bandwidth and compute)
  - Client uploads directly to S3
  - URL is time-limited and scoped to specific key and operation

Generation (in your Lambda):
  const url = s3.getSignedUrl('putObject', {
    Bucket: 'uploads',
    Key: `uploads/${userId}/${fileId}/original`,
    ContentType: 'image/jpeg',
    Expires: 3600  // 1 hour
  });
```

**2. Processing Pipeline**

```
S3 Event (ObjectCreated) --> SQS --> Lambda (processor)

Lambda processor:
  1. Download original from S3
  2. Validate (file type, size, virus scan)
  3. Generate variants:
     - thumb_small: 150x150 (center crop)
     - thumb_medium: 400x400 (fit within)
     - thumb_large: 800x800 (fit within)
  4. Upload variants to S3
  5. Extract metadata (EXIF, dimensions)
  6. Update file record in DB (status = "ready", variants, metadata)
  7. Publish "file.ready" event to EventBridge

For videos: use AWS MediaConvert (managed transcoding)
```

**3. Multipart Upload for Large Files**

Files > 100MB should use multipart upload:
1. Initiate multipart upload (get upload ID)
2. Upload parts in parallel (each 5-100MB)
3. Complete multipart upload (S3 assembles)
4. On failure: retry individual parts, or abort and clean up

Client library handles this. Your backend provides the initiation and completion endpoints.

### Step 7: Scaling and Trade-offs

- **Processing scaling**: Lambda auto-scales based on SQS queue depth. For CPU-heavy processing (video), use ECS with GPU instances.
- **CDN caching**: CloudFront caches files at edge. Invalidation is slow and costly -- use versioned URLs instead (append hash to filename).
- **Trade-off**: eager processing (generate all variants on upload) vs lazy processing (generate on first request). Eager is simpler, lazy saves storage for unused variants.
- **Trade-off**: pre-signed URLs (secure, scalable) vs proxy through your server (simpler client, but your server handles all traffic).
- **Cost**: S3 storage tiers. Use lifecycle policies: Standard -> IA after 30 days -> Glacier after 90 days for old files.

---

## Problem 11: Search Autocomplete **[SR]**

### Problem Statement
Design a search autocomplete system that suggests completions as users type, ranked by popularity, with low latency.

### Step 1: Requirements

**Functional Requirements**
- Return top 5-10 suggestions as user types each character
- Rank suggestions by popularity (search frequency)
- Support personalization (user's recent searches)
- Filter inappropriate/blocked suggestions
- Update rankings based on new search data

**Non-Functional Requirements**
- Latency < 50ms per keystroke
- High availability (degraded experience is OK, no suggestions is not)
- Handle 100K+ concurrent users typing
- Suggestions should reflect recent trends within minutes

### Step 2: Back-of-Envelope Estimation

```
100K concurrent users, each types ~10 characters per search
Keystrokes per second: 100K * 10 / 10 seconds (typing speed) = 100K QPS
Each request: prefix lookup + rank + return top 10

Trie storage:
  Assume 10M unique search queries
  Average query length: 20 characters
  Trie nodes: ~200M (upper bound, with sharing)
  Per node: 50 bytes (character, children pointers, frequency)
  Total: 200M * 50B = 10GB (fits in memory)
```

### Step 3: High-Level Architecture

```
  User types "how to"
       |
       v
  +------------------+
  | API Gateway      |
  | (with caching)   |
  +------------------+
       |
       v
  +------------------+
  | Autocomplete     |
  | Service          |
  | (in-memory trie) |
  +------------------+
       |
  +----+----+
  |         |
  v         v
+------+ +-------+
|Redis | |Trie   |
|Cache | |Builder|
|(hot  | |(batch)|
| pfxs)| +-------+
+------+     |
             v
        +----------+
        |Analytics |
        |DB (search|
        |logs)     |
        +----------+
```

### Step 4: Database Design

```
-- Search logs (for ranking):
Table: search_logs (append-only, in Kafka or analytics DB)
  query           VARCHAR
  user_id         VARCHAR
  timestamp       TIMESTAMP
  result_count    INT

-- Aggregated frequencies (materialized periodically):
Table: query_frequencies
  prefix          VARCHAR PRIMARY KEY  -- "how", "how t", "how to"
  query           VARCHAR              -- full query
  frequency       BIGINT               -- search count
  last_updated    TIMESTAMP

Redis Cache:
  key: "autocomplete:{prefix}"  -- e.g., "autocomplete:how t"
  value: ["how to cook", "how to tie", "how to invest", ...]
  TTL: 5 minutes (frequently accessed prefixes stay warm)
```

### Step 5: API Design

```
GET /api/v1/autocomplete?q=how+to&limit=10
  Response: {
    "suggestions": [
      { "text": "how to cook rice", "score": 95000 },
      { "text": "how to tie a tie", "score": 87000 },
      { "text": "how to invest in stocks", "score": 72000 }
    ]
  }

-- The client should debounce requests (wait 100-200ms after last keystroke)
-- The client should cancel previous in-flight requests when new character is typed
```

### Step 6: Deep Dive

**1. Trie-Based Approach**

```
Trie structure:

        root
       / | \
      h   w  ...
      |
      o
      |
      w
     / \
    (space) s
    |       |
    t       (end: "hows")
    |
    o
    |
   (end: "how to")
    |
   [cook: 95000, tie: 87000, invest: 72000, ...]

Each node stores:
  - character
  - children (hash map or array)
  - top K suggestions for this prefix (pre-computed)
  - is_end_of_word flag
```

Pre-computing top K suggestions at each node means lookup is O(prefix_length) -- no need to explore the entire subtree at query time.

**2. Ranking by Popularity**

Frequency data collection:
1. Every search is logged to Kafka
2. Batch job (every 5-15 minutes) aggregates frequencies
3. Trie builder rebuilds the trie with updated frequencies
4. New trie is swapped in atomically (double-buffering)

For trending queries: use exponential decay -- recent searches weighted higher than older ones.

```
score = sum(frequency_i * decay^(now - timestamp_i))
```

**3. Caching Strategy**

Most prefixes follow a power law: top 10% of prefixes account for 90% of requests.

```
Layer 1: CDN cache (CloudFront) -- cache common prefixes at edge
Layer 2: Redis cache -- prefix -> suggestions, TTL 5 min
Layer 3: In-memory trie -- fallback for cache misses

Cache key: "autocomplete:{normalized_prefix}"
Normalization: lowercase, trim, collapse whitespace
```

### Step 7: Scaling and Trade-offs

- **Data freshness vs rebuild cost**: more frequent trie rebuilds = fresher suggestions but higher compute. 15-minute rebuild cycle is a good balance.
- **Personalization**: merge global suggestions with user's recent searches (stored in Redis per user). Client-side merge to avoid extra server round trip.
- **Trade-off**: trie in memory (fast, limited by RAM) vs Elasticsearch prefix queries (flexible, higher latency). Trie for pure autocomplete, ES if you also need fuzzy matching.
- **Scaling**: shard tries by prefix range (a-m on shard 1, n-z on shard 2). Or replicate the full trie on each node (10GB is manageable).
- **Filtered content**: maintain a blocklist. Filter at trie build time and at query time (double protection).

---

## Problem 12: Event-Driven Order Processing Pipeline **[SR]**

### Problem Statement
Design an event-driven order processing pipeline that handles the full order lifecycle (placement, payment, fulfillment, delivery) using the saga pattern with compensating transactions. This directly maps to your daily work with EventBridge, SQS, and Lambda.

### Step 1: Requirements

**Functional Requirements**
- Place orders with multiple items
- Process payments (authorize, capture, refund)
- Reserve and decrement inventory
- Handle fulfillment (pick, pack, ship)
- Send notifications at each stage
- Handle failures at any stage with compensation (rollback)

**Non-Functional Requirements**
- No data loss (every order must be processed or explicitly failed)
- Eventual consistency across services (no distributed transactions)
- Idempotent operations (at-least-once message delivery)
- Complete audit trail of all state changes
- Handle 10K orders/hour at peak

### Step 2: Back-of-Envelope Estimation

```
10K orders/hour = ~3 orders/sec
Each order triggers ~8 events across the pipeline
Total events: 24 events/sec
Each event: ~2KB payload
Event throughput: 48KB/sec (trivial for EventBridge/SQS)

State storage: 10K orders/hour * 24 hours * 500B = 120MB/day
30-day retention: 3.6GB
```

### Step 3: High-Level Architecture

```
  Client
    |
    v
  +-----------+
  |Order API  |
  +-----------+
    |
    v (OrderPlaced event)
  +------------------+
  | EventBridge      |
  +------------------+
    |         |         |         |
    v         v         v         v
  +------+ +------+ +------+ +------+
  |SQS:  | |SQS:  | |SQS:  | |SQS:  |
  |Payment| |Inven | |Fulfil| |Notif |
  +------+ +------+ +------+ +------+
    |         |         |         |
    v         v         v         v
  Lambda   Lambda    Lambda    Lambda
    |         |         |
    v         v         v
  (PaymentAuthorized) (InventoryReserved) (events back to EventBridge)
    |
    v
  +------------------+
  | Order State      |  (tracks saga state)
  | Machine / DB     |
  +------------------+

  COMPENSATION FLOW (on failure):
  PaymentFailed --> publish CompensateInventory --> release reserved stock
  InventoryInsufficient --> publish CompensatePayment --> void authorization
```

### Step 4: Database Design

```
PostgreSQL - Orders:
  Table: orders
    id              UUID PRIMARY KEY
    user_id         UUID
    status          VARCHAR  -- state machine states (see below)
    total_cents     INT
    items           JSONB
    shipping_address JSONB
    created_at      TIMESTAMP
    updated_at      TIMESTAMP

  Table: order_items
    id              UUID
    order_id        UUID REFERENCES orders(id)
    product_id      UUID
    sku             VARCHAR
    quantity        INT
    unit_price_cents INT

  Table: order_events (event sourcing / audit trail)
    id              UUID
    order_id        UUID
    event_type      VARCHAR  -- "OrderPlaced", "PaymentAuthorized", "InventoryReserved"
    payload         JSONB
    created_at      TIMESTAMP
    -- This is your audit trail. Append-only. Never update or delete.

  Table: idempotency_keys
    key             VARCHAR PRIMARY KEY  -- event_id or message_id
    processed_at    TIMESTAMP
    result          JSONB
    -- Used to deduplicate event processing

State Machine States:
  PLACED -> PAYMENT_PENDING -> PAYMENT_AUTHORIZED -> INVENTORY_RESERVED
    -> FULFILLMENT_PENDING -> SHIPPED -> DELIVERED

  Failure states:
  PAYMENT_FAILED -> CANCELLED
  INVENTORY_INSUFFICIENT -> PAYMENT_VOIDED -> CANCELLED
  FULFILLMENT_FAILED -> REFUNDED -> CANCELLED
```

### Step 5: API Design

```
POST /api/v1/orders
  Body: {
    "items": [{ "sku": "ABC", "quantity": 2 }],
    "shipping_address": { ... },
    "payment_method_id": "pm_123",
    "idempotency_key": "client-generated-uuid"
  }
  Response: { "order_id": "uuid", "status": "placed" }
  Status: 202 Accepted  (async processing begins)

GET /api/v1/orders/:id
  Response: {
    "id": "uuid",
    "status": "payment_authorized",
    "items": [...],
    "events": [
      { "type": "OrderPlaced", "at": "..." },
      { "type": "PaymentAuthorized", "at": "..." }
    ]
  }

GET /api/v1/orders/:id/events  (full event history)
POST /api/v1/orders/:id/cancel
```

### Step 6: Deep Dive

**1. Saga Pattern -- Choreography**

Each service listens for events and publishes its result. No central coordinator.

```
Happy Path:
  OrderService: publishes OrderPlaced
  PaymentService: listens OrderPlaced -> authorizes payment -> publishes PaymentAuthorized
  InventoryService: listens PaymentAuthorized -> reserves stock -> publishes InventoryReserved
  FulfillmentService: listens InventoryReserved -> starts fulfillment -> publishes OrderShipped
  NotificationService: listens to ALL events -> sends appropriate notifications

Failure Path (inventory insufficient):
  InventoryService: listens PaymentAuthorized -> insufficient stock -> publishes InventoryInsufficient
  PaymentService: listens InventoryInsufficient -> voids payment auth -> publishes PaymentVoided
  OrderService: listens PaymentVoided -> updates order status to CANCELLED
  NotificationService: listens InventoryInsufficient -> notifies user
```

**2. State Machine Implementation**

```
Valid transitions (enforced in code):

  PLACED:
    + PaymentAuthorized -> PAYMENT_AUTHORIZED
    + PaymentFailed -> CANCELLED

  PAYMENT_AUTHORIZED:
    + InventoryReserved -> INVENTORY_RESERVED
    + InventoryInsufficient -> PAYMENT_VOID_PENDING

  INVENTORY_RESERVED:
    + FulfillmentStarted -> FULFILLMENT_PENDING

  FULFILLMENT_PENDING:
    + OrderShipped -> SHIPPED

  SHIPPED:
    + OrderDelivered -> DELIVERED

Invalid transitions are rejected and logged as anomalies.
```

**3. Idempotency in Practice**

Every Lambda handler follows this pattern:

```
async function handleEvent(event) {
  const eventId = event.detail.eventId;

  // Check if already processed
  const existing = await db.query(
    'SELECT result FROM idempotency_keys WHERE key = $1',
    [eventId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].result;  // Already processed, return cached result
  }

  // Process the event
  const result = await processOrder(event);

  // Record idempotency key
  await db.query(
    'INSERT INTO idempotency_keys (key, processed_at, result) VALUES ($1, NOW(), $2)',
    [eventId, JSON.stringify(result)]
  );

  return result;
}
```

**4. DLQ Handling**

```
SQS Queue --> Lambda (max 3 retries) --> DLQ

DLQ monitoring:
  - CloudWatch Alarm: DLQ message count > 0
  - Lambda polls DLQ periodically:
    1. Log the failed message with full context
    2. Publish to monitoring/alerting
    3. Optionally retry after a delay (exponential backoff)
    4. If still failing, create a support ticket/incident

  - Manual DLQ redrive: SQS now supports native redrive (move messages back to source queue)
```

### Step 7: Scaling and Trade-offs

- **EventBridge**: handles event routing at scale, content-based filtering reduces unnecessary processing
- **SQS per consumer**: each service has its own queue, preventing one slow consumer from blocking others
- **Trade-off**: choreography (loose coupling, hard to debug) vs orchestration with Step Functions (visible flow, tighter coupling). Use choreography for simple flows, orchestration for complex multi-step workflows.
- **Trade-off**: event sourcing (full audit trail, replay capability) vs state-based (simpler, faster queries). In order processing, event sourcing is strongly recommended for compliance and debugging.
- **Exactly-once illusion**: achieve it via at-least-once delivery + idempotent handlers. This is the practical approach.
- **Timeout handling**: if no event received within expected time (e.g., payment response within 5 minutes), a watchdog process publishes a timeout event to trigger compensation.
