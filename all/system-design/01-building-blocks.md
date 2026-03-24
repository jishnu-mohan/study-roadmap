# System Design Building Blocks

A reference guide for the 15 fundamental building blocks that appear in nearly every system design interview. Each block includes spaced repetition tags, internals, trade-offs, and mappings to AWS services and tools from your day-to-day stack.

---

## 1. Scalability **[SR]**

### What It Is
The ability of a system to handle increased load by adding resources. Two axes: vertical (bigger machine) and horizontal (more machines).

### How It Works

```
VERTICAL SCALING               HORIZONTAL SCALING
+------------+                 +------+  +------+  +------+
|            |                 | Node |  | Node |  | Node |
|  BIGGER    |                 |  1   |  |  2   |  |  3   |
|  MACHINE   |                 +------+  +------+  +------+
|  (CPU/RAM) |                      \       |       /
|            |                       \      |      /
+------------+                    +------------------+
                                  |  Load Balancer   |
                                  +------------------+
```

**Vertical scaling** -- upgrade CPU, RAM, disk on a single node. Simple but has a ceiling (hardware limits) and a single point of failure.

**Horizontal scaling** -- add more identical nodes behind a load balancer. Requires stateless services (no local session state) so any node can handle any request.

**Stateless services** -- store session/state externally (Redis, DynamoDB) so each request is independent of which node handles it. This is the prerequisite for horizontal scaling.

**Auto-scaling** -- dynamically adjust node count based on metrics (CPU, request count, queue depth). AWS Auto Scaling Groups watch CloudWatch metrics and launch/terminate EC2 instances or Lambda concurrency adjusts automatically.

### Key Trade-offs

| Gain | Lose |
|------|------|
| Vertical: simplicity, no distributed coordination | Hardware ceiling, single point of failure |
| Horizontal: near-infinite scale, fault tolerance | Complexity: load balancing, state management, data consistency |

### When to Use (Interview Triggers)
- Any time the interviewer says "millions of users" or "handle 10x traffic spike"
- Mention horizontal scaling as default, vertical scaling as quick win for databases

### Real-World Mapping
- **Lambda**: horizontally scales automatically per invocation (your daily experience)
- **Auto Scaling Groups**: EC2 horizontal scaling
- **RDS**: vertical scaling (instance size) + read replicas for horizontal read scaling
- **DynamoDB**: horizontal scaling via automatic partitioning (on-demand mode)

---

## 2. Load Balancing **[SR]**

### What It Is
Distributes incoming network traffic across multiple servers to ensure no single server is overwhelmed. Sits between clients and backend services.

### How It Works

```
                    Client Requests
                         |
                         v
                +------------------+
                |  Load Balancer   |
                |  (L4 or L7)     |
                +------------------+
               /        |          \
              v          v          v
         +--------+ +--------+ +--------+
         |Server 1| |Server 2| |Server 3|
         +--------+ +--------+ +--------+
```

**L4 (Transport Layer)** -- routes based on IP + port. Faster, no payload inspection. AWS NLB operates here.

**L7 (Application Layer)** -- routes based on HTTP headers, URL path, cookies. Can do content-based routing, SSL termination, path-based routing. AWS ALB operates here.

### Algorithms

| Algorithm | How It Works | Best For |
|-----------|-------------|----------|
| Round Robin | Rotate through servers sequentially | Equal-capacity servers, stateless |
| Weighted Round Robin | Assign weights to servers (3:1 ratio) | Mixed-capacity servers |
| Least Connections | Send to server with fewest active connections | Varying request durations |
| IP Hash | Hash client IP to pick server | Session affinity without cookies |
| Consistent Hashing | Hash ring, minimal redistribution on add/remove | Cache layers, stateful partitioning |

### Health Checks
Load balancers ping servers periodically (e.g., GET /health every 30s). Unhealthy servers are removed from the pool. Configurable thresholds: healthy after N successes, unhealthy after M failures.

### Key Trade-offs

