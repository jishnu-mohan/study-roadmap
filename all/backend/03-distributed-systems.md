# Distributed Systems -- Interview Guide

> Tailored for Jishnu (SDE2, 7+ years). Event-driven microservices with AWS EventBridge/SQS/Lambda, DLQ-based retries, idempotent consumers. TypeScript/Node.js.

---

## [SR] Consistency Models

### Strong Consistency

Every read returns the most recent write. There is a single, globally agreed-upon order of operations, and no client ever sees stale data.

**Example:** A bank balance. After a transfer of $500, every subsequent read from any client must reflect that transfer. Showing a stale balance could lead to overdrafts or double-spending.

**Trade-off:** Higher latency (reads may need to contact the leader or wait for replication quorum) and lower availability (if the majority of nodes are unreachable, the system refuses to serve reads rather than risk returning stale data).

**How it works in practice:** The system typically requires a quorum read (read from majority of replicas) or always reads from the leader node. This means every read incurs network round-trips and coordination overhead.

### Eventual Consistency

Reads may return stale data, but given enough time without new writes, all replicas will converge to the same value. The system does not guarantee when convergence will happen.

**Example:** A social media likes count. If a post has 10,042 likes and someone adds one, it is acceptable if some users see 10,042 and others see 10,043 for a brief window. Nobody is materially harmed by a temporarily stale count.

**Trade-off:** Higher availability and lower latency. Any replica can serve reads immediately without coordinating with others. This is why most large-scale systems default to eventual consistency for non-critical data.

**Key nuance for interviews:** Eventual consistency is not the same as "no consistency." The system still guarantees convergence. The question is how long the inconsistency window lasts and whether the application can tolerate it.

### Causal Consistency

Maintains cause-and-effect ordering. If operation A causally precedes operation B (B depends on or was influenced by A), then every node sees A before B. Operations that are not causally related (concurrent) can be seen in any order.

**Example:** Comment replies always appear after the parent comment. If Alice posts a comment and Bob replies to it, no user should ever see Bob's reply without Alice's original comment. However, two independent top-level comments from Alice and Carol can appear in any order.

**Implementation:** Typically uses vector clocks or explicit dependency tracking. Each operation carries metadata about which operations it depends on, and a node will not make an operation visible until all its dependencies are visible.

### Linearizability vs Serializability

These two terms are frequently confused in interviews. They solve different problems.

**Linearizability:**
- Concerns a **single object** (a single register, a single key).
- Guarantees **real-time ordering**: if operation A completes before operation B starts (wall-clock time), then B sees the effects of A.
- Think of it as "the system behaves as if there is a single copy of the data, and all operations happen atomically at some point between their invocation and completion."
- Relevant to: distributed key-value stores, distributed locks, leader election.

**Serializability:**
- Concerns **multiple objects** (a set of reads and writes across different keys/rows within a transaction).
- Guarantees that the outcome is equivalent to **some serial ordering** of the transactions, but that ordering does not need to respect real-time order.
- Relevant to: database transactions, ACID properties.

**Strict serializability** (also called "linearizable + serializable") combines both: transactions appear to execute in some serial order that is consistent with real-time ordering. This is what Spanner and CockroachDB aim for.

### Read-Your-Writes Consistency

A user always sees their own writes. If you update your profile name, the next page load should show the new name, even if other users might briefly see the old name.

**Implementation strategies:**
1. **Read from leader after write:** After a write, direct the user's subsequent reads to the leader replica (which has the latest data) rather than a follower. Simple but increases load on the leader.
2. **Version tokens / logical timestamps:** After a write, return a version token to the client. On subsequent reads, the client sends the token, and the system ensures it reads from a replica that is at least as up-to-date as that token. If the replica is behind, either wait or redirect to a more up-to-date replica.
3. **Session stickiness:** Route all requests from the same user session to the same replica. Fragile (what happens on failover?) but simple.

**Interview tip:** Read-your-writes is a subset of causal consistency. If the system provides causal consistency, read-your-writes comes for free.

---

## [SR] Distributed Transactions

### Two-Phase Commit (2PC)

A protocol for achieving atomicity across multiple participants (typically database nodes or resource managers).

**Phase 1 -- Prepare:**
- The coordinator sends a "prepare" message to all participants.
- Each participant executes the transaction locally (acquires locks, writes to WAL) and responds with either "vote-commit" (ready to commit) or "vote-abort" (something went wrong).

**Phase 2 -- Commit/Abort:**
- If all participants voted commit, the coordinator sends "commit" to all.
- If any participant voted abort, the coordinator sends "abort" to all.
- Participants execute the final commit or rollback and acknowledge.

**The fundamental problem:** 2PC is a **blocking protocol**. If the coordinator crashes after sending "prepare" but before sending the commit/abort decision, all participants are stuck holding locks, unable to proceed. They cannot safely commit (maybe the coordinator decided to abort) or abort (maybe the coordinator decided to commit). They must wait for the coordinator to recover.

