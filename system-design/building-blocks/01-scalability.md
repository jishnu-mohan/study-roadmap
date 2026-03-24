# Scalability

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
