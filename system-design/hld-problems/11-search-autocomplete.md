# Search Autocomplete

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
