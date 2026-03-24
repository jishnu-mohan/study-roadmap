# Distributed Transactions

### Two-Phase Commit (2PC)

A protocol for achieving atomicity across multiple participants (typically database nodes or resource managers).

**Phase 1 -- Prepare:**
- The coordinator sends a "prepare" message to all participants.
- Each participant executes the transaction locally (acquires locks, writes to WAL) and responds with either "vote-commit" (ready to commit) or "vote-abort" (something went wrong).

**Phase 2 -- Commit/Abort:**
- If all participants voted commit, the coordinator sends "commit" to all.
- If any participant voted abort, the coordinator sends "abort" to all.
- Participants execute the final commit or rollback and acknowledge.

**The fundamental problem:** 2PC is a **blocking protocol**. If the coordinator crashes after sending "prepare" but before sending the commit/abort decision, all participants are stuck holding locks, unable to proceed. They cannot safely commit (maybe the coordinator decided to abort) or abort (maybe the coordinator decided to commit). They must wait for the coordinator to recover.

**When to use:** Within a single database cluster or between tightly coupled resources managed by the same team. Not across microservices -- the failure modes and latency are unacceptable.

**When NOT to use:** Across microservices owned by different teams, across organizational boundaries, or when high availability is required.

### Saga Pattern

A sequence of local transactions where each step has a corresponding compensating transaction. If any step fails, the previously completed steps are undone by executing their compensating transactions in reverse order.

**Choreography-based Saga:**
Each service listens for events emitted by other services and decides what to do next.

```
OrderService emits "OrderCreated"
  -> InventoryService hears it, reserves stock, emits "InventoryReserved"
    -> PaymentService hears it, charges card, emits "PaymentCharged"
      -> OrderService hears it, marks order as confirmed
```

- Pros: Decoupled services, no single point of failure, scales naturally.
- Cons: Hard to understand the overall flow by looking at one service. Difficult to debug when things go wrong. Adding a new step means modifying multiple services.

**Orchestration-based Saga:**
A central orchestrator (a dedicated service or workflow engine) coordinates the steps explicitly.

```
OrderOrchestrator:
  1. Call InventoryService.reserveStock()
  2. Call PaymentService.chargeCard()
  3. Call OrderService.confirmOrder()
  On failure at step 2:
    Call InventoryService.releaseStock()  // compensate step 1
```

- Pros: The entire flow is visible in one place. Easier to add/remove/reorder steps. Easier to debug and monitor.
- Cons: The orchestrator is a single point of failure (mitigate with durability and retries). Can become a "god service" if not carefully scoped.

**Compensating transactions:**

| Step | Forward Action | Compensating Action |
|------|---------------|-------------------|
| 1 | CreateOrder | CancelOrder |
| 2 | ReserveInventory | ReleaseInventory |
| 3 | ChargePayment | RefundPayment |
| 4 | ShipOrder | (may not be compensable -- this is a key design consideration) |

Key insight: not every action is easily compensable. Sending an email, shipping a physical product, or calling an external API with side effects may require alternative strategies (like "semantic undo" or manual intervention).

### When to Use 2PC vs Saga

| Criteria | 2PC | Saga |
|----------|-----|------|
| Consistency | Strong (ACID) | Eventual |
| Scope | Within a bounded context / single DB cluster | Across microservices |
| Latency tolerance | Low latency required between participants | Tolerates higher latency |
| Failure handling | Blocking on coordinator failure | Non-blocking, compensating transactions |
| Complexity | Protocol is simple, failure modes are hard | Pattern is conceptually simple, compensation logic is complex |

### Practical Example: Order Processing Saga

Connecting to Jishnu's experience at Treez with EventBridge orchestration:

```
EventBridge Rule: "OrderCreated"
  -> SQS Queue -> Lambda: ValidateOrder
    -> Emits "OrderValidated" to EventBridge

EventBridge Rule: "OrderValidated"
  -> SQS Queue -> Lambda: ReserveInventory
    -> Emits "InventoryReserved" to EventBridge

EventBridge Rule: "InventoryReserved"
  -> SQS Queue -> Lambda: ProcessPayment
    -> On success: Emits "PaymentProcessed"
    -> On failure: Emits "PaymentFailed"

EventBridge Rule: "PaymentFailed"
  -> SQS Queue -> Lambda: ReleaseInventory (compensating transaction)
    -> Emits "InventoryReleased"
  -> SQS Queue -> Lambda: CancelOrder (compensating transaction)
```

Each Lambda is an idempotent consumer. Each SQS queue has a DLQ. The EventBridge rules define the choreography. This maps directly to the event-driven architecture pattern Jishnu has built.

---
