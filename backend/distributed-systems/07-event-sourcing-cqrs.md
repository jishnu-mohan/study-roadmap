# Event Sourcing and CQRS

### Event Sourcing

Instead of storing the current state of an entity (e.g., `balance = $500`), store the complete sequence of events that led to that state.

```
Event 1: AccountOpened { accountId: "123", initialBalance: 1000 }
Event 2: MoneyWithdrawn { accountId: "123", amount: 200 }
Event 3: MoneyDeposited { accountId: "123", amount: 50 }
Event 4: MoneyWithdrawn { accountId: "123", amount: 350 }
```

Current state is derived by replaying events: 1000 - 200 + 50 - 350 = $500.

**Benefits:**
- **Complete audit trail:** Every change is recorded. You can answer "what was the balance at 3pm last Tuesday?"
- **Rebuild state:** If you discover a bug in your projection logic, fix it and replay all events to get the correct state.
- **Temporal queries:** "Show me all transactions that were reversed within 24 hours."
- **Event replay:** Feed historical events into new consumers or analytics systems.

**Event store properties:**
- **Append-only:** Events are never updated or deleted. They are immutable facts.
- **Ordered:** Events for a given aggregate have a strict order (sequence number).
- **Durable:** Events are the source of truth -- losing them means losing all state.

**Snapshots:**
Replaying thousands of events for every read is expensive. Periodically, save a **snapshot** -- the materialized state at a point in time. To reconstruct current state, load the latest snapshot and replay only the events that occurred after it.

```
Snapshot at event 1000: { balance: 5000, version: 1000 }
Replay events 1001-1042 on top of snapshot.
```

### CQRS (Command Query Responsibility Segregation)

Separate the write model (commands) from the read model (queries). The write side and read side have different data models, optimized for their respective purposes.

```
Commands (Writes)                    Queries (Reads)
     |                                    ^
     v                                    |
[Write Model]  --events-->  [Event Bus]  -->  [Read Model(s)]
  (normalized,                              (denormalized,
   optimized for                             optimized for
   consistency)                              query patterns)
```

**Write model:**
- Handles commands (CreateOrder, UpdateInventory).
- Enforces business rules and invariants.
- Optimized for consistency (normalized, with constraints).

**Read model:**
- Handles queries (GetOrderDetails, ListProductsByCategory).
- Updated asynchronously from events published by the write model.
- Optimized for specific query patterns (denormalized, pre-joined, pre-aggregated).
- Can have multiple read models for different query needs.

**Asynchronous update:** The read model is eventually consistent with the write model. There is a lag between a write and its visibility in the read model.

### When to Use

**Good fit:**
- Complex domains with very different read and write patterns (many more reads than writes, or reads needing very different data shapes).
- Audit requirements where you need a complete history of changes.
- Event-driven systems where events are already the primary communication mechanism.
- High-scale read workloads where you need multiple specialized read stores (Elasticsearch for search, Redis for caching, DynamoDB for key-value lookups).

**Bad fit:**
- Simple CRUD applications where reads and writes operate on the same data shape.
- Small-scale systems where the added complexity is not justified.
- Teams unfamiliar with the pattern -- the learning curve and operational complexity are significant.
- Domains where strong consistency between reads and writes is required and eventual consistency is unacceptable.

### Connecting to Jishnu's Experience

- **EventBridge as event bus:** Commands in one service produce events that are published to EventBridge, which routes them to consumers that update read models.
- **DynamoDB Streams as event source:** Changes to a DynamoDB table emit a stream of change events. A Lambda consuming this stream can update a separate read-optimized table, feed an Elasticsearch index, or trigger downstream workflows.
- **Separate read models for different consumers:** The Product Collection Service might write to a normalized DynamoDB table (write model) and maintain a denormalized view (read model) for the storefront API, plus another projection for the analytics service.

---