| Gain | Lose |
|------|------|
| High availability, even load distribution | Added network hop (latency), single point of failure if LB not redundant |
| L7: smart routing, SSL offload | L7: higher latency than L4, more compute at LB |

### When to Use (Interview Triggers)
- Literally every system design -- always draw an LB in front of your service fleet
- "How do you handle server failures?" -- health checks
- "How do you do canary deployments?" -- weighted routing at L7

### Real-World Mapping
- **ALB (Application Load Balancer)**: L7, path-based routing, integrates with Lambda and ECS. You use this with API Gateway alternatives.
- **NLB (Network Load Balancer)**: L4, ultra-low latency, static IPs
- **API Gateway**: also acts as L7 LB for Lambda functions with throttling built in

---

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

---

## 4. CDN (Content Delivery Network) **[SR]**

### What It Is
A geographically distributed network of edge servers that cache and serve content close to users, reducing latency and offloading origin servers.

### How It Works

```
User (Mumbai)                    User (New York)
     |                                |
     v                                v
+----------+                    +----------+
|Edge Node |                    |Edge Node |
| Mumbai   |                    | New York |
+----------+                    +----------+
     |  (cache miss)                  |  (cache hit -> serve directly)
     v
+----------+
|  Origin  |
|  Server  |
+----------+
```

### Push vs Pull CDN

| Type | How | When |
|------|-----|------|
| **Pull** | Edge fetches from origin on first request, caches with TTL | Most common. Good for dynamic or large catalogs. |
| **Push** | You upload content to CDN proactively | Small, predictable content sets (e.g., static site assets) |

### Key Trade-offs

| Gain | Lose |
|------|------|
| Lower latency for global users | Cache invalidation complexity, cost per GB transferred |
| Reduced origin load | Stale content risk, debugging is harder (which edge served it?) |

### When to Use (Interview Triggers)
- "Users are globally distributed"
- "Serve static assets (images, JS, CSS)"
- "Video streaming" -- CDN is essential

### Real-World Mapping
- **CloudFront**: AWS CDN. You can put it in front of S3 (static assets), API Gateway (API caching), or ALB
- CloudFront + S3: your standard pattern for serving user-uploaded images with pre-signed URLs
- **Lambda@Edge / CloudFront Functions**: run code at the edge for request/response manipulation

---

## 5. Database Selection **[SR]**

### What It Is
Choosing the right database type based on data model, access patterns, consistency requirements, and scale needs.

### Decision Framework

```
What does your data look like?
         |
    +----+----+
    |         |
Structured   Unstructured / Semi-structured
(relations,  (flexible schema, nested docs)
 joins,       |
 ACID)        +----> Document DB (DynamoDB, MongoDB)
    |
    v
Relational DB (PostgreSQL, MySQL)

Access Pattern?
    |
    +--- Key-value lookups --> Redis, DynamoDB
    +--- Wide column / time series --> Cassandra, TimescaleDB
    +--- Graph traversals --> Neo4j
    +--- Full-text search --> Elasticsearch
```

### Database Comparison

| Type | Example | Strengths | Weaknesses | Use When |
|------|---------|-----------|------------|----------|
| Relational | PostgreSQL | ACID, joins, mature tooling | Horizontal scaling is hard | Complex queries, transactions, data integrity matters |
| Document | DynamoDB, MongoDB | Flexible schema, horizontal scale | No joins (DynamoDB), eventual consistency | Known access patterns, denormalized data |
| Key-Value | Redis, DynamoDB | Sub-ms reads, simple API | No complex queries | Caching, sessions, leaderboards |
| Wide-Column | Cassandra | Write-heavy, time-series, massive scale | No joins, limited query flexibility | IoT, event logs, time-series |
| Graph | Neo4j | Relationship traversals | Not general purpose | Social networks, recommendations |

### Key Trade-offs
- **SQL**: consistency and query flexibility at the cost of horizontal scaling complexity
- **NoSQL**: scale and flexibility at the cost of consistency guarantees and query power

