# Load Balancing

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
