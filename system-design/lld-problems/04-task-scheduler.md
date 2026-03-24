# Task Scheduler

## Problem 4: Task Scheduler **[SR]**

### Requirements
- Schedule tasks for immediate or delayed execution
- Priority-based processing (higher priority runs first)
- Retry failed tasks with configurable backoff
- Register task handlers for different task types
- Cancel pending tasks

### Key Design Patterns
- **Observer Pattern**: notify listeners on task state changes
- **Strategy Pattern**: different retry strategies
- **Priority Queue**: for task ordering

### Class Diagram

```
+-------------------+       +-------------------+
| TaskScheduler     |       |<<interface>>      |
|-------------------|       | ITaskHandler      |
| - queue: PriorityQ|       |-------------------|
| - handlers: Map   |       | + handle(task)    |
| - listeners: []   |       +-------------------+
|-------------------|              ^
| + schedule(task)  |              |
| + cancel(taskId)  |         Concrete handlers
| + registerHandler()|         (EmailHandler,
| + start()         |          ReportHandler,
| + stop()          |          etc.)
+-------------------+
         |
         | manages
         v
+-------------------+       +-------------------+
| Task              |       |<<interface>>      |
|-------------------|       | IRetryStrategy    |
| - id              |       |-------------------|
| - type            |       | + getDelay(attempt)|
| - payload         |       | + shouldRetry()   |
| - priority        |       +-------------------+
| - status          |              ^
| - scheduledAt     |         +---------+----------+
| - retryCount      |         |         |          |
+-------------------+    Exponential  Fixed    NoRetry
                         Backoff      Delay
```

### Code Implementation

