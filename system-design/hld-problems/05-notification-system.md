# Notification System

## Problem 5: Notification System **[SR]**

### Problem Statement
Design a notification system that can deliver notifications across multiple channels (push, email, SMS, in-app) with priority handling, templates, and throttling.

### Step 1: Requirements

**Functional Requirements**
- Send notifications via push, email, SMS, and in-app channels
- Support notification templates with variable substitution
- Priority levels (critical, high, normal, low)
- User notification preferences (opt-in/opt-out per channel)
- Notification history and read/unread status

**Non-Functional Requirements**
- High throughput (millions of notifications per day)
- Reliable delivery (at-least-once, with retry)
- Low latency for critical notifications (< 5 seconds)
- Rate limiting / throttling to prevent notification fatigue

### Step 2: Back-of-Envelope Estimation

```
10M notifications/day across all channels
Peak: 5x average = ~580 notifications/sec

Breakdown by channel: push 60%, email 25%, SMS 10%, in-app 100% (always)
Push: 350/sec, Email: 145/sec, SMS: 58/sec

Storage: 10M * 500B (notification record) = 5GB/day
Retention: 90 days = 450GB
```

### Step 3: High-Level Architecture

```
  Trigger Events                   +------------------+
  (order confirmed,   -----------> | Notification     |
   payment failed,                 | Service          |
   etc.)                           +------------------+
                                         |
                                   +------------------+
                                   | Priority Queue   |
                                   | (SQS/Kafka)      |
                                   +------------------+
                                    /    |    |     \
                              +------+ +-----+ +----+ +-------+
                              | Push | |Email| |SMS | |In-App |
                              |Worker| |Worker| |Wkr| |Worker |
                              +------+ +-----+ +----+ +-------+
                                |        |       |        |
                              FCM/APNs  SES   Twilio   WebSocket
                                                         /DB

  Supporting Services:
  +----------+  +----------+  +----------+
  |Template  |  |User Pref |  |Throttle  |
  |Service   |  |Service   |  |Service   |
  +----------+  +----------+  +----------+
```

### Step 4: Database Design

```
PostgreSQL:
  Table: notifications
    id              UUID
    user_id         BIGINT
    type            VARCHAR  -- "order_confirmed", "payment_failed"
    channel         VARCHAR  -- "push", "email", "sms", "in_app"
    priority        INT      -- 1=critical, 2=high, 3=normal, 4=low
    template_id     VARCHAR
    template_data   JSONB    -- { "order_id": "123", "amount": "$50" }
    status          VARCHAR  -- "pending", "sent", "delivered", "failed"
    sent_at         TIMESTAMP
    read_at         TIMESTAMP (nullable)
    created_at      TIMESTAMP

  Table: notification_templates
    id              VARCHAR  -- "order_confirmed_email"
    channel         VARCHAR
    subject         TEXT     -- for email
    body            TEXT     -- with {{variable}} placeholders
    version         INT

  Table: user_notification_preferences
    user_id         BIGINT
    channel         VARCHAR
    notification_type VARCHAR
    enabled         BOOLEAN
    quiet_hours_start TIME (nullable)
    quiet_hours_end   TIME (nullable)

DynamoDB (alternative for high-throughput in-app notifications):
  PK: user_id, SK: created_at
  -- Fast retrieval of recent notifications per user
```

### Step 5: API Design

```
-- Internal API (called by other services):
POST /api/v1/notifications/send
  Body: {
    "user_id": "123",
    "type": "order_confirmed",
    "channels": ["push", "email", "in_app"],
    "priority": "high",
    "template_data": { "order_id": "456", "amount": "$50.00" }
  }

-- User-facing API:
GET /api/v1/notifications?unread=true&limit=20&cursor=...
  Response: { "notifications": [...], "unread_count": 5, "next_cursor": "..." }

PUT /api/v1/notifications/:id/read
PUT /api/v1/notifications/read-all

GET /api/v1/notifications/preferences
PUT /api/v1/notifications/preferences
  Body: { "email": { "marketing": false, "transactional": true }, "push": { ... } }
```

### Step 6: Deep Dive

**1. Priority Queue Processing**

Use separate SQS queues per priority level:
- Critical: processed immediately, dedicated workers
- High: slight delay acceptable
- Normal/Low: batch-friendly, can be delayed

Or use a single Kafka topic with partitioning and consumer priorities.

**2. Throttling**

Prevent notification fatigue:
- Per-user rate limit: max 10 notifications/hour (configurable per type)
- Quiet hours: respect user timezone, no notifications between 10pm-8am
- Deduplication: same notification type for same entity within N minutes gets merged
- Implementation: Redis counter per user with TTL

**3. Template Engine**

Templates with variables: "Hi {{user_name}}, your order #{{order_id}} has shipped!"
- Store templates versioned in DB
- Render at send time (not at queue time -- allows template fixes for queued messages)
- Support per-channel templates (email has HTML, push has short text)

### Step 7: Scaling and Trade-offs

- **Fan-out**: a single event (e.g., "flash sale") might trigger millions of notifications. Use a fan-out service that generates individual notification tasks.
- **Third-party rate limits**: email providers (SES), SMS (Twilio) have rate limits. Workers must respect them with backoff.
- **Trade-off**: real-time delivery vs batching. Critical notifications go immediately, low-priority can be batched for efficiency.
- **Trade-off**: push reliability. APNs/FCM are best-effort. Track delivery via callbacks and retry intelligently.
- **DLQ**: failed notifications go to a dead-letter queue for inspection and retry.
