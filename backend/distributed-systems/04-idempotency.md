# Idempotency

### Why It Matters

In distributed systems, messages can be delivered more than once. Networks are unreliable: a request might succeed on the server but the response might be lost, causing the client to retry. SQS provides at-least-once delivery, not exactly-once. EventBridge can trigger the same Lambda multiple times.

Without idempotency:
- A payment gets charged twice.
- A record gets created twice.
- An inventory count gets decremented twice.

The goal: processing the same message N times produces the same result as processing it once.

### Implementation Strategies

**1. Idempotency Keys**

The client generates a unique key (UUID) for each logical operation and sends it with the request. The server stores (key -> result) in a database with a TTL.

```typescript
async function processPayment(idempotencyKey: string, payload: PaymentRequest): Promise<PaymentResult> {
  // Check if we already processed this request
  const existing = await redis.get(`idempotency:${idempotencyKey}`);
  if (existing) {
    return JSON.parse(existing) as PaymentResult;
  }

  // Process the payment
  const result = await chargeCard(payload);

  // Store the result with TTL (e.g., 24 hours)
  await redis.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(result),
    'EX',
    86400
  );

  return result;
}
```

Considerations:
- Use Redis for low-latency lookups, or DynamoDB for durability.
- TTL should be long enough to cover all retry windows but not so long that storage grows unbounded.
- Race condition: two concurrent requests with the same key. Use a distributed lock or database conditional write to prevent both from executing.

**2. Database Unique Constraints**

```sql
INSERT INTO processed_events (event_id, result, created_at)
VALUES ($1, $2, NOW())
ON CONFLICT (event_id) DO NOTHING;
```

If the event was already processed, the insert is silently ignored. Natural deduplication without a separate cache layer.

**3. Conditional Writes (DynamoDB)**

```typescript
await dynamodb.put({
  TableName: 'Orders',
  Item: { orderId, status: 'CONFIRMED', version: newVersion },
  ConditionExpression: 'attribute_not_exists(orderId) OR version = :expectedVersion',
  ExpressionAttributeValues: { ':expectedVersion': currentVersion }
}).promise();
```

The write only succeeds if the condition is met. Duplicate writes fail with a ConditionalCheckFailedException, which you catch and treat as a successful no-op.

**4. Message Deduplication**

- **SQS FIFO queues:** Provide a `MessageDeduplicationId`. SQS deduplicates messages with the same ID within a 5-minute window.
- **EventBridge:** Use idempotent rule targets. If the target is a Lambda, ensure the Lambda handler is idempotent.

### Connecting to Jishnu's Experience

At Treez, the Product Collection Service uses EventBridge + SQS with at-least-once delivery. Each Lambda consumer is an idempotent consumer:
- Messages carry a unique event ID.
- Before processing, the Lambda checks a DynamoDB table for the event ID.
- If found, skip processing (return success to SQS so the message is deleted).
- If not found, process the event, then write the event ID to DynamoDB.
- DLQ catches messages that fail repeatedly (e.g., due to transient errors or bugs), enabling manual review and replay.

---