**When to use:** Within a single database cluster or between tightly coupled resources managed by the same team. Not across microservices -- the failure modes and latency are unacceptable.

**When NOT to use:** Across microservices owned by different teams, across organizational boundaries, or when high availability is required.

### Saga Pattern

A sequence of local transactions where each step has a corresponding compensating transaction. If any step fails, the previously completed steps are undone by executing their compensating transactions in reverse order.

**Choreography-based Saga:**
Each service listens for events emitted by other services and decides what to do next.

```
OrderService emits "OrderCreated"
  -> InventoryService hears it, reserves stock, emits "InventoryReserved"
    -> PaymentService hears it, charges card, emits "PaymentCharged"
      -> OrderService hears it, marks order as confirmed
```

- Pros: Decoupled services, no single point of failure, scales naturally.
- Cons: Hard to understand the overall flow by looking at one service. Difficult to debug when things go wrong. Adding a new step means modifying multiple services.

**Orchestration-based Saga:**
A central orchestrator (a dedicated service or workflow engine) coordinates the steps explicitly.

```
OrderOrchestrator:
  1. Call InventoryService.reserveStock()
  2. Call PaymentService.chargeCard()
  3. Call OrderService.confirmOrder()
  On failure at step 2:
    Call InventoryService.releaseStock()  // compensate step 1
```

- Pros: The entire flow is visible in one place. Easier to add/remove/reorder steps. Easier to debug and monitor.
- Cons: The orchestrator is a single point of failure (mitigate with durability and retries). Can become a "god service" if not carefully scoped.

**Compensating transactions:**

| Step | Forward Action | Compensating Action |
|------|---------------|-------------------|
| 1 | CreateOrder | CancelOrder |
| 2 | ReserveInventory | ReleaseInventory |
| 3 | ChargePayment | RefundPayment |
| 4 | ShipOrder | (may not be compensable -- this is a key design consideration) |

Key insight: not every action is easily compensable. Sending an email, shipping a physical product, or calling an external API with side effects may require alternative strategies (like "semantic undo" or manual intervention).

### When to Use 2PC vs Saga

| Criteria | 2PC | Saga |
|----------|-----|------|
| Consistency | Strong (ACID) | Eventual |
| Scope | Within a bounded context / single DB cluster | Across microservices |
| Latency tolerance | Low latency required between participants | Tolerates higher latency |
| Failure handling | Blocking on coordinator failure | Non-blocking, compensating transactions |
| Complexity | Protocol is simple, failure modes are hard | Pattern is conceptually simple, compensation logic is complex |

### Practical Example: Order Processing Saga

Connecting to Jishnu's experience at Treez with EventBridge orchestration:

```
EventBridge Rule: "OrderCreated"
  -> SQS Queue -> Lambda: ValidateOrder
    -> Emits "OrderValidated" to EventBridge

EventBridge Rule: "OrderValidated"
  -> SQS Queue -> Lambda: ReserveInventory
    -> Emits "InventoryReserved" to EventBridge

EventBridge Rule: "InventoryReserved"
  -> SQS Queue -> Lambda: ProcessPayment
    -> On success: Emits "PaymentProcessed"
    -> On failure: Emits "PaymentFailed"

EventBridge Rule: "PaymentFailed"
  -> SQS Queue -> Lambda: ReleaseInventory (compensating transaction)
    -> Emits "InventoryReleased"
  -> SQS Queue -> Lambda: CancelOrder (compensating transaction)
```

Each Lambda is an idempotent consumer. Each SQS queue has a DLQ. The EventBridge rules define the choreography. This maps directly to the event-driven architecture pattern Jishnu has built.

---

## [SR] Consensus

### Why Consensus Is Hard

**FLP Impossibility Theorem (Fischer, Lynch, Paterson, 1985):**
In an asynchronous distributed system where even one process can crash, there is no deterministic algorithm that guarantees consensus will be reached in bounded time.

What this means in practice: you cannot distinguish between a crashed node and a slow node in a purely asynchronous system. Any protocol that waits for all responses might wait forever; any protocol that proceeds without all responses might make an incorrect decision.

**How real systems work around FLP:**
- **Timeouts:** Treat a node as failed if it does not respond within a timeout. This introduces the possibility of incorrect failure detection (a slow node might be incorrectly considered dead), but it ensures progress.
- **Randomization:** Protocols like Raft use randomized election timeouts to break symmetry and avoid livelock (all candidates starting elections simultaneously).

### Raft Algorithm (Conceptual)

Raft is designed to be understandable (unlike Paxos). It decomposes consensus into three sub-problems.

**1. Leader Election:**
- Every node starts as a **follower**. Followers expect periodic heartbeats from a leader.
- If a follower does not receive a heartbeat within its **election timeout** (randomized, e.g., 150-300ms), it becomes a **candidate** and starts an election.
- The candidate increments its **term** (a monotonically increasing logical clock), votes for itself, and sends RequestVote RPCs to all other nodes.
- A node grants its vote to the first candidate it hears from in a given term (first-come-first-served).
- If a candidate receives votes from a **majority**, it becomes the leader for that term.
- **Terms prevent split-brain:** If a node receives a message with a higher term than its own, it immediately steps down. There can be at most one leader per term.

