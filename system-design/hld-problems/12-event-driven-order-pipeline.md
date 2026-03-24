# Event-Driven Order Processing Pipeline

## Problem 12: Event-Driven Order Processing Pipeline **[SR]**

### Problem Statement
Design an event-driven order processing pipeline that handles the full order lifecycle (placement, payment, fulfillment, delivery) using the saga pattern with compensating transactions. This directly maps to your daily work with EventBridge, SQS, and Lambda.

### Step 1: Requirements

**Functional Requirements**
- Place orders with multiple items
- Process payments (authorize, capture, refund)
- Reserve and decrement inventory
- Handle fulfillment (pick, pack, ship)
- Send notifications at each stage
- Handle failures at any stage with compensation (rollback)

**Non-Functional Requirements**
- No data loss (every order must be processed or explicitly failed)
- Eventual consistency across services (no distributed transactions)
- Idempotent operations (at-least-once message delivery)
- Complete audit trail of all state changes
- Handle 10K orders/hour at peak

### Step 2: Back-of-Envelope Estimation

```
10K orders/hour = ~3 orders/sec
Each order triggers ~8 events across the pipeline
Total events: 24 events/sec
Each event: ~2KB payload
Event throughput: 48KB/sec (trivial for EventBridge/SQS)

State storage: 10K orders/hour * 24 hours * 500B = 120MB/day
30-day retention: 3.6GB
```

### Step 3: High-Level Architecture

```
  Client
    |
    v
  +-----------+
  |Order API  |
  +-----------+
    |
    v (OrderPlaced event)
  +------------------+
  | EventBridge      |
  +------------------+
    |         |         |         |
    v         v         v         v
  +------+ +------+ +------+ +------+
  |SQS:  | |SQS:  | |SQS:  | |SQS:  |
  |Payment| |Inven | |Fulfil| |Notif |
  +------+ +------+ +------+ +------+
    |         |         |         |
    v         v         v         v
  Lambda   Lambda    Lambda    Lambda
    |         |         |
    v         v         v
  (PaymentAuthorized) (InventoryReserved) (events back to EventBridge)
    |
    v
  +------------------+
  | Order State      |  (tracks saga state)
  | Machine / DB     |
  +------------------+

  COMPENSATION FLOW (on failure):
  PaymentFailed --> publish CompensateInventory --> release reserved stock
  InventoryInsufficient --> publish CompensatePayment --> void authorization
```

### Step 4: Database Design

```
PostgreSQL - Orders:
  Table: orders
    id              UUID PRIMARY KEY
    user_id         UUID
    status          VARCHAR  -- state machine states (see below)
    total_cents     INT
    items           JSONB
    shipping_address JSONB
    created_at      TIMESTAMP
    updated_at      TIMESTAMP

  Table: order_items
    id              UUID
    order_id        UUID REFERENCES orders(id)
    product_id      UUID
    sku             VARCHAR
    quantity        INT
    unit_price_cents INT

  Table: order_events (event sourcing / audit trail)
    id              UUID
    order_id        UUID
    event_type      VARCHAR  -- "OrderPlaced", "PaymentAuthorized", "InventoryReserved"
    payload         JSONB
    created_at      TIMESTAMP
    -- This is your audit trail. Append-only. Never update or delete.

  Table: idempotency_keys
    key             VARCHAR PRIMARY KEY  -- event_id or message_id
    processed_at    TIMESTAMP
    result          JSONB
    -- Used to deduplicate event processing

State Machine States:
  PLACED -> PAYMENT_PENDING -> PAYMENT_AUTHORIZED -> INVENTORY_RESERVED
    -> FULFILLMENT_PENDING -> SHIPPED -> DELIVERED

  Failure states:
  PAYMENT_FAILED -> CANCELLED
  INVENTORY_INSUFFICIENT -> PAYMENT_VOIDED -> CANCELLED
  FULFILLMENT_FAILED -> REFUNDED -> CANCELLED
```

### Step 5: API Design

