# Consistency Models

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