### When to Use (Interview Triggers)
- Always justify your DB choice: "I chose PostgreSQL because we need transactions for payment processing" or "DynamoDB because access is purely key-based and we need single-digit ms latency at scale"
- Multi-database designs are common: PostgreSQL for transactions + Redis for caching + Elasticsearch for search

### Real-World Mapping
- **PostgreSQL (RDS)**: your primary relational DB experience
- **DynamoDB**: your NoSQL experience, single-table design, on-demand scaling
- **Redis (ElastiCache)**: caching and ephemeral data
- In your Treez work: likely PostgreSQL for inventory/orders (ACID) + DynamoDB for high-throughput event logs

---

## 6. Database Scaling **[SR]**

### What It Is
Techniques to handle growing data volume and query load beyond what a single database server can handle.

### How It Works

```
REPLICATION (Read Scaling)

  Writes           Reads (distributed)
    |              /       |       \
    v             v        v        v
+--------+  +--------+ +--------+ +--------+
| Leader |->|Replica | |Replica | |Replica |
|  (RW)  |  | (RO)  | | (RO)  | | (RO)  |
+--------+  +--------+ +--------+ +--------+
     (async replication, slight lag)


SHARDING (Write Scaling)

  Request --> Shard Key (e.g., user_id % 4)
                |
    +-----------+-----------+
    |           |           |
    v           v           v
+--------+ +--------+ +--------+
|Shard 0 | |Shard 1 | |Shard 2 |
|users   | |users   | |users   |
|0-999   | |1000-1999| |2000+  |
+--------+ +--------+ +--------+
```

### Sharding Strategies

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| Hash-based | hash(shard_key) % N | Even distribution | Resharding is painful, range queries across shards |
| Range-based | shard by range (A-M, N-Z) | Range queries stay local | Hot spots if distribution is uneven |
| Geo-based | shard by region | Data locality for users | Uneven shard sizes |
| Directory-based | lookup table maps key to shard | Flexible | Lookup table is a bottleneck/SPOF |

### Replication Models
- **Leader-Follower**: one leader handles writes, followers replicate for reads. Simple. Replication lag = eventual consistency.
- **Leader-Leader (Multi-Master)**: multiple nodes accept writes. Complex conflict resolution. Rarely needed.

### Key Trade-offs

| Gain | Lose |
|------|------|
| Replication: read throughput, fault tolerance | Replication lag, write bottleneck at leader |
| Sharding: write throughput, data partitioning | Cross-shard queries are expensive, operational complexity |

### When to Use (Interview Triggers)
- "Database is the bottleneck" -- add read replicas first (simpler), shard if writes are the problem
- "How to handle 100M users?" -- you will need sharding
- "How to ensure high availability of the database?" -- replication with failover

### Real-World Mapping
- **RDS Read Replicas**: leader-follower, up to 5 replicas per instance
- **RDS Multi-AZ**: synchronous standby for HA (not for read scaling, for failover)
- **DynamoDB Partitioning**: automatic hash-based sharding on partition key. This is why partition key design matters so much in DynamoDB.
- **Aurora**: up to 15 read replicas with sub-10ms replication lag

---

## 7. Message Queues **[SR]**

### What It Is
An intermediary that decouples producers from consumers, enabling asynchronous communication, load leveling, and fault tolerance.

### How It Works

```
POINT-TO-POINT (Queue)            PUB/SUB (Topic)

Producer --> [Queue] --> Consumer   Publisher --> [Topic] --> Subscriber A
                                                         --> Subscriber B
  One message consumed once.                              --> Subscriber C
  Work distribution.               One message to all subscribers.
                                    Event notification.
```

### Delivery Guarantees
- **At-most-once**: fire and forget. May lose messages. Fast.
- **At-least-once**: retry until acknowledged. May duplicate. Most common (SQS default).
- **Exactly-once**: hardest to achieve. Kafka has it via idempotent producers + transactional consumers. Typically you use at-least-once + idempotent consumers instead.

### Comparison Table

