# Distributed Cache

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
