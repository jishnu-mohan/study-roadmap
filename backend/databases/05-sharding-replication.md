# Database Sharding and Replication

### Sharding Strategies

Sharding is splitting data across multiple database instances. Each shard holds a subset of the data. This is how you scale writes horizontally.

#### Hash-Based Sharding

Assign each row to a shard by hashing its shard key: `shard = hash(key) % num_shards`.

**Pros:**
- Even data distribution (assuming a good hash function and a reasonably distributed key)
- Simple to implement

**Cons:**
- Range queries across shard keys require querying all shards (scatter-gather)
- Adding/removing shards requires rehashing and migrating data (consistent hashing mitigates this)

**Example:** Shard users by `hash(user_id) % 4`. User data is evenly distributed, but "find all users created in March" requires querying all 4 shards.

#### Range-Based Sharding

Assign rows based on ranges of the shard key: `shard 1: user_id 1-1M, shard 2: user_id 1M-2M`.

**Pros:**
- Range queries on the shard key only hit relevant shards
- Good for time-series data (shard by month/year, old shards can be archived)

**Cons:**
- Risk of hot shards (new data always goes to the latest shard)
- Data distribution can be uneven if the key is not uniformly distributed

#### Geographic Sharding

Assign data based on geographic region.

**Pros:**
- Data locality: users access the shard closest to them (lower latency)
- Compliance: data residency requirements (GDPR -- EU data stays in EU)

**Cons:**
- Uneven distribution (some regions have more users)
- Cross-region queries are expensive

---

### Challenges

1. **Cross-shard queries**: Queries that need data from multiple shards require a scatter-gather pattern. Performance degrades as shard count increases. Solution: design the shard key to match your most common access pattern.

2. **Distributed joins**: Joining data across shards is extremely expensive (requires shipping data between shards). Denormalize to keep frequently-joined data on the same shard.

3. **Rebalancing**: When a shard gets too large, splitting it and migrating data is operationally risky. Consistent hashing (virtual nodes) helps by minimizing data movement.

4. **Schema changes**: ALTER TABLE must run on every shard. Use online DDL tools (e.g., `pt-online-schema-change`, `gh-ost`) and deploy shard-by-shard.

5. **Maintaining uniqueness across shards**: Auto-increment IDs do not work across shards. Use UUIDs, Snowflake IDs, or a centralized ID service.

6. **Transactions across shards**: 2-phase commit is slow and fragile. Prefer saga patterns or design data to avoid cross-shard transactions.

---

### Replication

#### Leader-Follower (Primary-Replica)

One leader handles all writes. Followers replicate the leader's data and serve reads.

```
  Writes -> [Leader] --replication--> [Follower 1] <- Reads
                     --replication--> [Follower 2] <- Reads
```

- **Reads scale** horizontally (add more followers)
- **Writes do not scale** (single leader bottleneck)
- **Replication lag**: Followers may be slightly behind the leader. A read immediately after a write might not see the new data (read-your-writes consistency requires reading from the leader or using synchronous replication).

PostgreSQL supports streaming replication (asynchronous by default, synchronous optional). AWS RDS supports up to 5 read replicas.

#### Leader-Leader (Multi-Primary)

Multiple nodes accept writes and replicate to each other.

```
  Writes -> [Leader A] <--replication--> [Leader B] <- Writes
```

- **Write availability**: If one leader goes down, the other continues accepting writes
- **Conflict resolution needed**: If both leaders modify the same row simultaneously, you need a strategy (last-writer-wins, custom merge logic, CRDTs)
- Rarely used in practice due to conflict complexity. PostgreSQL BDR (Bi-Directional Replication) supports this.

#### Quorum-Based Replication

Used in distributed databases (Cassandra, DynamoDB internally). Writes go to W nodes, reads from R nodes. If W + R > N (total replicas), reads are guaranteed to see the latest write.

```
N = 3 replicas
W = 2 (write to 2 of 3 nodes)
R = 2 (read from 2 of 3 nodes)
W + R = 4 > 3 = guaranteed consistency
```

Trade-off: higher W means slower writes but faster consistent reads. Higher R means slower reads but faster writes.

---

### Read Replicas

**Use cases:**
- Offload read-heavy workloads (analytics queries, reports) from the primary
- Geographic distribution (replica in each region for lower latency reads)
- Failover target (promote replica to primary if primary fails)

**Replication lag considerations:**
- Asynchronous replication: lag is typically milliseconds to seconds, but can spike during high write load or large transactions
- For "read-your-writes" consistency: either read from primary for a short window after writes, or use synchronous replication (at the cost of write latency)
- Monitor replication lag: in PostgreSQL, check `pg_stat_replication` on the primary
- In AWS RDS: CloudWatch metric `ReplicaLag`

```sql
-- Check replication lag on PostgreSQL primary
SELECT client_addr, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       replay_lag
FROM pg_stat_replication;
```

---
