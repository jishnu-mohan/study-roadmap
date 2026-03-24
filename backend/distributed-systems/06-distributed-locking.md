# Distributed Locking

### Why Needed

Prevent concurrent modifications to shared resources when multiple service instances are running. Examples:
- Two instances of a cron job processing the same batch.
- Two concurrent requests trying to update the same inventory item.
- Preventing duplicate execution of a scheduled task.

### Redis-Based Locks

**Basic pattern:**

```typescript
// Acquire lock
const lockValue = crypto.randomUUID(); // unique to this holder
const acquired = await redis.set(
  `lock:${resourceId}`,
  lockValue,
  'NX',  // only set if not exists
  'EX',  // set expiry
  30     // 30 second TTL
);

if (!acquired) {
  throw new Error('Could not acquire lock');
}

try {
  // Do the protected work
  await doWork();
} finally {
  // Release lock -- MUST check that we still own it
  // Use Lua script for atomicity
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, `lock:${resourceId}`, lockValue);
}
```

**Why the Lua script matters:** Between checking the lock value and deleting it, another process could have acquired the lock (if ours expired). Without the atomic check-and-delete, we would delete someone else's lock.

**Redlock Algorithm (for multi-node Redis):**
1. Get current time.
2. Try to acquire the lock on N independent Redis nodes (e.g., 5) with the same key and value.
3. The lock is considered acquired if it was set on a majority of nodes (N/2 + 1) and the total time spent acquiring is less than the lock TTL.
4. If the lock is acquired, the effective TTL is the original TTL minus the time spent acquiring.
5. If the lock is not acquired (failed on majority or took too long), release it on all nodes.

### DynamoDB Conditional Writes

```typescript
// Acquire lock
await dynamodb.put({
  TableName: 'Locks',
  Item: {
    lockKey: resourceId,
    holder: instanceId,
    expiresAt: Math.floor(Date.now() / 1000) + 30, // TTL
  },
  ConditionExpression: 'attribute_not_exists(lockKey) OR expiresAt < :now',
  ExpressionAttributeValues: {
    ':now': Math.floor(Date.now() / 1000),
  },
}).promise();
```

DynamoDB TTL will automatically clean up expired locks (though TTL deletion is not instantaneous -- it can take up to 48 hours). The `ConditionExpression` handles the common case of checking for expired locks.

### Lease-Based Locking

Instead of holding a lock indefinitely, the holder is granted a **lease** -- a lock with a time limit. The holder must periodically renew the lease. If the holder crashes, the lease expires and another process can acquire it.

```
Holder A acquires lease (TTL = 30s)
  -> Holder A renews lease every 10s (well before expiry)
  -> Holder A crashes at t=15s
  -> Lease expires at t=30s
  -> Holder B acquires lease at t=31s
```

### Why Distributed Locks Are Tricky

**Clock skew:** If node A's clock is ahead of node B's clock, A might think a lock has expired when B thinks it is still valid. Redis Redlock assumes clocks are roughly synchronized, which is not always true.

**GC pauses:** A Java/Node.js process acquires a lock, then a garbage collection pause (or event loop blocking in Node.js) causes it to freeze for longer than the lock TTL. The lock expires, another process acquires it and starts working. The first process resumes, not knowing it lost the lock, and both processes modify the shared resource.

**Network delays:** Similar to GC pauses -- a long network delay between acquiring the lock and using it can cause the lock to expire.

**Fencing tokens -- the solution:**

A fencing token is a monotonically increasing number assigned when a lock is acquired. The protected resource checks the token and rejects requests with stale (lower) tokens.

```
Process A acquires lock, gets fencing token 33
Process A sends request to storage with token 33
  (Process A pauses -- GC, network delay, etc.)
  Lock expires
Process B acquires lock, gets fencing token 34
Process B sends request to storage with token 34 -> accepted
Process A resumes, sends request with token 33 -> REJECTED (33 < 34)
```

This is the definitive solution to the distributed locking problem, as described by Martin Kleppmann. The resource must be modified to understand and enforce fencing tokens.

---
