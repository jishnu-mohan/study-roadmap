# Pub-Sub System

## Problem 5: Pub-Sub System **[SR]**

### Requirements
- Create topics that publishers can send messages to
- Subscribers subscribe to topics and receive messages
- Support multiple subscribers per topic (fan-out)
- Message filtering (subscribers can specify filter criteria)
- Delivery guarantees (at-least-once)
- Message acknowledgment

### Key Design Patterns
- **Observer Pattern**: core of pub/sub (publishers notify subscribers via topic)
- **Iterator Pattern**: for message consumption (pull-based)

### Class Diagram

```
+-------------------+       +-------------------+
| PubSubBroker      |       |   Topic           |
|-------------------|       |-------------------|
| - topics: Map     |1---*->| - name            |
|-------------------|       | - subscriptions[] |
| + createTopic()   |       | - messageQueue[]  |
| + deleteTopic()   |       |-------------------|
| + publish()       |       | + addSubscription()|
| + subscribe()     |       | + publish()       |
| + unsubscribe()   |       +-------------------+
+-------------------+              |
                                   | 1
                                   |
                                   | *
                            +-------------------+
                            | Subscription      |
                            |-------------------|
                            | - id              |
                            | - handler         |
                            | - filter?         |
                            | - pendingMessages |
                            | - ackdMessages    |
                            |-------------------|
                            | + deliver()       |
                            | + ack()           |
                            +-------------------+

+-------------------+
| Message           |
|-------------------|
| - id              |
| - topic           |
| - body            |
| - attributes      |
| - timestamp       |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Message
// ============================================================

interface MessageAttributes {
  [key: string]: string | number | boolean;
}

class Message {
  public readonly id: string;
  public readonly timestamp: Date;

  constructor(
    public readonly topic: string,
    public readonly body: unknown,
    public readonly attributes: MessageAttributes = {}
  ) {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.timestamp = new Date();
  }
}

// ============================================================
// Message Filter
// ============================================================

interface IMessageFilter {
  matches(message: Message): boolean;
}

class AttributeFilter implements IMessageFilter {
  constructor(
    private criteria: Partial<MessageAttributes>
  ) {}

  matches(message: Message): boolean {
    for (const [key, value] of Object.entries(this.criteria)) {
      if (message.attributes[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

class NoFilter implements IMessageFilter {
  matches(_message: Message): boolean {
    return true;
  }
}

// ============================================================
// Subscription
// ============================================================

type MessageHandler = (message: Message) => Promise<void> | void;

interface PendingMessage {
  message: Message;
  deliveredAt: Date;
  deliveryCount: number;
}

class Subscription {
  public readonly id: string;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private acknowledgedIds: Set<string> = new Set();
  private handler: MessageHandler | null = null;
  private filter: IMessageFilter;

  constructor(
    public readonly topicName: string,
    filter?: IMessageFilter
  ) {
    this.id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.filter = filter ?? new NoFilter();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async deliver(message: Message): Promise<void> {
    // Check filter
    if (!this.filter.matches(message)) {
      return; // Message does not match filter, skip
    }

    // Check if already acknowledged (idempotency)
    if (this.acknowledgedIds.has(message.id)) {
      return;
    }

    // Track as pending
    const existing = this.pendingMessages.get(message.id);
    this.pendingMessages.set(message.id, {
      message,
      deliveredAt: new Date(),
      deliveryCount: existing ? existing.deliveryCount + 1 : 1,
    });

    // Invoke handler if registered (push-based)
    if (this.handler) {
      try {
        await this.handler(message);
        this.ack(message.id); // Auto-ack on success
      } catch {
        // Handler failed, message stays in pending for redelivery
      }
    }
  }

  ack(messageId: string): boolean {
    if (!this.pendingMessages.has(messageId)) {
      return false;
    }
    this.pendingMessages.delete(messageId);
    this.acknowledgedIds.add(messageId);
    return true;
  }

  // Pull-based consumption: get pending messages
  pullMessages(limit: number = 10): Message[] {
    const messages: Message[] = [];
    for (const [, pending] of this.pendingMessages) {
      if (messages.length >= limit) break;
      messages.push(pending.message);
    }
    return messages;
  }

  get pendingCount(): number {
    return this.pendingMessages.size;
  }
}

// ============================================================
// Topic
// ============================================================

class Topic {
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize: number;

  constructor(
    public readonly name: string,
    maxHistorySize: number = 1000
  ) {
    this.maxHistorySize = maxHistorySize;
  }

  addSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  removeSubscription(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  async publish(message: Message): Promise<{ delivered: number; failed: number }> {
    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Fan out to all subscriptions
    let delivered = 0;
    let failed = 0;

    const deliveryPromises = Array.from(this.subscriptions.values()).map(
      async (sub) => {
        try {
          await sub.deliver(message);
          delivered++;
        } catch {
          failed++;
        }
      }
    );

    await Promise.all(deliveryPromises);
    return { delivered, failed };
  }

  get subscriberCount(): number {
    return this.subscriptions.size;
  }

  getRecentMessages(limit: number = 10): Message[] {
    return this.messageHistory.slice(-limit);
  }
}

// ============================================================
// Pub/Sub Broker (Facade)
// ============================================================

class PubSubBroker {
  private topics: Map<string, Topic> = new Map();
  private subscriptionToTopic: Map<string, string> = new Map();

  createTopic(name: string): Topic {
    if (this.topics.has(name)) {
      throw new Error(`Topic "${name}" already exists`);
    }
    const topic = new Topic(name);
    this.topics.set(name, topic);
    return topic;
  }

  deleteTopic(name: string): boolean {
    return this.topics.delete(name);
  }

  getTopic(name: string): Topic | undefined {
    return this.topics.get(name);
  }

  async publish(
    topicName: string,
    body: unknown,
    attributes: MessageAttributes = {}
  ): Promise<Message> {
    const topic = this.topics.get(topicName);
    if (!topic) {
      throw new Error(`Topic "${topicName}" does not exist`);
    }

    const message = new Message(topicName, body, attributes);
    await topic.publish(message);
    return message;
  }

  subscribe(
    topicName: string,
    handler?: MessageHandler,
    filter?: IMessageFilter
  ): Subscription {
    const topic = this.topics.get(topicName);
    if (!topic) {
      throw new Error(`Topic "${topicName}" does not exist`);
    }

    const subscription = new Subscription(topicName, filter);
    if (handler) {
      subscription.onMessage(handler);
    }
    topic.addSubscription(subscription);
    this.subscriptionToTopic.set(subscription.id, topicName);
    return subscription;
  }

  unsubscribe(subscriptionId: string): boolean {
    const topicName = this.subscriptionToTopic.get(subscriptionId);
    if (!topicName) return false;

    const topic = this.topics.get(topicName);
    if (!topic) return false;

    this.subscriptionToTopic.delete(subscriptionId);
    return topic.removeSubscription(subscriptionId);
  }

  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }
}

// ============================================================
// Example Usage
// ============================================================

async function main() {
  const broker = new PubSubBroker();

  // Create topics
  broker.createTopic("order-events");
  broker.createTopic("user-events");

  // Subscribe to all order events
  const orderSub = broker.subscribe(
    "order-events",
    (msg) => {
      console.log(`[Order Handler] Received: ${JSON.stringify(msg.body)}`);
    }
  );

  // Subscribe only to high-value order events (with filter)
  const highValueSub = broker.subscribe(
    "order-events",
    (msg) => {
      console.log(`[High Value Alert] Order: ${JSON.stringify(msg.body)}`);
    },
    new AttributeFilter({ priority: "high" })
  );

  // Subscribe to user events
  const userSub = broker.subscribe(
    "user-events",
    (msg) => {
      console.log(`[User Handler] Received: ${JSON.stringify(msg.body)}`);
    }
  );

  // Publish messages
  await broker.publish(
    "order-events",
    { orderId: "123", amount: 5000 },
    { priority: "high" }
  );
  // Both orderSub and highValueSub receive this

  await broker.publish(
    "order-events",
    { orderId: "456", amount: 25 },
    { priority: "low" }
  );
  // Only orderSub receives this (highValueSub filter rejects it)

  await broker.publish(
    "user-events",
    { userId: "789", action: "login" }
  );
  // Only userSub receives this

  // Check stats
  console.log(`Order topic subscribers: ${broker.getTopic("order-events")?.subscriberCount}`);
  console.log(`Topics: ${broker.listTopics().join(", ")}`);
}

main();
```

### SOLID Principles Applied
- **S**: Message is a data object, Subscription handles delivery to one subscriber, Topic manages fan-out, Broker is the facade.
- **O**: New filter types (regex filter, range filter) implement IMessageFilter without changing existing code.
- **L**: Any IMessageFilter works wherever a filter is expected (NoFilter, AttributeFilter, custom filters).
- **I**: IMessageFilter has a single method (matches). MessageHandler is a single-function type.
- **D**: Subscription depends on IMessageFilter abstraction, not concrete filter types.

### Extension Points
- **Dead letter topic**: route undeliverable messages (handler keeps failing) to a DLT
- **Message ordering**: add sequence numbers and enforce ordering within a partition key
- **Persistence**: swap in-memory storage for a durable store (Kafka-style log, Redis streams)
- **Consumer groups**: multiple subscribers share the load (each message goes to only one member of the group)
- **Message schemas**: add schema validation (e.g., JSON Schema) before publishing