**2. Log Replication:**
- The leader receives client requests and appends them as entries in its log.
- It sends AppendEntries RPCs to all followers to replicate the entry.
- When a **majority** of nodes have acknowledged the entry, the leader considers it **committed** and applies it to its state machine.
- The leader notifies followers of committed entries in subsequent heartbeats.

**3. Safety -- Leader Completeness Property:**
- A candidate can only win an election if its log is at least as up-to-date as the logs of a majority of nodes.
- This ensures that the new leader always has all committed entries. Committed entries are never lost.

**Why this matters for interviews:**
- You are unlikely to be asked to implement Raft, but you should understand the conceptual model.
- It explains how distributed databases (etcd, CockroachDB, TiDB) and coordination services (ZooKeeper uses ZAB, which is similar) achieve consistency.
- It helps you reason about trade-offs: Raft requires a majority of nodes to be available (N/2 + 1 out of N), so a 3-node cluster tolerates 1 failure, a 5-node cluster tolerates 2.

---

## [SR] Idempotency

### Why It Matters

In distributed systems, messages can be delivered more than once. Networks are unreliable: a request might succeed on the server but the response might be lost, causing the client to retry. SQS provides at-least-once delivery, not exactly-once. EventBridge can trigger the same Lambda multiple times.

Without idempotency:
- A payment gets charged twice.
- A record gets created twice.
- An inventory count gets decremented twice.

The goal: processing the same message N times produces the same result as processing it once.

### Implementation Strategies

**1. Idempotency Keys**

The client generates a unique key (UUID) for each logical operation and sends it with the request. The server stores (key -> result) in a database with a TTL.

```typescript
async function processPayment(idempotencyKey: string, payload: PaymentRequest): Promise<PaymentResult> {
  // Check if we already processed this request
  const existing = await redis.get(`idempotency:${idempotencyKey}`);
  if (existing) {
    return JSON.parse(existing) as PaymentResult;
  }

  // Process the payment
  const result = await chargeCard(payload);

  // Store the result with TTL (e.g., 24 hours)
  await redis.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(result),
    'EX',
    86400
  );

  return result;
}
```

Considerations:
- Use Redis for low-latency lookups, or DynamoDB for durability.
- TTL should be long enough to cover all retry windows but not so long that storage grows unbounded.
- Race condition: two concurrent requests with the same key. Use a distributed lock or database conditional write to prevent both from executing.

**2. Database Unique Constraints**

```sql
INSERT INTO processed_events (event_id, result, created_at)
VALUES ($1, $2, NOW())
ON CONFLICT (event_id) DO NOTHING;
```

If the event was already processed, the insert is silently ignored. Natural deduplication without a separate cache layer.

**3. Conditional Writes (DynamoDB)**

```typescript
await dynamodb.put({
  TableName: 'Orders',
  Item: { orderId, status: 'CONFIRMED', version: newVersion },
  ConditionExpression: 'attribute_not_exists(orderId) OR version = :expectedVersion',
  ExpressionAttributeValues: { ':expectedVersion': currentVersion }
}).promise();
```

The write only succeeds if the condition is met. Duplicate writes fail with a ConditionalCheckFailedException, which you catch and treat as a successful no-op.

**4. Message Deduplication**

- **SQS FIFO queues:** Provide a `MessageDeduplicationId`. SQS deduplicates messages with the same ID within a 5-minute window.
- **EventBridge:** Use idempotent rule targets. If the target is a Lambda, ensure the Lambda handler is idempotent.

### Connecting to Jishnu's Experience

At Treez, the Product Collection Service uses EventBridge + SQS with at-least-once delivery. Each Lambda consumer is an idempotent consumer:
- Messages carry a unique event ID.
- Before processing, the Lambda checks a DynamoDB table for the event ID.
- If found, skip processing (return success to SQS so the message is deleted).
- If not found, process the event, then write the event ID to DynamoDB.
- DLQ catches messages that fail repeatedly (e.g., due to transient errors or bugs), enabling manual review and replay.

---

## [SR] Resilience Patterns

### Circuit Breaker

Prevents a service from repeatedly calling a failing downstream dependency, which would waste resources, increase latency, and potentially cause cascading failures.

**Three states:**

```
         success threshold met
              |
  [Closed] --failures exceed threshold--> [Open]
     ^                                      |
     |                                      | timeout expires
     |                                      v
     +-----success threshold met----- [Half-Open]
     |                                      |
     +------failure in half-open-----------+
                (back to Open)
```