| Feature | SQS | Kafka | RabbitMQ |
|---------|-----|-------|----------|
| Model | Queue (point-to-point) | Log (pub/sub + replay) | Both (queue + exchange routing) |
| Ordering | FIFO queues guarantee order | Per-partition ordering | Per-queue ordering |
| Throughput | High (managed, auto-scale) | Very high (millions/sec) | Moderate |
| Retention | 14 days max | Configurable (days to forever) | Until consumed |
| Replay | No (message deleted after consumption) | Yes (offset-based replay) | No |
| Managed AWS | SQS (native) | MSK (managed Kafka) | AmazonMQ |
| Best for | Task queues, decoupling | Event streaming, audit logs, replay | Complex routing, RPC |

### Key Trade-offs

| Gain | Lose |
|------|------|
| Decoupled services, fault tolerance, load leveling | Added latency (async), operational complexity |
| Retry/DLQ for reliability | Message ordering is hard at scale |
| Kafka replay for reprocessing | Kafka operational complexity (partitions, consumer groups) |

### When to Use (Interview Triggers)
- "Services need to communicate asynchronously" -- message queue
- "What if the downstream service is down?" -- queue absorbs the load
- "We need to process events and replay if something goes wrong" -- Kafka
- "Fire-and-forget notifications" -- SNS

### Real-World Mapping
- **SQS**: your bread and butter. Standard queues for high throughput, FIFO for ordering. DLQ for failed messages.
- **SNS**: fan-out pub/sub. SNS -> multiple SQS queues is a classic pattern.
- **EventBridge**: event bus with rules-based routing. You use this for event-driven microservices. Richer routing than SNS (content-based filtering on event payload).
- Your pattern: EventBridge (event bus) -> SQS (queue per consumer) -> Lambda (processor) with DLQ for failures.

---

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

---

## 9. Consistent Hashing **[SR]**

### What It Is
A hashing technique that minimizes key redistribution when nodes are added or removed. Essential for distributed caches and sharded systems.

### How It Works

```
THE HASH RING

        0 (= 2^32)
       /     \
     N1       N2        Keys land on the ring based on hash(key).
    /           \       Walk clockwise to find the responsible node.
   /             \
  N4 ---- N3

  Example: hash("user:42") lands between N2 and N3
           --> N3 handles it

ADDING A NODE (N5 between N2 and N3):
  Only keys between N2 and N5 move to N5.
  All other keys stay put.
  Without consistent hashing, ~100% of keys would redistribute.
  With consistent hashing, only ~K/N keys move (K=keys, N=nodes).
```

**Virtual Nodes** -- each physical node gets multiple positions on the ring (e.g., N1 at positions N1-a, N1-b, N1-c). This solves uneven distribution that happens with few physical nodes.

```
Ring with virtual nodes:

  N1-a  N2-b  N3-a  N1-b  N2-a  N3-b  N1-c  N2-c  N3-c
  |-----|-----|-----|-----|-----|-----|-----|-----|-----|

  More virtual nodes = more even distribution
```

### Key Trade-offs

| Gain | Lose |
|------|------|
| Minimal redistribution on node add/remove | More complex than simple modulo hashing |
| Virtual nodes give even distribution | Virtual node management overhead |

### When to Use (Interview Triggers)
- "Design a distributed cache" -- consistent hashing for key distribution
- "How does data partition across nodes?" -- consistent hashing
- "What happens when a cache node dies?" -- only 1/N of keys are affected
- DynamoDB uses consistent hashing internally for partition key distribution

### Real-World Mapping
- **DynamoDB**: uses consistent hashing for partitioning (partition key is hashed to determine which storage node)
- **ElastiCache Redis Cluster**: hash slots (a variation of consistent hashing, 16384 slots)
- **Load balancers**: some use consistent hashing for sticky sessions

---

## 10. CAP Theorem and PACELC **[SR]**

### What It Is

**CAP Theorem**: In the presence of a network **P**artition, a distributed system must choose between **C**onsistency (all nodes see the same data) and **A**vailability (every request gets a response).

