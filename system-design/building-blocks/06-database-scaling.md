# Database Scaling

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