- **Closed (normal operation):** Requests pass through. The circuit breaker counts consecutive failures (or failure rate over a window). When the failure count exceeds the threshold, the circuit trips to Open.
- **Open (failing fast):** All requests immediately fail without calling the downstream service. After a configured timeout (e.g., 30 seconds), the circuit moves to Half-Open.
- **Half-Open (testing recovery):** A limited number of test requests are allowed through. If they succeed (meeting the success threshold), the circuit closes. If any fail, the circuit re-opens.

**Configuration parameters:**
- `failureThreshold`: Number of failures before tripping (e.g., 5).
- `timeout`: How long to stay Open before trying Half-Open (e.g., 30s).
- `successThreshold`: Number of successes in Half-Open before closing (e.g., 3).

**When to use:** Any remote call -- external APIs, database connections, calls to other microservices.

### Retry with Exponential Backoff + Jitter

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay,
        maxDelay
      );
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

function isTransientError(error: any): boolean {
  // Retry on 5xx, timeouts, network errors. Do NOT retry on 4xx.
  const status = error?.statusCode || error?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return true;
}
```

**Why jitter matters:** Without jitter, if 1000 clients all fail at the same time (e.g., a downstream service recovers from an outage), they all retry at the same intervals: 1s, 2s, 4s, 8s. This creates periodic spikes (thundering herd). Adding random jitter spreads the retries across time, smoothing the load.

**Only retry transient errors:** 5xx (server error), 429 (rate limited -- but respect Retry-After header), connection timeouts, network errors. Do NOT retry 4xx client errors (400 Bad Request, 404 Not Found) -- those will never succeed on retry.

### Bulkhead

Isolate resources so that one failing dependency cannot consume all available resources and take down the entire service.

**Thread/connection pool isolation:**
```
Service A
  |-- Pool for Database (max 20 connections)
  |-- Pool for External API X (max 10 connections)
  |-- Pool for Service B (max 15 connections)
```

If External API X becomes slow and all 10 of its connections are occupied, the service can still serve requests that depend on the Database or Service B. Without bulkheading, all 45 connections could be consumed by the slow API X, blocking everything.

**In Lambda context:** Bulkheading is achieved through separate Lambda functions per dependency, with reserved concurrency. If the payment-processing Lambda hits its concurrency limit, the order-listing Lambda is unaffected.

### Timeout Patterns

Always set timeouts. A missing timeout is a resource leak waiting to happen.

| Timeout Type | Typical Value | Purpose |
|-------------|--------------|---------|
| Connection timeout | 1-5 seconds | How long to wait to establish a TCP connection |
| Read/response timeout | Depends on operation (1-30s) | How long to wait for the response after connection is established |
| Overall request timeout | Sum of connection + read + retries | Total time the caller is willing to wait |
| Idle timeout | 30-60 seconds | Close connections that have been idle too long |

**Key principle:** The timeout at each layer should be shorter than the timeout at the layer above it. If your API gateway has a 30s timeout, your service should have a 25s timeout, and its downstream calls should have a 20s timeout. Otherwise, the gateway might time out and return an error to the client while the downstream call is still running (wasting resources).

### Dead Letter Queues (DLQ)

Messages that fail processing after N attempts are moved to a DLQ instead of being retried forever or lost.

**DLQ processing strategies:**
1. **Alerting:** Trigger a CloudWatch alarm when DLQ depth > 0. Someone investigates.
2. **Automated retry with fixes:** A scheduled Lambda reads from the DLQ, applies any necessary transformations or fixes, and re-publishes to the original queue.
3. **Manual review dashboard:** Build a simple UI that lets engineers inspect, edit, and replay DLQ messages.
4. **Expiry:** Set a retention period on the DLQ. Messages older than the retention are discarded. Only appropriate for non-critical data.

**Connecting to Jishnu's SQS DLQ experience:**
- Each SQS queue has a corresponding DLQ configured with a `maxReceiveCount` (e.g., 3).
- If a Lambda consumer fails to process a message 3 times, SQS moves it to the DLQ.
- CloudWatch alarm on DLQ message count triggers PagerDuty/Slack notification.
- A separate Lambda or manual process replays DLQ messages after the root cause is fixed.

---

## [SR] Distributed Locking

### Why Needed

Prevent concurrent modifications to shared resources when multiple service instances are running. Examples:
- Two instances of a cron job processing the same batch.
- Two concurrent requests trying to update the same inventory item.
- Preventing duplicate execution of a scheduled task.

### Redis-Based Locks

**Basic pattern:**

```typescript
// Acquire lock
const lockValue = crypto.randomUUID(); // unique to this holder
const acquired = await redis.set(
  `lock:${resourceId}`,
  lockValue,
  'NX',  // only set if not exists
  'EX',  // set expiry
  30     // 30 second TTL
);

if (!acquired) {
  throw new Error('Could not acquire lock');
}

