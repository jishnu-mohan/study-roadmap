# News Feed / Timeline

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
