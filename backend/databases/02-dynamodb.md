# DynamoDB Deep Dive

### Core Data Model

DynamoDB is a fully managed, serverless NoSQL database. It stores data as items (rows) in tables.

**Key concepts:**

- **Table**: A collection of items. No fixed schema beyond the key attributes.
- **Item**: A single record. Maximum size 400KB.
- **Attribute**: A name-value pair on an item. Can be scalar (string, number, binary, boolean, null) or complex (list, map, set).

**Primary key options:**
1. **Simple primary key (partition key only)**: One attribute uniquely identifies each item. Data is distributed across partitions by hashing this key.
2. **Composite primary key (partition key + sort key)**: Two attributes together uniquely identify each item. Items with the same partition key are stored together, sorted by the sort key.

**How data is distributed:**

DynamoDB hashes the partition key to determine which physical partition stores the item. Each partition:
- Holds up to 10GB of data
- Supports up to 3,000 Read Capacity Units (RCU) and 1,000 Write Capacity Units (WCU)
- Is replicated across 3 Availability Zones

When a partition fills up (by size or throughput), DynamoDB splits it automatically. You do not control this -- you control the key design.

---

### Single-Table Design

**Why**: DynamoDB does not support joins. If you need data from multiple "entities" in a single request, you either:
1. Make multiple round trips (slow, especially from Lambda)
2. Store related entities in the same table with carefully designed keys (single-table design)

**When it makes sense:**
- You have well-defined access patterns that require fetching related entities together
- Low-latency requirements where multiple round trips are unacceptable
- Serverless architectures where each round trip adds latency

**When it does NOT make sense:**
- Access patterns are not well defined or change frequently
- Data is mostly accessed by a single entity type at a time
- Team is not experienced with DynamoDB (single-table design has a steep learning curve)

**Example: Users and Orders**

```
Table: AppData

PK                  | SK                       | Attributes
--------------------|--------------------------|---------------------------
USER#u123           | PROFILE                  | name, email, created_at
USER#u123           | ORDER#2026-03-01#o456    | total, status, items
USER#u123           | ORDER#2026-03-15#o789    | total, status, items
USER#u456           | PROFILE                  | name, email, created_at
USER#u456           | ORDER#2026-02-20#o111    | total, status, items
```

Access patterns served:
- **Get user profile**: Query PK=`USER#u123`, SK=`PROFILE`
- **Get all orders for a user**: Query PK=`USER#u123`, SK begins_with `ORDER#`
- **Get user orders in a date range**: Query PK=`USER#u123`, SK between `ORDER#2026-03-01` and `ORDER#2026-03-31`

The sort key uses a date prefix so orders are automatically sorted chronologically.

---

### GSI vs LSI

#### Global Secondary Index (GSI)

- Can have any partition key and sort key (completely independent from base table)
- Eventually consistent reads only (no strongly consistent reads)
- Has its own provisioned throughput (separate from base table)
- Can be created/deleted at any time after table creation
- Items are projected (copied) from the base table; you choose which attributes to project
- Maximum 20 GSIs per table

```
-- Use case: look up orders by status across all users
GSI: StatusIndex
  Partition key: status
  Sort key: created_at

-- Query: Get all "pending" orders in the last week
Query on StatusIndex where status = "pending" AND created_at > "2026-03-17"
```

#### Local Secondary Index (LSI)

- Same partition key as the base table, but a different sort key
- Supports strongly consistent reads
- Shares throughput with the base table (no separate capacity)
- Must be created at table creation time (cannot add later)
- Maximum 5 LSIs per table
- 10GB partition limit applies to base table + all LSI data for that partition key

```
-- Base table: PK = user_id, SK = order_id
-- LSI: PK = user_id, SK = created_at

-- Query: Get user's orders sorted by date (instead of by order_id)
Query on DateIndex where user_id = "u123" (sorted by created_at)
```