try {
  // Do the protected work
  await doWork();
} finally {
  // Release lock -- MUST check that we still own it
  // Use Lua script for atomicity
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, `lock:${resourceId}`, lockValue);
}
```

**Why the Lua script matters:** Between checking the lock value and deleting it, another process could have acquired the lock (if ours expired). Without the atomic check-and-delete, we would delete someone else's lock.

**Redlock Algorithm (for multi-node Redis):**
1. Get current time.
2. Try to acquire the lock on N independent Redis nodes (e.g., 5) with the same key and value.
3. The lock is considered acquired if it was set on a majority of nodes (N/2 + 1) and the total time spent acquiring is less than the lock TTL.
4. If the lock is acquired, the effective TTL is the original TTL minus the time spent acquiring.
5. If the lock is not acquired (failed on majority or took too long), release it on all nodes.

### DynamoDB Conditional Writes

```typescript
// Acquire lock
await dynamodb.put({
  TableName: 'Locks',
  Item: {
    lockKey: resourceId,
    holder: instanceId,
    expiresAt: Math.floor(Date.now() / 1000) + 30, // TTL
  },
  ConditionExpression: 'attribute_not_exists(lockKey) OR expiresAt < :now',
  ExpressionAttributeValues: {
    ':now': Math.floor(Date.now() / 1000),
  },
}).promise();
```

DynamoDB TTL will automatically clean up expired locks (though TTL deletion is not instantaneous -- it can take up to 48 hours). The `ConditionExpression` handles the common case of checking for expired locks.

### Lease-Based Locking

Instead of holding a lock indefinitely, the holder is granted a **lease** -- a lock with a time limit. The holder must periodically renew the lease. If the holder crashes, the lease expires and another process can acquire it.

```
Holder A acquires lease (TTL = 30s)
  -> Holder A renews lease every 10s (well before expiry)
  -> Holder A crashes at t=15s
  -> Lease expires at t=30s
  -> Holder B acquires lease at t=31s
```

### Why Distributed Locks Are Tricky

**Clock skew:** If node A's clock is ahead of node B's clock, A might think a lock has expired when B thinks it is still valid. Redis Redlock assumes clocks are roughly synchronized, which is not always true.

**GC pauses:** A Java/Node.js process acquires a lock, then a garbage collection pause (or event loop blocking in Node.js) causes it to freeze for longer than the lock TTL. The lock expires, another process acquires it and starts working. The first process resumes, not knowing it lost the lock, and both processes modify the shared resource.

**Network delays:** Similar to GC pauses -- a long network delay between acquiring the lock and using it can cause the lock to expire.

**Fencing tokens -- the solution:**

A fencing token is a monotonically increasing number assigned when a lock is acquired. The protected resource checks the token and rejects requests with stale (lower) tokens.

```
Process A acquires lock, gets fencing token 33
Process A sends request to storage with token 33
  (Process A pauses -- GC, network delay, etc.)
  Lock expires
Process B acquires lock, gets fencing token 34
Process B sends request to storage with token 34 -> accepted
Process A resumes, sends request with token 33 -> REJECTED (33 < 34)
```

This is the definitive solution to the distributed locking problem, as described by Martin Kleppmann. The resource must be modified to understand and enforce fencing tokens.

---

## [SR] Event Sourcing and CQRS

### Event Sourcing

Instead of storing the current state of an entity (e.g., `balance = $500`), store the complete sequence of events that led to that state.

```
Event 1: AccountOpened { accountId: "123", initialBalance: 1000 }
Event 2: MoneyWithdrawn { accountId: "123", amount: 200 }
Event 3: MoneyDeposited { accountId: "123", amount: 50 }
Event 4: MoneyWithdrawn { accountId: "123", amount: 350 }
```

Current state is derived by replaying events: 1000 - 200 + 50 - 350 = $500.

**Benefits:**
- **Complete audit trail:** Every change is recorded. You can answer "what was the balance at 3pm last Tuesday?"
- **Rebuild state:** If you discover a bug in your projection logic, fix it and replay all events to get the correct state.
- **Temporal queries:** "Show me all transactions that were reversed within 24 hours."
- **Event replay:** Feed historical events into new consumers or analytics systems.

**Event store properties:**
- **Append-only:** Events are never updated or deleted. They are immutable facts.
- **Ordered:** Events for a given aggregate have a strict order (sequence number).
- **Durable:** Events are the source of truth -- losing them means losing all state.

**Snapshots:**
Replaying thousands of events for every read is expensive. Periodically, save a **snapshot** -- the materialized state at a point in time. To reconstruct current state, load the latest snapshot and replay only the events that occurred after it.

```
Snapshot at event 1000: { balance: 5000, version: 1000 }
Replay events 1001-1042 on top of snapshot.
```

### CQRS (Command Query Responsibility Segregation)

Separate the write model (commands) from the read model (queries). The write side and read side have different data models, optimized for their respective purposes.

```
Commands (Writes)                    Queries (Reads)
     |                                    ^
     v                                    |
[Write Model]  --events-->  [Event Bus]  -->  [Read Model(s)]
  (normalized,                              (denormalized,
   optimized for                             optimized for
   consistency)                              query patterns)
