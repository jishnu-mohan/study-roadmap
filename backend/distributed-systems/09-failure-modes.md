# Common Failure Modes

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