```typescript
// ============================================================
// Types and Enums
// ============================================================

enum TaskStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  DEAD_LETTER = "DEAD_LETTER",
}

enum TaskPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

interface TaskDefinition {
  type: string;
  payload: Record<string, unknown>;
  priority?: TaskPriority;
  delayMs?: number;
  maxRetries?: number;
}

// ============================================================
// Task
// ============================================================

class Task {
  public readonly id: string;
  public readonly type: string;
  public readonly payload: Record<string, unknown>;
  public readonly priority: TaskPriority;
  public readonly createdAt: Date;
  public readonly scheduledAt: Date;
  public readonly maxRetries: number;

  public status: TaskStatus = TaskStatus.PENDING;
  public retryCount: number = 0;
  public lastError: string | null = null;
  public startedAt: Date | null = null;
  public completedAt: Date | null = null;

  constructor(definition: TaskDefinition) {
    this.id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.type = definition.type;
    this.payload = definition.payload;
    this.priority = definition.priority ?? TaskPriority.NORMAL;
    this.createdAt = new Date();
    this.scheduledAt = new Date(Date.now() + (definition.delayMs ?? 0));
    this.maxRetries = definition.maxRetries ?? 3;
  }

  get isReady(): boolean {
    return (
      this.status === TaskStatus.PENDING &&
      new Date() >= this.scheduledAt
    );
  }
}

// ============================================================
// Priority Queue (Min-Heap by priority then scheduledAt)
// ============================================================

class TaskPriorityQueue {
  private heap: Task[] = [];

  enqueue(task: Task): void {
    this.heap.push(task);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): Task | null {
    if (this.heap.length === 0) return null;

    const top = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  peek(): Task | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  remove(taskId: string): boolean {
    const index = this.heap.findIndex((t) => t.id === taskId);
    if (index === -1) return false;

    const last = this.heap.pop()!;
    if (index < this.heap.length) {
      this.heap[index] = last;
      this.bubbleUp(index);
      this.bubbleDown(index);
    }
    return true;
  }

  get size(): number {
    return this.heap.length;
  }

  private compare(a: Task, b: Task): number {
    // Lower priority number = higher priority
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Earlier scheduled time wins
    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
      [this.heap[index], this.heap[parentIndex]] = [
        this.heap[parentIndex],
        this.heap[index],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

// ============================================================
// Retry Strategy (Strategy Pattern)
// ============================================================

interface IRetryStrategy {
  shouldRetry(task: Task): boolean;
  getDelayMs(attempt: number): number;
}

class ExponentialBackoffRetry implements IRetryStrategy {
  constructor(
    private baseDelayMs: number = 1000,
    private maxDelayMs: number = 30000
  ) {}

  shouldRetry(task: Task): boolean {
    return task.retryCount < task.maxRetries;
  }

  getDelayMs(attempt: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(delay + jitter, this.maxDelayMs);
  }
}

class FixedDelayRetry implements IRetryStrategy {
  constructor(private delayMs: number = 5000) {}

  shouldRetry(task: Task): boolean {
    return task.retryCount < task.maxRetries;
  }

  getDelayMs(_attempt: number): number {
    return this.delayMs;
  }
}

class NoRetry implements IRetryStrategy {
  shouldRetry(_task: Task): boolean {
    return false;
  }

  getDelayMs(_attempt: number): number {
    return 0;
  }
}

// ============================================================
// Task Handler Interface
// ============================================================

interface ITaskHandler {
  handle(task: Task): Promise<void>;
}

// ============================================================
// Task Event Listener (Observer Pattern)
// ============================================================

type TaskEvent = "scheduled" | "started" | "completed" | "failed" | "cancelled" | "dead_letter";

interface ITaskEventListener {
  onTaskEvent(event: TaskEvent, task: Task): void;
}

// ============================================================
// Task Scheduler
// ============================================================

class TaskScheduler {
  private queue: TaskPriorityQueue = new TaskPriorityQueue();
  private handlers: Map<string, ITaskHandler> = new Map();
  private retryStrategy: IRetryStrategy;
  private listeners: ITaskEventListener[] = [];
  private taskMap: Map<string, Task> = new Map();
  private running: boolean = false;
  private pollIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    retryStrategy: IRetryStrategy = new ExponentialBackoffRetry(),
    pollIntervalMs: number = 100
  ) {
    this.retryStrategy = retryStrategy;
    this.pollIntervalMs = pollIntervalMs;
  }

  registerHandler(taskType: string, handler: ITaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  addListener(listener: ITaskEventListener): void {
    this.listeners.push(listener);
  }

  schedule(definition: TaskDefinition): Task {
    const task = new Task(definition);
    task.status = TaskStatus.SCHEDULED;
    this.taskMap.set(task.id, task);
    this.queue.enqueue(task);
    this.emit("scheduled", task);
    return task;
  }

  cancel(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task || task.status === TaskStatus.RUNNING) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    this.queue.remove(taskId);
    this.emit("cancelled", task);
    return true;
  }

  getTask(taskId: string): Task | undefined {
    return this.taskMap.get(taskId);
  }

  start(): void {
    this.running = true;
    this.timer = setInterval(() => this.processNext(), this.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processNext(): Promise<void> {
    const task = this.queue.peek();
    if (!task || !task.isReady) return;

    this.queue.dequeue();

    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = TaskStatus.FAILED;
      task.lastError = `No handler registered for task type: ${task.type}`;
      this.emit("failed", task);
      return;
    }

    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this.emit("started", task);

    try {
      await handler.handle(task);
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      this.emit("completed", task);
    } catch (error) {
      task.lastError = error instanceof Error ? error.message : String(error);
      task.retryCount += 1;

      if (this.retryStrategy.shouldRetry(task)) {
        // Re-schedule with delay
        const delayMs = this.retryStrategy.getDelayMs(task.retryCount);
        task.status = TaskStatus.PENDING;
        (task as { scheduledAt: Date }).scheduledAt = new Date(Date.now() + delayMs);
        this.queue.enqueue(task);
        this.emit("failed", task);
      } else {
        // Move to dead letter
        task.status = TaskStatus.DEAD_LETTER;
        this.emit("dead_letter", task);
      }
    }
  }

  private emit(event: TaskEvent, task: Task): void {
    for (const listener of this.listeners) {
      listener.onTaskEvent(event, task);
    }
  }
}

// ============================================================
// Example: Concrete Handler and Listener
// ============================================================

class EmailTaskHandler implements ITaskHandler {
  async handle(task: Task): Promise<void> {
    const { to, subject, body } = task.payload as {
      to: string;
      subject: string;
      body: string;
    };

    // Simulate sending email (could fail)
    if (Math.random() < 0.3) {
      throw new Error("SMTP connection timeout");
    }

    console.log(`Email sent to ${to}: "${subject}"`);
  }
}

class LoggingListener implements ITaskEventListener {
  onTaskEvent(event: TaskEvent, task: Task): void {
    const retryInfo =
      task.retryCount > 0 ? ` (retry ${task.retryCount}/${task.maxRetries})` : "";
    console.log(
      `[${event.toUpperCase()}] Task ${task.id} (${task.type})${retryInfo}` +
      (task.lastError ? ` -- error: ${task.lastError}` : "")
    );
  }
}

// ============================================================
// Example Usage
// ============================================================

const scheduler = new TaskScheduler(new ExponentialBackoffRetry(500, 10000));

scheduler.registerHandler("send_email", new EmailTaskHandler());
scheduler.addListener(new LoggingListener());

// Schedule immediate task
scheduler.schedule({
  type: "send_email",
  payload: { to: "user@example.com", subject: "Welcome", body: "Hi there" },
  priority: TaskPriority.HIGH,
});

// Schedule delayed task
scheduler.schedule({
  type: "send_email",
  payload: { to: "admin@example.com", subject: "Report", body: "Daily report" },
  priority: TaskPriority.LOW,
  delayMs: 5000,
});

// Start processing
scheduler.start();

// Stop after 15 seconds
setTimeout(() => {
  scheduler.stop();
  console.log("Scheduler stopped");
}, 15000);
```

### SOLID Principles Applied
- **S**: Task is a data object, TaskScheduler manages scheduling, handlers contain business logic, the queue handles ordering.
- **O**: New task types are supported by registering new ITaskHandler implementations. New retry strategies by implementing IRetryStrategy.
- **L**: Any IRetryStrategy (ExponentialBackoff, Fixed, NoRetry) works interchangeably.
- **I**: ITaskHandler has one method (handle). ITaskEventListener has one method (onTaskEvent). Minimal interfaces.
- **D**: TaskScheduler depends on ITaskHandler and IRetryStrategy abstractions.

### Extension Points
- **Persistent queue**: replace in-memory TaskPriorityQueue with Redis sorted set or SQS for durability
- **Recurring tasks**: add a CronScheduler that periodically enqueues tasks based on cron expressions
- **Concurrency control**: add a worker pool with configurable concurrency (process N tasks simultaneously)
- **Rate limiting per task type**: integrate with the Rate Limiter (Problem 3) to limit how many tasks of a type run per second
- **Dead letter dashboard**: expose API to query dead-letter tasks, manually retry or acknowledge them