The key insight: CAP is about what happens DURING a partition, not normal operation. Network partitions will happen (it is not a choice), so you are really choosing between CP and AP.

### How It Works

```
         C (Consistency)
        / \
       /   \          You can't have all three
      /     \         during a network partition.
     /  pick  \
    /   two    \      CA = only possible if no partition
   /     *      \         (single node, not distributed)
  A ------------ P
(Availability)  (Partition Tolerance)
```

**CP System** -- during partition, reject requests that might return stale data. Example: a banking system returns errors rather than show wrong balance. (DynamoDB strongly consistent reads, ZooKeeper, etcd)

**AP System** -- during partition, serve requests even if data might be stale. Example: a social media feed shows slightly old data rather than being unavailable. (DynamoDB eventually consistent reads, Cassandra, DNS)

### PACELC Extension

"If there is a **P**artition, choose **A** or **C**; **E**lse (normal operation), choose **L**atency or **C**onsistency."

| System | During Partition (PAC) | Normal Operation (ELC) |
|--------|----------------------|----------------------|
| DynamoDB (eventual) | AP | EL (low latency, eventual consistency) |
| DynamoDB (strong) | CP | EC (consistent reads, higher latency) |
| PostgreSQL (single) | CA (not distributed) | EC |
| Cassandra | AP | EL |
| ZooKeeper | CP | EC |

### Key Trade-offs
CAP is not a permanent choice -- you can choose per-operation. DynamoDB lets you choose strong vs eventual consistency per read.

### When to Use (Interview Triggers)
- "What consistency model does your system use?" -- reference CAP
- "Is eventual consistency acceptable?" -- depends on the use case
- Payment systems: CP. Social feeds: AP. Mention PACELC to show depth.

### Real-World Mapping
- **DynamoDB**: AP by default (eventually consistent reads), CP option (strongly consistent reads at 2x cost)
- **RDS PostgreSQL**: CP within a single node, Multi-AZ is synchronous (CP for failover)
- **S3**: eventually consistent for overwrite PUTs (now strongly consistent as of Dec 2020)
- Your EventBridge/SQS architecture: inherently AP (eventual consistency through async event processing)

---

## 11. Microservices vs Monolith **[SR]**

### What It Is
An architectural decision about how to structure your application: as a single deployable unit (monolith) or as a collection of independently deployable services (microservices).

### How It Works

```
MONOLITH                          MICROSERVICES

+-------------------+             +--------+  +--------+  +--------+
|                   |             |  Auth  |  | Orders |  |Inventory|
|  All features     |             |Service |  |Service |  |Service  |
|  in one           |             +--------+  +--------+  +--------+
|  deployable       |                  |           |           |
|  unit             |             +--------+  +---------+
|                   |             |  User  |  |Notification|
+-------------------+             |Service |  |  Service   |
        |                         +--------+  +---------+
   [Single DB]
                                  Each service has its own DB
                                  (Database per service pattern)
```

### Service Communication

| Type | Sync (REST/gRPC) | Async (Messaging) |
|------|------------------|-------------------|
| How | Direct HTTP/gRPC call | Events via queue/bus |
| Coupling | Temporal coupling (both must be up) | Loose coupling |
| Latency | Lower for single call | Higher (queue overhead) |
| Failure | Cascading failures possible | Queue absorbs failures |
| Use when | Need immediate response | Fire-and-forget, eventual consistency OK |

In your stack: you primarily use async communication (EventBridge -> SQS -> Lambda), which is the recommended pattern for microservices.

### When to Use Each

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team size | Small team (< 10) | Multiple teams with clear ownership |
| Domain understanding | Evolving, unclear boundaries | Well-understood domain boundaries |
| Deployment | Simple (one artifact) | Independent deployment per service |
| Scaling | Scale entire app | Scale individual services |
| Data consistency | Easy (single DB, transactions) | Hard (distributed transactions, eventual consistency) |

### Key Trade-offs