**When to use which:**
- GSI: Need to query by a completely different key (e.g., look up by email when PK is user_id), or need an alternate sort across all items
- LSI: Need an alternate sort key within the same partition key, and you need strong consistency. Prefer GSI in most cases because LSIs have more restrictions.

---

### Capacity Modes

#### On-Demand

- Pay per request: $1.25 per million write request units, $0.25 per million read request units (us-east-1 pricing, approximately)
- No capacity planning needed
- Instantly scales to handle traffic spikes (up to 2x previous peak, or 40,000 RCU/WCU if the table is new)
- Best for: unpredictable traffic, new applications, serverless workloads, development environments

#### Provisioned

- You specify read and write capacity units
- Cheaper for predictable, steady workloads (roughly 5-7x cheaper than on-demand at sustained high throughput)
- Auto-scaling adjusts capacity based on actual utilization (configure target utilization, e.g., 70%)
- Best for: production workloads with predictable traffic, cost-sensitive applications
- Reserved capacity available for further savings (1-3 year commitments)

**Cost comparison example (rough, us-east-1):**

| Scenario | On-Demand Cost/Month | Provisioned Cost/Month |
|----------|---------------------|----------------------|
| 10M reads + 2M writes/day | ~$225 | ~$45 (with auto-scaling) |
| Sporadic: 0 to 50k req/sec bursts | Pay only for actual use | Must provision for peak (wasteful) |

Rule of thumb: Start with on-demand, switch to provisioned once traffic patterns are understood.

---

### Query vs Scan

#### Query

- Requires the partition key (exact match)
- Optionally uses the sort key (=, <, >, <=, >=, BETWEEN, begins_with)
- Efficient: reads only items in the specified partition
- Returns items sorted by sort key
- Supports `ScanIndexForward: false` for reverse order

```typescript
const params = {
  TableName: 'AppData',
  KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':pk': 'USER#u123',
    ':start': 'ORDER#2026-03-01',
    ':end': 'ORDER#2026-03-31',
  },
};
const result = await dynamodb.query(params).promise();
```

#### Scan

- Reads every item in the table (or index)
- Very expensive for large tables
- Consumes read capacity proportional to the total table size, not the result size
- Use only for: data exports, migrations, analytics, or very small tables

```typescript
// Use parallel scan for large exports
const params = {
  TableName: 'AppData',
  TotalSegments: 4,
  Segment: 0,  // run 4 parallel workers, each with a different segment
};
```

**Critical point about filter expressions:**

```typescript
// This STILL reads the entire partition, then filters client-side
const params = {
  TableName: 'AppData',
  KeyConditionExpression: 'PK = :pk',
  FilterExpression: 'total > :minTotal',  // applied AFTER read
  ExpressionAttributeValues: {
    ':pk': 'USER#u123',
    ':minTotal': 100,
  },
};
// If the user has 10,000 orders but only 50 are over $100,
// you still consume RCU for all 10,000 items.
// FilterExpression does NOT reduce read capacity consumed.
```

If you frequently filter by an attribute, it should be part of your key design or a GSI.

---

### DynamoDB Streams

Change data capture for DynamoDB tables. Every modification (insert, update, delete) is recorded as a stream record.

**Stream record views:**
- `KEYS_ONLY`: Only the key attributes of the modified item
- `NEW_IMAGE`: The entire item as it appears after the modification
- `OLD_IMAGE`: The entire item as it appeared before the modification
- `NEW_AND_OLD_IMAGES`: Both the old and new versions of the item

**Use cases:**

1. **Sync to Elasticsearch/OpenSearch**: Stream changes to a Lambda that indexes them in a search engine for full-text search
2. **Cross-region replication**: DynamoDB Global Tables use streams under the hood
3. **Trigger Lambda for business logic**: Send email when order status changes, update aggregate counters
4. **Event sourcing / audit log**: Write stream records to S3 or another table for complete change history
5. **Materialized views**: Maintain denormalized copies of data in different access patterns

