# Event-Driven Architecture

## 12. Event-Driven Architecture **[SR]**

### What It Is
A design paradigm where state changes are represented as events, and services react to events rather than being directly called. This is your core competency.

### How It Works

```
EVENT SOURCING
Instead of storing current state, store the sequence of events.

  Event Store: [OrderCreated] -> [ItemAdded] -> [ItemAdded] -> [OrderPaid]

  Current state = replay all events
  Benefits: full audit trail, can rebuild state, time travel debugging


CQRS (Command Query Responsibility Segregation)

  Commands (writes)              Queries (reads)
       |                              |
       v                              v
  +----------+   events     +------------+
  |  Write   | -----------> |   Read     |
  |  Model   |              |   Model    |
  | (events) |              | (optimized |
  +----------+              |   views)   |
       |                         |
  [Event Store]          [Read-optimized DB]
```

### Choreography vs Orchestration

```
CHOREOGRAPHY (decentralized)          ORCHESTRATION (centralized)
Each service reacts to events.        A coordinator tells services what to do.

OrderService                          Orchestrator (Step Functions)
  publishes: OrderCreated               |
       |                                +-> Create Order
InventoryService                        +-> Reserve Inventory
  listens: OrderCreated                 +-> Process Payment
  publishes: InventoryReserved          +-> Send Confirmation
       |
PaymentService
  listens: InventoryReserved
  publishes: PaymentProcessed
```

| | Choreography | Orchestration |
|--|-------------|---------------|
| Coupling | Loose (services don't know about each other) | Tighter (orchestrator knows the flow) |
| Visibility | Hard to see full flow | Easy to see in one place |
| Complexity | Grows with number of services | Centralized in orchestrator |
| Failure handling | Each service handles its own | Orchestrator handles globally |

### Idempotency
Critical in event-driven systems because messages can be delivered more than once.

Techniques:
- **Idempotency key**: store processed event IDs, skip duplicates
- **Database upsert**: INSERT ON CONFLICT DO NOTHING
- **Conditional writes**: DynamoDB conditional expressions (attribute_not_exists)

### Key Trade-offs

| Gain | Lose |
|------|------|
| Loose coupling, independent scaling | Debugging distributed flows is hard |
| Natural audit trail (event sourcing) | Eventual consistency (not immediate) |
| Resilience (events buffered in queues) | Ordering challenges, duplicate handling |

### When to Use (Interview Triggers)
- "How do you handle workflows across multiple services?" -- event-driven with choreography or orchestration
- "How do you ensure data consistency without distributed transactions?" -- saga pattern with compensating events
- "What if a message is processed twice?" -- idempotency

### Real-World Mapping
- **EventBridge**: your event bus. Rules route events to targets based on event content.
- **SQS + DLQ**: your consumer queues with dead-letter handling for failed events.
- **Lambda**: your event processors (triggered by SQS, EventBridge, etc.).
- **Step Functions**: AWS orchestration service (state machine for complex workflows).
- This is literally what you do every day. In interviews, draw from real examples of event flows you have built.
