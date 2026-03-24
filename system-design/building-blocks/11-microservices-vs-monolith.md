# Microservices vs Monolith

## 11. Microservices vs Monolith **[SR]**

### What It Is
An architectural decision about how to structure your application: as a single deployable unit (monolith) or as a collection of independently deployable services (microservices).

### How It Works

```
MONOLITH                          MICROSERVICES

+-------------------+             +--------+  +--------+  +--------+
|                   |             |  Auth  |  | Orders |  |Inventory|
|  All features     |             |Service |  |Service |  |Service  |
|  in one           |             +--------+  +--------+  +--------+
|  deployable       |                  |           |           |
|  unit             |             +--------+  +---------+
|                   |             |  User  |  |Notification|
+-------------------+             |Service |  |  Service   |
        |                         +--------+  +---------+
   [Single DB]
                                  Each service has its own DB
                                  (Database per service pattern)
```

### Service Communication

| Type | Sync (REST/gRPC) | Async (Messaging) |
|------|------------------|-------------------|
| How | Direct HTTP/gRPC call | Events via queue/bus |
| Coupling | Temporal coupling (both must be up) | Loose coupling |
| Latency | Lower for single call | Higher (queue overhead) |
| Failure | Cascading failures possible | Queue absorbs failures |
| Use when | Need immediate response | Fire-and-forget, eventual consistency OK |

In your stack: you primarily use async communication (EventBridge -> SQS -> Lambda), which is the recommended pattern for microservices.

### When to Use Each

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team size | Small team (< 10) | Multiple teams with clear ownership |
| Domain understanding | Evolving, unclear boundaries | Well-understood domain boundaries |
| Deployment | Simple (one artifact) | Independent deployment per service |
| Scaling | Scale entire app | Scale individual services |
| Data consistency | Easy (single DB, transactions) | Hard (distributed transactions, eventual consistency) |

### Key Trade-offs

| Gain (Microservices) | Lose (Microservices) |
|---------------------|---------------------|
| Independent scaling and deployment | Network latency, distributed debugging |
| Technology diversity per service | Operational complexity (K8s, service mesh) |
| Fault isolation | Distributed transactions are hard |

### When to Use (Interview Triggers)
- "Design a new system from scratch" -- start with well-structured monolith, extract services when boundaries are clear
- "How do your services communicate?" -- sync for queries, async for commands/events
- "How to handle failures across services?" -- circuit breakers, retries with backoff, DLQs

### Real-World Mapping
- **Your Treez architecture**: microservices communicating via EventBridge/SQS, each Lambda function is a microservice
- **API Gateway**: single entry point for all microservices
- **ECS/EKS (Kubernetes)**: container orchestration for microservices
- **CloudFormation**: infrastructure-as-code per service stack