| Gain (Microservices) | Lose (Microservices) |
|---------------------|---------------------|
| Independent scaling and deployment | Network latency, distributed debugging |
| Technology diversity per service | Operational complexity (K8s, service mesh) |
| Fault isolation | Distributed transactions are hard |

### When to Use (Interview Triggers)
- "Design a new system from scratch" -- start with well-structured monolith, extract services when boundaries are clear
- "How do your services communicate?" -- sync for queries, async for commands/events
- "How to handle failures across services?" -- circuit breakers, retries with backoff, DLQs

### Real-World Mapping
- **Your Treez architecture**: microservices communicating via EventBridge/SQS, each Lambda function is a microservice
- **API Gateway**: single entry point for all microservices
- **ECS/EKS (Kubernetes)**: container orchestration for microservices
- **CloudFormation**: infrastructure-as-code per service stack

---

## 12. Event-Driven Architecture **[SR]**

### What It Is
A design paradigm where state changes are represented as events, and services react to events rather than being directly called. This is your core competency.

### How It Works

```
EVENT SOURCING
Instead of storing current state, store the sequence of events.

  Event Store: [OrderCreated] -> [ItemAdded] -> [ItemAdded] -> [OrderPaid]

  Current state = replay all events
  Benefits: full audit trail, can rebuild state, time travel debugging


CQRS (Command Query Responsibility Segregation)

  Commands (writes)              Queries (reads)
       |                              |
       v                              v
  +----------+   events     +------------+
  |  Write   | -----------> |   Read     |
  |  Model   |              |   Model    |
  | (events) |              | (optimized |
  +----------+              |   views)   |
       |                         |
  [Event Store]          [Read-optimized DB]
```

### Choreography vs Orchestration

```
CHOREOGRAPHY (decentralized)          ORCHESTRATION (centralized)
Each service reacts to events.        A coordinator tells services what to do.

OrderService                          Orchestrator (Step Functions)
  publishes: OrderCreated               |
       |                                +-> Create Order
InventoryService                        +-> Reserve Inventory
  listens: OrderCreated                 +-> Process Payment
  publishes: InventoryReserved          +-> Send Confirmation
       |
PaymentService
  listens: InventoryReserved
  publishes: PaymentProcessed
```

