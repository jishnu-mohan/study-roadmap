# Consistent Hashing

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