```

**Write model:**
- Handles commands (CreateOrder, UpdateInventory).
- Enforces business rules and invariants.
- Optimized for consistency (normalized, with constraints).

**Read model:**
- Handles queries (GetOrderDetails, ListProductsByCategory).
- Updated asynchronously from events published by the write model.
- Optimized for specific query patterns (denormalized, pre-joined, pre-aggregated).
- Can have multiple read models for different query needs.

**Asynchronous update:** The read model is eventually consistent with the write model. There is a lag between a write and its visibility in the read model.

### When to Use

**Good fit:**
- Complex domains with very different read and write patterns (many more reads than writes, or reads needing very different data shapes).
- Audit requirements where you need a complete history of changes.
- Event-driven systems where events are already the primary communication mechanism.
- High-scale read workloads where you need multiple specialized read stores (Elasticsearch for search, Redis for caching, DynamoDB for key-value lookups).

**Bad fit:**
- Simple CRUD applications where reads and writes operate on the same data shape.
- Small-scale systems where the added complexity is not justified.
- Teams unfamiliar with the pattern -- the learning curve and operational complexity are significant.
- Domains where strong consistency between reads and writes is required and eventual consistency is unacceptable.

### Connecting to Jishnu's Experience

- **EventBridge as event bus:** Commands in one service produce events that are published to EventBridge, which routes them to consumers that update read models.
- **DynamoDB Streams as event source:** Changes to a DynamoDB table emit a stream of change events. A Lambda consuming this stream can update a separate read-optimized table, feed an Elasticsearch index, or trigger downstream workflows.
- **Separate read models for different consumers:** The Product Collection Service might write to a normalized DynamoDB table (write model) and maintain a denormalized view (read model) for the storefront API, plus another projection for the analytics service.

---

## [SR] Observability

### Three Pillars

#### 1. Metrics

Numerical measurements collected over time. Metrics tell you what is happening at a high level.

**Types:**
- **Counter:** Monotonically increasing value. Examples: total requests served, total errors, total bytes transferred. You derive rates from counters (requests per second = delta counter / delta time).
- **Gauge:** Current value that can go up or down. Examples: current CPU usage, current queue depth, number of active connections.
- **Histogram:** Distribution of values. Examples: request latency percentiles (p50, p95, p99), response body sizes. Implemented as buckets that count how many observations fell into each range.

**USE Method (for resources -- CPU, memory, disk, network):**
- **Utilization:** Percentage of time the resource is busy (CPU at 80%).
- **Saturation:** Amount of work the resource cannot service (queue depth, waiting threads).
- **Errors:** Count of error events (disk I/O errors, network packet drops).

**RED Method (for services -- APIs, microservices):**
- **Rate:** Requests per second.
- **Errors:** Errors per second (or error rate as percentage).
- **Duration:** Latency distribution (p50, p95, p99).

**Interview insight:** USE is for infrastructure, RED is for application services. Together they give a complete picture.

#### 2. Logging

**Structured logging (JSON) over unstructured:**

Bad:
```
[2024-01-15 10:30:45] ERROR - Payment failed for user 12345, order 67890, amount $50.00
```

Good:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "requestId": "req-abc-123",
  "userId": "12345",
  "orderId": "67890",
  "amount": 50.00,
  "error": "InsufficientFunds",
  "message": "Payment failed"
}
```

Structured logs are machine-parseable, queryable, and can be indexed by any field.

**Log levels and when to use them:**
- **ERROR:** Something is broken and requires human attention. An alert should fire. Example: payment processing failed, database connection lost.
- **WARN:** Something unexpected happened but the system handled it. Worth investigating if it becomes frequent. Example: retry succeeded after initial failure, approaching rate limit.
- **INFO:** Normal business events. Example: order created, user logged in, payment processed. This is the default level in production.
- **DEBUG:** Detailed information for development and troubleshooting. Example: request/response payloads, intermediate computation steps. Disabled in production unless actively debugging.

**Essential fields in every log entry:** request ID (correlation ID), timestamp (ISO 8601), service name, log level. Include user ID and relevant entity IDs when available.

#### 3. Distributed Tracing

Follow a single request as it traverses multiple services. A **trace** is a tree of **spans**, where each span represents a unit of work.

```
Trace: "GET /api/orders/123"
  |-- Span: API Gateway (12ms)
       |-- Span: OrderService.getOrder (8ms)
            |-- Span: DynamoDB.getItem (3ms)
            |-- Span: InventoryService.getStock (4ms)
                 |-- Span: Redis.get (1ms)
```

**Span attributes:**
- `traceId`: Unique ID for the entire trace (generated at the entry point).
- `spanId`: Unique ID for this span.
- `parentSpanId`: The span that initiated this span.
- `startTime`, `duration`: When this span started and how long it took.
- `tags/attributes`: Key-value pairs (http.method, http.status_code, db.statement, etc.).

**OpenTelemetry:** The emerging standard for instrumentation. Vendor-neutral APIs and SDKs for generating traces, metrics, and logs. Exporters send data to backends (Jaeger, Zipkin, AWS X-Ray, Datadog).