| | Choreography | Orchestration |
|--|-------------|---------------|
| Coupling | Loose (services don't know about each other) | Tighter (orchestrator knows the flow) |
| Visibility | Hard to see full flow | Easy to see in one place |
| Complexity | Grows with number of services | Centralized in orchestrator |
| Failure handling | Each service handles its own | Orchestrator handles globally |

### Idempotency
Critical in event-driven systems because messages can be delivered more than once.

Techniques:
- **Idempotency key**: store processed event IDs, skip duplicates
- **Database upsert**: INSERT ON CONFLICT DO NOTHING
- **Conditional writes**: DynamoDB conditional expressions (attribute_not_exists)

### Key Trade-offs

| Gain | Lose |
|------|------|
| Loose coupling, independent scaling | Debugging distributed flows is hard |
| Natural audit trail (event sourcing) | Eventual consistency (not immediate) |
| Resilience (events buffered in queues) | Ordering challenges, duplicate handling |

### When to Use (Interview Triggers)
- "How do you handle workflows across multiple services?" -- event-driven with choreography or orchestration
- "How do you ensure data consistency without distributed transactions?" -- saga pattern with compensating events
- "What if a message is processed twice?" -- idempotency

### Real-World Mapping
- **EventBridge**: your event bus. Rules route events to targets based on event content.
- **SQS + DLQ**: your consumer queues with dead-letter handling for failed events.
- **Lambda**: your event processors (triggered by SQS, EventBridge, etc.).
- **Step Functions**: AWS orchestration service (state machine for complex workflows).
- This is literally what you do every day. In interviews, draw from real examples of event flows you have built.

---

## 13. Blob/Object Storage **[SR]**

### What It Is
Storage optimized for large unstructured objects (files, images, videos, backups) with HTTP-based access. Not a filesystem -- flat namespace with key-value semantics.

### How It Works

```
Upload Flow (Pre-signed URL):

  Client                    Backend              S3
    |                          |                  |
    |-- "I want to upload" --> |                  |
    |                          |-- generate       |
    |                          |   pre-signed URL |
    |<-- pre-signed URL -------|                  |
    |                                             |
    |------------- PUT file directly ------------>|
    |                                             |
    (no file goes through your backend -- saves bandwidth and cost)
```

### Key Concepts
- **Pre-signed URLs**: time-limited URLs that grant temporary access to upload or download. Your backend generates them, client uses them directly. This keeps files off your servers.
- **Multipart Upload**: for files > 100MB, split into parts, upload in parallel, server assembles. Supports resume on failure.
- **Lifecycle Policies**: automatically transition objects between storage classes (S3 Standard -> S3 IA -> Glacier) or delete after N days.
- **Versioning**: keep all versions of an object. Protects against accidental deletes.

### Key Trade-offs

| Gain | Lose |
|------|------|
| Virtually unlimited storage, high durability (11 9s) | Not suitable for frequent small updates |
| Cheap at scale | Higher latency than local disk |
| Pre-signed URLs offload bandwidth | Pre-signed URLs must be managed (expiry, security) |

### When to Use (Interview Triggers)
- "Users upload images/files" -- S3 + pre-signed URLs
- "Store large datasets" -- object storage
- "How to serve files to users globally?" -- S3 + CloudFront

### Real-World Mapping
- **S3**: your object store. You use pre-signed URLs for upload/download.
- **S3 + CloudFront**: serve files globally via CDN
- **S3 Event Notifications**: trigger Lambda on upload (e.g., image processing pipeline)
- **S3 Transfer Acceleration**: faster uploads via CloudFront edge locations

---

## 14. Search **[SR]**

### What It Is
Full-text search capability that goes beyond database LIKE queries. Built on inverted indexes for fast, relevant text matching.

### How It Works

```
INVERTED INDEX

Documents:
  Doc1: "The quick brown fox"
  Doc2: "The quick blue car"
  Doc3: "A brown dog"

Inverted Index:
  "the"   -> [Doc1, Doc2]
  "quick" -> [Doc1, Doc2]
  "brown" -> [Doc1, Doc3]
  "fox"   -> [Doc1]
  "blue"  -> [Doc2]
  "car"   -> [Doc2]
  "dog"   -> [Doc3]

Query "brown fox" -> intersection of [Doc1, Doc3] and [Doc1] = [Doc1]
```

### Elasticsearch Basics
- **Index**: like a database table, holds documents
- **Document**: a JSON object (a row)
- **Mapping**: schema definition (field types, analyzers)
- **Analyzer**: tokenizer + filters (lowercase, stemming, stop words)
- **Shards**: an index is split into shards for distribution (uses Lucene under the hood)
- **Replicas**: copies of shards for HA and read throughput

### When to Add Search to a Design
- Text search across multiple fields
- Fuzzy matching / typo tolerance
- Faceted search (filter by category, price range, etc.)
- Autocomplete / suggestions
- Log analysis and aggregation

### Key Trade-offs

| Gain | Lose |
|------|------|
| Fast full-text search, relevance scoring | Additional infrastructure to maintain |
| Fuzzy matching, autocomplete | Data must be synced from primary DB (eventual consistency) |
| Aggregations and analytics | Not a primary data store (no ACID) |

### When to Use (Interview Triggers)
- "Users need to search products/content" -- Elasticsearch
- "How to implement autocomplete?" -- search index with prefix queries
- "How to search across millions of documents?" -- inverted index

### Real-World Mapping
- **OpenSearch (AWS)**: managed Elasticsearch-compatible service
- **CloudSearch**: simpler AWS search service (less flexible)
- Typical pattern: PostgreSQL (source of truth) -> Change Data Capture -> OpenSearch (search index)
- In your e-commerce context: product catalog search, inventory search

---

## 15. Monitoring and Observability **[SR]**

### What It Is
The ability to understand the internal state of your system from its external outputs. Essential for debugging, alerting, and maintaining reliability in production.

### The Three Pillars

```
+------------+    +------------+    +------------+
|  METRICS   |    |   LOGS     |    |  TRACES    |
|            |    |            |    |            |
| Numerical  |    | Discrete   |    | End-to-end |
| time-series|    | events     |    | request    |
| data       |    | with       |    | journey    |
|            |    | context    |    | across     |
| CPU: 75%   |    | "Order     |    | services   |
| QPS: 1200  |    |  created   |    |            |
| p99: 230ms |    |  for user  |    | ServiceA   |
|            |    |  #42"      |    |  -> SvcB   |
+------------+    +------------+    |  -> SvcC   |
                                    +------------+
```

### Metrics
- **Types**: counters (requests total), gauges (current CPU), histograms (latency distribution)
- **Key metrics**: RED method (Rate, Errors, Duration) for services; USE method (Utilization, Saturation, Errors) for resources
- **Percentiles**: p50, p95, p99 latency. Averages lie -- always use percentiles.

### Logs
- Structured logging (JSON) over unstructured text
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs: a unique ID passed through all services for a single request, enabling tracing through logs

### Traces (Distributed Tracing)
- Each request gets a trace ID
- Each service creates a span (unit of work)
- Spans are nested to show the full call tree
- OpenTelemetry: vendor-neutral standard for metrics, logs, and traces

### Key Trade-offs

| Gain | Lose |
|------|------|
| Fast debugging, proactive alerting | Cost (storage, compute for processing) |
| Understanding system behavior at scale | Noise (too many alerts = alert fatigue) |
| Capacity planning from historical data | Instrumentation effort in code |

### When to Use (Interview Triggers)
- "How would you monitor this system?" -- mention all three pillars
- "How to debug issues in production?" -- structured logs + distributed tracing
- "What alerts would you set up?" -- error rate spike, p99 latency breach, queue depth growing

### Real-World Mapping
- **CloudWatch**: metrics (Lambda duration, error count), logs (Lambda logs auto-shipped), alarms
- **CloudWatch X-Ray**: distributed tracing for Lambda/API Gateway
- **Prometheus + Grafana**: popular self-hosted stack for metrics and dashboards (EKS)
- In your Lambda stack: CloudWatch Metrics for invocation count/errors/duration, CloudWatch Logs for structured logging, X-Ray for tracing across Lambda -> SQS -> Lambda chains

---

## Quick Reference Table

| Building Block | When to Mention in Interview | Key AWS Service |
|---------------|---------------------------|----------------|
| Scalability | "Handle millions of users", traffic spikes | Auto Scaling, Lambda |
| Load Balancing | Always (draw it in every diagram) | ALB, NLB |
| Caching | Read-heavy workloads, reduce DB load | ElastiCache (Redis) |
| CDN | Static assets, global users, streaming | CloudFront |
| Database Selection | Data model discussion, justify your DB choice | RDS (PostgreSQL), DynamoDB |
| Database Scaling | DB bottleneck, high read/write volume | RDS Read Replicas, DynamoDB |
| Message Queues | Async processing, decoupling, fault tolerance | SQS, SNS, EventBridge |
| API Gateway + Rate Limiting | API entry point, abuse protection | API Gateway |
| Consistent Hashing | Distributed cache, data partitioning | DynamoDB (internal) |
| CAP Theorem / PACELC | Consistency vs availability discussion | DynamoDB (tunable) |
| Microservices vs Monolith | Architecture decision, team structure | Lambda, ECS, EKS |
| Event-Driven Architecture | Workflows, decoupled services, audit trails | EventBridge, SQS, Step Functions |
| Blob/Object Storage | File uploads, images, videos, backups | S3 |
| Search | Full-text search, autocomplete, product search | OpenSearch |
| Monitoring + Observability | "How to monitor?", debugging, alerting | CloudWatch, X-Ray |
