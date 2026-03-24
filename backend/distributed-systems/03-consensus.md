# Consensus

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