### Correlation IDs

Generate a unique ID at the API gateway (or the first service that receives the request). Propagate it through all downstream services via HTTP headers (e.g., `X-Request-Id` or `traceparent`). Include it in every log entry.

When debugging a production issue, search for the correlation ID across all services' logs to reconstruct the entire request flow.

### SLIs, SLOs, SLAs

- **SLI (Service Level Indicator):** A measurement. "99.9% of requests complete in under 200ms." "99.95% of requests return a non-5xx response."
- **SLO (Service Level Objective):** A target for an SLI. "We aim for 99.9% availability measured monthly." SLOs are internal targets.
- **SLA (Service Level Agreement):** A contract with customers that specifies consequences (usually financial) for not meeting the SLO. SLAs are typically less strict than SLOs (so you have a buffer).

**Error budgets:** If your SLO is 99.9% availability (43.2 minutes of downtime per month), you have a 0.1% error budget. As long as you have budget remaining, you can deploy risky changes. When the budget is exhausted, you slow down and focus on reliability.

### Mapping to Jishnu's Stack

- **CloudWatch Metrics:** Built-in Lambda metrics (invocations, errors, duration, throttles). Custom metrics via CloudWatch Embedded Metric Format.
- **CloudWatch Logs:** Structured JSON logs from Lambda. Log Insights for querying.
- **Prometheus + Grafana:** For custom application metrics if running ECS/EKS workloads. Grafana dashboards for visualization and alerting.
- **AWS X-Ray or OpenTelemetry:** Distributed tracing across Lambda, API Gateway, SQS, DynamoDB. X-Ray integrates natively with AWS services. OpenTelemetry provides vendor-neutral instrumentation with an X-Ray exporter.

---

## [SR] Common Failure Modes

### 1. Network Partitions

**What it is:** A network failure prevents some nodes or services from communicating with each other, even though each side is still running. The system splits into isolated groups.

**Real example:** An AWS Availability Zone loses connectivity to other AZs. Services in that AZ can talk to each other but not to services in other AZs. Or: a Kubernetes pod loses connectivity to the database but can still receive requests from the load balancer.

**How to handle:**
- **Timeouts:** Detect the partition quickly rather than hanging indefinitely.
- **Retries with backoff:** Transient network issues may resolve themselves.
- **Circuit breakers:** Stop hammering a partitioned service and fail fast.
- **Eventual consistency:** Design the system so that each partition can continue operating independently and reconcile when connectivity is restored.
- **CAP theorem context:** During a partition, you must choose between consistency (refuse to serve requests) and availability (serve potentially stale data).

### 2. Cascading Failures

**What it is:** One service failure triggers failures in dependent services, which trigger failures in their dependents, and so on. A small failure amplifies into a system-wide outage.

**Real example:** The payment service becomes slow (not down, just slow). The order service calls the payment service synchronously and its threads/connections start piling up waiting. The order service runs out of connections and stops responding. The API gateway sees the order service as down and returns errors. The mobile app retries aggressively, amplifying the load.

**How to handle:**
- **Circuit breakers:** When the payment service is slow, trip the circuit and fail fast for payment-related requests. Other functionality (browsing, cart) continues to work.
- **Bulkheads:** Separate connection pools for different dependencies. The payment service being slow does not consume connections allocated to the inventory service.
- **Graceful degradation:** If payment is down, allow users to place orders with deferred payment processing. The system continues to provide value even in a degraded state.
- **Async over sync:** Use SQS/EventBridge to decouple services. Instead of synchronous HTTP calls, publish an event and let the downstream process it when it can.

### 3. Thundering Herd

**What it is:** A large number of clients or processes simultaneously retry or request the same resource, overwhelming it. Often occurs after a brief outage when all clients retry at the same time.

**Real example:** A cache entry expires and 10,000 concurrent requests all try to regenerate it simultaneously, hammering the database. Or: a service recovers from an outage, and all clients that were retrying during the outage send their requests at once.

**How to handle:**
- **Jitter:** Add randomness to retry intervals so clients do not all retry at the same time.
- **Exponential backoff:** Increasing delays between retries spreads the load over time.
- **Queue-based load leveling:** Put requests in a queue (SQS) and process them at a controlled rate, rather than letting all requests hit the service directly.
- **Cache stampede prevention:** Use a locking mechanism so only one request regenerates the cache entry while others wait. Or use "stale-while-revalidate" -- serve the stale cache entry while one background process refreshes it.
- **Request coalescing:** If multiple requests are for the same data, only send one request to the backend and share the result.

### 4. Split Brain

**What it is:** A distributed system that requires a single leader ends up with two or more nodes believing they are the leader. Both accept writes, causing conflicting state.

**Real example:** In a primary-replica database setup, the primary becomes temporarily unreachable due to a network partition. The replicas elect a new primary. The old primary recovers and starts accepting writes again. Now there are two primaries with divergent data.