```
POST /api/v1/orders
  Body: {
    "items": [{ "sku": "ABC", "quantity": 2 }],
    "shipping_address": { ... },
    "payment_method_id": "pm_123",
    "idempotency_key": "client-generated-uuid"
  }
  Response: { "order_id": "uuid", "status": "placed" }
  Status: 202 Accepted  (async processing begins)

GET /api/v1/orders/:id
  Response: {
    "id": "uuid",
    "status": "payment_authorized",
    "items": [...],
    "events": [
      { "type": "OrderPlaced", "at": "..." },
      { "type": "PaymentAuthorized", "at": "..." }
    ]
  }

GET /api/v1/orders/:id/events  (full event history)
POST /api/v1/orders/:id/cancel
```

### Step 6: Deep Dive

**1. Saga Pattern -- Choreography**

Each service listens for events and publishes its result. No central coordinator.

```
Happy Path:
  OrderService: publishes OrderPlaced
  PaymentService: listens OrderPlaced -> authorizes payment -> publishes PaymentAuthorized
  InventoryService: listens PaymentAuthorized -> reserves stock -> publishes InventoryReserved
  FulfillmentService: listens InventoryReserved -> starts fulfillment -> publishes OrderShipped
  NotificationService: listens to ALL events -> sends appropriate notifications

Failure Path (inventory insufficient):
  InventoryService: listens PaymentAuthorized -> insufficient stock -> publishes InventoryInsufficient
  PaymentService: listens InventoryInsufficient -> voids payment auth -> publishes PaymentVoided
  OrderService: listens PaymentVoided -> updates order status to CANCELLED
  NotificationService: listens InventoryInsufficient -> notifies user
```

**2. State Machine Implementation**

```
Valid transitions (enforced in code):

  PLACED:
    + PaymentAuthorized -> PAYMENT_AUTHORIZED
    + PaymentFailed -> CANCELLED

  PAYMENT_AUTHORIZED:
    + InventoryReserved -> INVENTORY_RESERVED
    + InventoryInsufficient -> PAYMENT_VOID_PENDING

  INVENTORY_RESERVED:
    + FulfillmentStarted -> FULFILLMENT_PENDING

  FULFILLMENT_PENDING:
    + OrderShipped -> SHIPPED

  SHIPPED:
    + OrderDelivered -> DELIVERED

Invalid transitions are rejected and logged as anomalies.
```

**3. Idempotency in Practice**

Every Lambda handler follows this pattern:

```
async function handleEvent(event) {
  const eventId = event.detail.eventId;

  // Check if already processed
  const existing = await db.query(
    'SELECT result FROM idempotency_keys WHERE key = $1',
    [eventId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].result;  // Already processed, return cached result
  }

  // Process the event
  const result = await processOrder(event);

  // Record idempotency key
  await db.query(
    'INSERT INTO idempotency_keys (key, processed_at, result) VALUES ($1, NOW(), $2)',
    [eventId, JSON.stringify(result)]
  );

  return result;
}
```

**4. DLQ Handling**

```
SQS Queue --> Lambda (max 3 retries) --> DLQ

DLQ monitoring:
  - CloudWatch Alarm: DLQ message count > 0
  - Lambda polls DLQ periodically:
    1. Log the failed message with full context
    2. Publish to monitoring/alerting
    3. Optionally retry after a delay (exponential backoff)
    4. If still failing, create a support ticket/incident

  - Manual DLQ redrive: SQS now supports native redrive (move messages back to source queue)
```

### Step 7: Scaling and Trade-offs

- **EventBridge**: handles event routing at scale, content-based filtering reduces unnecessary processing
- **SQS per consumer**: each service has its own queue, preventing one slow consumer from blocking others
- **Trade-off**: choreography (loose coupling, hard to debug) vs orchestration with Step Functions (visible flow, tighter coupling). Use choreography for simple flows, orchestration for complex multi-step workflows.
- **Trade-off**: event sourcing (full audit trail, replay capability) vs state-based (simpler, faster queries). In order processing, event sourcing is strongly recommended for compliance and debugging.
- **Exactly-once illusion**: achieve it via at-least-once delivery + idempotent handlers. This is the practical approach.
- **Timeout handling**: if no event received within expected time (e.g., payment response within 5 minutes), a watchdog process publishes a timeout event to trigger compensation.
