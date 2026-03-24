# CAP Theorem and PACELC

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