**How to handle:**
- **Fencing tokens:** The new leader gets a higher-numbered token. Resources reject operations from the old leader's lower-numbered token.
- **Quorum-based decisions:** Require a majority of nodes to agree on the leader. Since a majority can only exist on one side of a partition, only one side can elect a leader (Raft, ZAB).
- **Epoch/term numbers:** Each leadership term has a monotonically increasing number. Nodes reject messages from leaders with a stale term (as in Raft).

### 5. Message Ordering

**What it is:** Events or messages are processed in a different order than they were produced, leading to incorrect state.

**Real example:** An inventory service receives "ItemSold" before "ItemAdded" due to network delays or parallel processing. The inventory count goes negative. Or: a user updates their profile name to "Alice" then to "Bob," but the messages arrive in reverse order, and the final state is "Alice."

**How to handle:**
- **Sequence numbers:** Attach a monotonically increasing sequence number to each message. The consumer tracks the last processed sequence number and rejects/reorders out-of-sequence messages.
- **Idempotent processing with last-write-wins:** If each message includes a version/timestamp, the consumer only applies the update if it is newer than the current state.
- **Single-partition ordering:** SQS FIFO queues guarantee ordering within a MessageGroupId. Kafka guarantees ordering within a partition. Route all messages for the same entity to the same partition/group.
- **Event sourcing:** Store all events and derive state by replaying in order. Even if processing is temporarily out of order, the materialized state is correct.

### 6. Data Inconsistency Across Services

**What it is:** Different services have different views of the same logical data because updates propagate asynchronously and some may fail.

**Real example:** The order service marks an order as "confirmed," but the inventory service failed to reserve the stock (the SQS message was lost or the Lambda crashed). The order exists but the inventory was never reserved, leading to an unfulfillable order.

**How to handle:**
- **Eventual consistency with guarantees:** Use at-least-once delivery (SQS, EventBridge) and idempotent consumers to ensure all services eventually process all events.
- **Saga compensation:** If a downstream step fails, execute compensating transactions to undo previous steps.
- **Reconciliation jobs:** Periodic batch jobs that compare data across services and flag or fix discrepancies. Example: a nightly job compares order records with inventory reservations and creates alerts for mismatches.
- **Outbox pattern:** Instead of publishing an event directly, write the event to an "outbox" table in the same database transaction as the state change. A separate process reads the outbox and publishes to the message bus. This guarantees that the state change and the event are atomic.

### 7. Clock Skew

**What it is:** Different servers have different system clocks. Even with NTP synchronization, clocks can drift by milliseconds to seconds. If the system relies on timestamps for ordering or expiry, clock skew causes subtle bugs.

**Real example:** Server A's clock is 2 seconds ahead of Server B's clock. Server A acquires a distributed lock with a 10-second TTL at what it thinks is t=0 (actually t=2 in real time). Server B checks the lock at real time t=9 (Server A thinks 9 seconds passed, Server B thinks 7 seconds passed). The lock appears valid to both, depending on whose clock you trust.

**How to handle:**
- **NTP (Network Time Protocol):** Keep clocks synchronized. Modern NTP can keep clocks within a few milliseconds. Amazon Time Sync Service provides microsecond accuracy within AWS.
- **Logical clocks (Lamport clocks):** A counter that increments on every event. If event A causally precedes event B, then Lamport(A) < Lamport(B). Does not rely on physical time at all.
- **Vector clocks:** An extension of Lamport clocks that tracks causality across multiple nodes. Each node maintains a vector of counters. Allows you to determine if two events are causally related or concurrent.
- **Avoid relying on timestamps for ordering:** Use sequence numbers, version numbers, or logical clocks instead. If you must use timestamps, include them as hints (for conflict resolution in last-write-wins), not as the source of truth for ordering.
- **Google TrueTime (Spanner):** Uses GPS and atomic clocks to bound clock uncertainty. Operations wait out the uncertainty window to guarantee correct ordering. Not available outside Google's infrastructure, but the concept is instructive.

---

## Quick Reference: Decision Matrix

| Problem | First Reach For | Second Option | Avoid |
|---------|-----------------|---------------|-------|
| Cross-service data consistency | Saga (choreography via EventBridge) | Saga (orchestration) | 2PC across services |
| Duplicate message processing | Idempotency key + DynamoDB | SQS FIFO deduplication | Trusting "exactly-once" claims |
| Failing downstream service | Circuit breaker + DLQ | Retry with backoff + jitter | Unbounded retries |
| Concurrent resource access | DynamoDB conditional writes | Redis distributed lock | No locking at all |
| Complex read/write patterns | CQRS with DynamoDB Streams | Event sourcing | Over-engineering simple CRUD |
| Debugging production issues | Correlation IDs + structured logs | Distributed tracing (X-Ray) | Unstructured logs |
| Message ordering | SQS FIFO with MessageGroupId | Sequence numbers + idempotent consumer | Assuming standard SQS ordering |