```typescript
// Lambda triggered by DynamoDB Stream
export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY') {
      const oldImage = record.dynamodb?.OldImage;
      const newImage = record.dynamodb?.NewImage;
      // React to changes, e.g., order status changed from "pending" to "shipped"
    }
  }
};
```

Stream records are available for 24 hours. Processing is guaranteed to be in-order per partition key.

---

### Access Pattern Design

The fundamental principle of DynamoDB design: **start with your access patterns, not your entities.**

**Process:**

1. List all access patterns (queries your application needs)
2. Design the key schema to support those patterns
3. Design GSIs for patterns that the base table keys cannot serve
4. Validate that all patterns are served efficiently

**Example: E-Commerce Application**

Access patterns:
1. Get user profile by user ID
2. Get all orders for a user (sorted by date)
3. Get a specific order by order ID
4. Get orders by status (across all users) sorted by date
5. Get order items for a specific order
6. Get user by email (for login)

**Key design:**

Base table: PK, SK

```
Pattern 1 -- Get user profile:
  PK = USER#<userId>, SK = PROFILE

Pattern 2 -- Get user orders:
  PK = USER#<userId>, SK = ORDER#<date>#<orderId>
  Query with begins_with(SK, "ORDER#")

Pattern 3 -- Get order by ID:
  Need to look up by order ID without knowing user ID
  GSI1: PK = ORDER#<orderId>, SK = (empty or metadata type)

Pattern 4 -- Orders by status:
  GSI2: PK = <status>, SK = <date>

Pattern 5 -- Order items:
  PK = ORDER#<orderId>, SK = ITEM#<itemId>

Pattern 6 -- User by email:
  GSI3: PK = <email>, SK = USER
```

**Table layout:**

```
PK                | SK                       | GSI1PK         | GSI2PK    | GSI2SK     | GSI3PK
------------------|--------------------------|----------------|-----------|------------|----------------
USER#u123         | PROFILE                  |                |           |            | jishnu@test.com
USER#u123         | ORDER#2026-03-01#o456    | ORDER#o456     | pending   | 2026-03-01 |
USER#u123         | ORDER#2026-03-15#o789    | ORDER#o789     | shipped   | 2026-03-15 |
ORDER#o456        | ITEM#i001                |                |           |            |
ORDER#o456        | ITEM#i002                |                |           |            |
```

---

### Common Mistakes

#### Hot Partitions (Celebrity Problem)

If one partition key is accessed far more than others, that partition becomes a bottleneck.

```
-- Bad: Using a small set of status values as partition key
PK = "active"   -- 90% of items have this key = hot partition
PK = "inactive" -- 10%
```

Solutions:
- Add a random suffix: `PK = "active#3"` (write to N shards, scatter-gather on read)
- Use a more granular key that distributes evenly
- DynamoDB adaptive capacity helps but does not fully solve this

#### Large Items

Each item is limited to 400KB. If you store large blobs or deeply nested JSON:
- Store large data in S3 and keep a reference in DynamoDB
- Compress data before storing
- Split large items across multiple items (but adds complexity)

#### Too Many GSIs

Each GSI:
- Duplicates data (costs storage)
- Consumes additional write capacity (every base table write is replicated to every GSI)
- Maximum 20 per table

Design with the minimum number of GSIs. Use overloaded keys (generic GSI1PK, GSI1SK attributes used differently per entity type) to serve multiple access patterns from one GSI.

#### Not Using Batch Operations

```typescript
// Bad: 25 individual GetItem calls
for (const id of ids) {
  await dynamodb.getItem({ TableName: 'T', Key: { id } }).promise();
}

// Good: Single BatchGetItem call (up to 100 items, 16MB)
await dynamodb.batchGetItem({
  RequestItems: {
    'T': {
      Keys: ids.map(id => ({ id: { S: id } })),
    },
  },
}).promise();

// Similarly, use BatchWriteItem for bulk writes (up to 25 items per call)
```

BatchGetItem and BatchWriteItem reduce round trips and are significantly faster for bulk operations.

---
