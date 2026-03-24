# Task Queue / Job Scheduler

## Problem 7: Task Queue / Job Scheduler **[SR]**

### Problem Statement
Design a distributed task queue and job scheduler that supports delayed execution, priorities, retries, and dead-letter handling. This maps directly to your SQS/Lambda architecture.

### Step 1: Requirements

**Functional Requirements**
- Submit tasks for immediate or delayed execution
- Priority-based processing (urgent tasks first)
- Automatic retries with exponential backoff
- Dead-letter queue for permanently failed tasks
- Task deduplication (idempotency)
- Scheduled/recurring tasks (cron-like)

**Non-Functional Requirements**
- At-least-once execution guarantee
- Horizontal scalability (add workers to increase throughput)
- Reliable (no task loss even during worker failures)
- Support 100K+ tasks/day

### Step 2: Back-of-Envelope Estimation

```
100K tasks/day = ~1.2 tasks/sec average
Peak: 10x = 12 tasks/sec
Average task duration: 5 seconds
Workers needed at peak: 12 * 5 = 60 concurrent workers
With buffer: 100 workers (Lambda handles this trivially with concurrency)

Task metadata: ~1KB per task
Storage: 100K * 1KB = 100MB/day
Retention (30 days): 3GB
```

### Step 3: High-Level Architecture

```
  Producers (any service)
       |
       v
  +------------------+
  | Task API         |
  | (enqueue tasks)  |
  +------------------+
       |
       v
  +------------------+       +------------------+
  | Priority Queues  |       | Scheduler        |
  | (SQS FIFO or    |       | (for delayed/    |
  |  Redis sorted    |       |  recurring tasks)|
  |  sets)           |       +------------------+
  +------------------+              |
       |                            v
       +----------------------------+
       |
       v
  +------------------+
  | Worker Pool      |
  | (Lambda or ECS)  |
  +------------------+
       |
       +--- success --> mark complete
       |
       +--- failure --> retry (exponential backoff)
       |
       +--- max retries exceeded --> Dead Letter Queue
                                         |
                                    +---------+
                                    | DLQ     |
                                    | Monitor |
                                    +---------+
```

### Step 4: Database Design

```
PostgreSQL - Task metadata and history:
  Table: tasks
    id                UUID PRIMARY KEY
    idempotency_key   VARCHAR UNIQUE  -- for dedup
    type              VARCHAR         -- "send_email", "process_order"
    payload           JSONB
    priority          INT             -- 1=highest
    status            VARCHAR         -- "pending","processing","completed","failed","dlq"
    scheduled_at      TIMESTAMP       -- for delayed tasks
    started_at        TIMESTAMP
    completed_at      TIMESTAMP
    retry_count       INT DEFAULT 0
    max_retries       INT DEFAULT 3
    last_error        TEXT
    created_at        TIMESTAMP

  Table: recurring_tasks
    id                UUID
    cron_expression   VARCHAR       -- "0 9 * * MON" (every Monday 9am)
    task_type         VARCHAR
    payload           JSONB
    enabled           BOOLEAN
    last_run_at       TIMESTAMP
    next_run_at       TIMESTAMP     -- indexed for scheduler queries

SQS Queues:
  - task-queue-high-priority (FIFO)
  - task-queue-normal (Standard)
  - task-queue-low (Standard)
  - task-dlq (Standard, for failed tasks)
```

### Step 5: API Design

```
POST /api/v1/tasks
  Body: {
    "type": "send_email",
    "payload": { "to": "user@example.com", "template": "welcome" },
    "priority": "high",
    "delay_seconds": 300,
    "idempotency_key": "email-welcome-user123"
  }
  Response: { "task_id": "uuid", "status": "pending", "scheduled_at": "..." }
  Status: 202 Accepted

GET /api/v1/tasks/:id
  Response: { "id": "...", "status": "completed", "result": {...}, "attempts": 2 }

DELETE /api/v1/tasks/:id  (cancel pending task)

POST /api/v1/tasks/recurring
  Body: {
    "type": "generate_report",
    "cron": "0 9 * * MON",
    "payload": { "report_type": "weekly_sales" }
  }

GET /api/v1/tasks/dlq?limit=20
POST /api/v1/tasks/dlq/:id/retry  (manually retry a DLQ task)
```

### Step 6: Deep Dive

**1. Retry with Exponential Backoff**

```
Retry delay = base_delay * 2^(attempt - 1) + random_jitter

Attempt 1: 1s + jitter
Attempt 2: 2s + jitter
Attempt 3: 4s + jitter
...max 3 retries, then DLQ

Jitter prevents thundering herd when many tasks fail simultaneously.
```

In SQS: configure visibility timeout to increase with each retry. Or use delay queues.

**2. Idempotency**

Problem: at-least-once delivery means a task might execute twice.

Solution:
- Each task has an idempotency_key
- Before processing, check if key has been seen (Redis SET NX or DB unique constraint)
- If already processed, skip
- Your DynamoDB conditional writes experience applies here: `attribute_not_exists(idempotency_key)`

**3. Dead Letter Queue Management**

```
Task fails -> retry 1 -> retry 2 -> retry 3 -> move to DLQ

DLQ monitoring:
- CloudWatch alarm on DLQ message count > 0
- Dashboard showing DLQ depth over time
- Manual retry: move message back to main queue after fixing the issue
- Auto-retry: scheduled job attempts DLQ tasks once per hour with longer backoff
```

This is your daily workflow with SQS DLQs in your Lambda architecture.

### Step 7: Scaling and Trade-offs

- **Worker scaling**: Lambda auto-scales based on queue depth. ECS can use SQS queue depth as auto-scaling metric.
- **Priority handling**: separate queues per priority level, workers poll high-priority first
- **Trade-off**: at-least-once (with idempotency) vs exactly-once. At-least-once + idempotent handlers is simpler and more reliable.
- **Trade-off**: visibility timeout. Too short = duplicate processing. Too long = slow retry on worker failure. Set to 6x expected task duration.
- **Poison messages**: tasks that always fail. DLQ catches these, preventing infinite retry loops.
