# Message Queues

## 7. Message Queues **[SR]**

### What It Is
An intermediary that decouples producers from consumers, enabling asynchronous communication, load leveling, and fault tolerance.

### How It Works

```
POINT-TO-POINT (Queue)            PUB/SUB (Topic)

Producer --> [Queue] --> Consumer   Publisher --> [Topic] --> Subscriber A
                                                         --> Subscriber B
  One message consumed once.                              --> Subscriber C
  Work distribution.               One message to all subscribers.
                                    Event notification.
```

### Delivery Guarantees
- **At-most-once**: fire and forget. May lose messages. Fast.
- **At-least-once**: retry until acknowledged. May duplicate. Most common (SQS default).
- **Exactly-once**: hardest to achieve. Kafka has it via idempotent producers + transactional consumers. Typically you use at-least-once + idempotent consumers instead.

### Comparison Table

| Feature | SQS | Kafka | RabbitMQ |
|---------|-----|-------|----------|
| Model | Queue (point-to-point) | Log (pub/sub + replay) | Both (queue + exchange routing) |
| Ordering | FIFO queues guarantee order | Per-partition ordering | Per-queue ordering |
| Throughput | High (managed, auto-scale) | Very high (millions/sec) | Moderate |
| Retention | 14 days max | Configurable (days to forever) | Until consumed |
| Replay | No (message deleted after consumption) | Yes (offset-based replay) | No |
| Managed AWS | SQS (native) | MSK (managed Kafka) | AmazonMQ |
| Best for | Task queues, decoupling | Event streaming, audit logs, replay | Complex routing, RPC |

### Key Trade-offs

| Gain | Lose |
|------|------|
| Decoupled services, fault tolerance, load leveling | Added latency (async), operational complexity |
| Retry/DLQ for reliability | Message ordering is hard at scale |
| Kafka replay for reprocessing | Kafka operational complexity (partitions, consumer groups) |

### When to Use (Interview Triggers)
- "Services need to communicate asynchronously" -- message queue
- "What if the downstream service is down?" -- queue absorbs the load
- "We need to process events and replay if something goes wrong" -- Kafka
- "Fire-and-forget notifications" -- SNS

### Real-World Mapping
- **SQS**: your bread and butter. Standard queues for high throughput, FIFO for ordering. DLQ for failed messages.
- **SNS**: fan-out pub/sub. SNS -> multiple SQS queues is a classic pattern.
- **EventBridge**: event bus with rules-based routing. You use this for event-driven microservices. Richer routing than SNS (content-based filtering on event payload).
- Your pattern: EventBridge (event bus) -> SQS (queue per consumer) -> Lambda (processor) with DLQ for failures.
