# Databases Deep Dive -- SDE2 Interview Reference

---

## [SR] PostgreSQL Deep Dive

### Architecture

PostgreSQL uses a multi-process architecture (not multi-threaded). Understanding how it works under the hood helps you reason about performance and troubleshoot issues.

**Key components:**

1. **Postmaster process**: The main daemon. Listens for connections and forks a new backend process for each client connection. This is why connection counts matter -- each connection is an OS process.

2. **Backend processes (one per connection)**: Each client gets a dedicated process that handles parsing, planning, and executing queries. These processes share memory but have their own private memory for sorting, hashing, etc.

3. **Shared buffers**: A shared memory area (typically 25% of system RAM, configured via `shared_buffers`). This is PostgreSQL's page cache. When a backend needs to read a page (8KB block), it checks shared buffers first before going to disk. Dirty pages (modified in memory but not yet written to disk) live here until the background writer or checkpointer flushes them.

4. **WAL (Write-Ahead Log)**: The cornerstone of durability. Before any data modification is written to the actual data files, the change is first recorded in the WAL. This means:
   - On crash, PostgreSQL replays the WAL to recover committed transactions
   - Sequential WAL writes are much faster than random data file writes
   - Replication works by shipping WAL records to replicas
   - WAL is stored in `pg_wal/` directory as 16MB segment files

5. **Background writer**: Periodically writes dirty pages from shared buffers to disk, reducing the work the checkpointer needs to do.

6. **Checkpointer**: Periodically creates checkpoints -- a known-good state where all dirty pages are flushed to disk. After a checkpoint, WAL before that point can be recycled.

7. **Autovacuum**: Reclaims space from dead tuples (rows marked as deleted by MVCC). Critical for preventing table bloat.

**How a query executes (lifecycle):**

```
Client sends query
  -> Parser: SQL text -> parse tree (syntax check)
  -> Rewriter: applies rules and views
  -> Planner/Optimizer: generates query plan (chooses indexes, join strategies, etc.)
  -> Executor: runs the plan, fetches/modifies data
  -> Results sent back to client
```

The planner uses statistics (from `ANALYZE` / autovacuum) about table sizes, value distributions, and correlations to estimate costs and choose the cheapest plan.

---

### Indexes

Indexes are the single most impactful tool for query performance. PostgreSQL supports several index types, each suited for different access patterns.

#### B-tree (default)

The workhorse index. Used for equality and range queries.

```sql
-- Simple B-tree index
CREATE INDEX idx_users_email ON users(email);

-- Used for: =, <, >, <=, >=, BETWEEN, IN, IS NULL
-- Also supports ORDER BY without a separate sort step

SELECT * FROM users WHERE email = 'jishnu@example.com';  -- equality
SELECT * FROM orders WHERE created_at BETWEEN '2026-01-01' AND '2026-03-01';  -- range
```

**Internals**: A balanced tree where leaf nodes contain pointers to heap tuples. O(log n) for lookups. Leaf nodes are linked, so range scans walk the leaf chain efficiently.

#### Hash index

Equality lookups only. Slightly faster than B-tree for pure equality, but cannot support range queries or sorting.

```sql
CREATE INDEX idx_sessions_token ON sessions USING hash(token);

-- Good for: = only
-- Cannot do: <, >, BETWEEN, ORDER BY
```

Use case: Session tokens, UUIDs used only for exact lookups. In practice, B-tree is almost always fine -- hash indexes are niche.

#### GIN (Generalized Inverted Index)

Designed for values that contain multiple elements: arrays, JSONB, full-text search.

```sql
-- Full-text search
CREATE INDEX idx_articles_search ON articles USING gin(to_tsvector('english', body));

-- JSONB containment queries
CREATE INDEX idx_events_data ON events USING gin(data jsonb_path_ops);

-- Array contains
CREATE INDEX idx_posts_tags ON posts USING gin(tags);
```

GIN maps each element (word, key, array element) to the set of rows containing it. Lookups are fast, but writes are slower because every element in the indexed value must be inserted into the index.

#### GiST (Generalized Search Tree)

For geometric data, range types, and nearest-neighbor queries.

```sql
-- Range overlap queries
CREATE INDEX idx_bookings_period ON bookings USING gist(period);

-- Geometric: find points within a bounding box
CREATE INDEX idx_locations_point ON locations USING gist(point);

-- Used with: &&, @>, <@, <<, >>, etc. (range and geometric operators)
```

#### Composite Indexes and Column Ordering

Composite indexes index multiple columns. **Column order matters critically** due to the leftmost prefix rule.

```sql
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

This index supports:
- `WHERE user_id = 123` -- uses the index (leftmost column)
- `WHERE user_id = 123 AND created_at > '2026-01-01'` -- uses the index (both columns)
- `WHERE user_id = 123 ORDER BY created_at` -- uses the index for both filter and sort

This index does NOT efficiently support:
- `WHERE created_at > '2026-01-01'` -- cannot skip to the second column without the first

**Rule of thumb for column ordering in composite indexes:**
1. Equality columns first (exact match narrows search immediately)
2. Range/sorting columns last

```sql
-- If you query: WHERE status = 'active' AND created_at > '2026-01-01' ORDER BY created_at
-- Best index:
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
-- status (equality) comes first, created_at (range + sort) comes second
```

---

### EXPLAIN ANALYZE

The most important tool for understanding query performance. `EXPLAIN` shows the plan; `EXPLAIN ANALYZE` actually runs the query and shows real timings.

```sql
EXPLAIN ANALYZE
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > '2026-01-01'
ORDER BY o.created_at DESC
LIMIT 20;
```

Example output:

```
Limit  (cost=0.87..45.32 rows=20 width=52) (actual time=0.089..0.234 rows=20 loops=1)
  -> Nested Loop  (cost=0.87..1892.45 rows=850 width=52) (actual time=0.087..0.229 rows=20 loops=1)
       -> Index Scan Backward using idx_orders_status_created on orders o
            (cost=0.43..892.15 rows=850 width=36) (actual time=0.065..0.112 rows=20 loops=1)
            Index Cond: ((status = 'pending') AND (created_at > '2026-01-01'))
       -> Index Scan using users_pkey on users u
            (cost=0.43..1.17 rows=1 width=20) (actual time=0.004..0.005 rows=1 loops=20)
            Index Cond: (id = o.user_id)
Planning Time: 0.245 ms
Execution Time: 0.278 ms
```

**How to read this:**

- **Indentation shows nesting**: Inner nodes feed into outer nodes. Read inside-out.
- **cost=startup..total**: Estimated cost in arbitrary units. `startup` is cost before first row is returned; `total` is cost for all rows. These are estimates the planner uses, not real timings.
- **actual time=first..last**: Real wall-clock time in milliseconds. `first` = time to first row, `last` = time to last row.
- **rows**: Estimated vs actual row count. Large discrepancies mean stale statistics (run `ANALYZE`).
- **loops**: How many times this node was executed. Multiply actual time by loops for true total.

**Scan types (most to least efficient in general):**

| Scan Type | Meaning | When It Happens |
|-----------|---------|-----------------|
| Index Only Scan | Reads data entirely from the index (no heap access) | All needed columns are in the index, visibility map is up-to-date |
| Index Scan | Uses index to find rows, then fetches from heap | Index exists on filter column, good selectivity |
| Bitmap Index Scan | Builds a bitmap of matching pages, then does sequential heap access | Moderate selectivity, or combining multiple indexes |
| Seq Scan | Full table scan | No suitable index, or planner estimates it is cheaper (small table, low selectivity) |

**Key things to look for:**
- Seq Scan on a large table with a WHERE clause: probably needs an index
- Actual rows much higher than estimated: run `ANALYZE` on the table
- Nested Loop with high `loops` count on inner node: consider if a Hash Join would be better
- Sort node with `Sort Method: external merge Disk`: increase `work_mem`

---

### Transactions and ACID

**ACID properties with concrete examples:**

**Atomicity**: A transaction is all-or-nothing.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;  -- debit
UPDATE accounts SET balance = balance + 500 WHERE id = 2;  -- credit
COMMIT;
-- If the server crashes between the two UPDATEs, NEITHER change persists.
-- The WAL ensures this: uncommitted changes are not replayed on recovery.
```

**Consistency**: The database moves from one valid state to another. Constraints (CHECK, UNIQUE, FOREIGN KEY) are enforced. If a constraint would be violated, the transaction is aborted.

```sql
ALTER TABLE accounts ADD CONSTRAINT positive_balance CHECK (balance >= 0);
-- Now: UPDATE accounts SET balance = balance - 99999 WHERE id = 1;
-- If balance would go negative, the entire transaction fails.
```

**Isolation**: Concurrent transactions don't interfere with each other (degree depends on isolation level).

**Durability**: Once committed, data survives crashes. The WAL is fsynced to disk on COMMIT, so even if the server crashes immediately after, the data is recoverable.

#### Isolation Levels

**Read Uncommitted**:
PostgreSQL actually treats this as Read Committed. Dirty reads are not possible in PostgreSQL even at this level (this is a PostgreSQL-specific behavior). In other databases, you can read data from transactions that have not yet committed.

**Read Committed (PostgreSQL default)**:
Each statement sees a snapshot of data as of the start of that statement. No dirty reads. But:

```
-- Transaction A                    -- Transaction B
BEGIN;                              BEGIN;
SELECT balance FROM accounts
  WHERE id = 1;  -- returns 1000
                                    UPDATE accounts SET balance = 500
                                      WHERE id = 1;
                                    COMMIT;
SELECT balance FROM accounts
  WHERE id = 1;  -- returns 500 (non-repeatable read!)
COMMIT;
```

The same query within the same transaction can return different results because each statement gets a fresh snapshot.

**Repeatable Read**:
The transaction sees a snapshot as of the start of the transaction (not each statement). All reads within the transaction see the same data.

```
-- Transaction A (REPEATABLE READ)  -- Transaction B
BEGIN;                              BEGIN;
SELECT balance FROM accounts
  WHERE id = 1;  -- returns 1000
                                    UPDATE accounts SET balance = 500
                                      WHERE id = 1;
                                    COMMIT;
SELECT balance FROM accounts
  WHERE id = 1;  -- STILL returns 1000 (snapshot from start of tx)
COMMIT;
```

In PostgreSQL, Repeatable Read also prevents phantom reads (new rows inserted by other transactions are not visible). If Transaction A tries to UPDATE a row that Transaction B already modified and committed, Transaction A gets a serialization error and must retry.

**Serializable**:
Full isolation. Transactions behave as if they executed one at a time. PostgreSQL uses Serializable Snapshot Isolation (SSI). It can detect certain patterns of read/write dependencies and abort transactions to prevent anomalies. You must code retry logic because serialization failures are expected.

```sql
-- Must handle this error:
-- ERROR: could not serialize access due to read/write dependencies among transactions
```

**Which to use in practice:**
- Read Committed: default, fine for most OLTP workloads
- Repeatable Read: when you need consistent reads within a transaction (reports, analytics)
- Serializable: when correctness requires it (financial calculations, inventory management). Expect retries.

---

### MVCC (Multi-Version Concurrency Control)

PostgreSQL never overwrites data in place. Instead, it creates new versions of rows.

**How it works:**

Every row (tuple) has hidden system columns:
- `xmin`: The transaction ID that inserted this tuple
- `xmax`: The transaction ID that deleted/updated this tuple (0 if still live)

When you UPDATE a row:
1. The old tuple's `xmax` is set to the current transaction ID
2. A new tuple is created with `xmin` = current transaction ID and `xmax` = 0

When you DELETE a row:
1. The tuple's `xmax` is set to the current transaction ID
2. No physical deletion happens yet

**Visibility rules:**
A tuple is visible to a transaction if:
- `xmin` is a committed transaction (or the current transaction)
- AND `xmax` is either 0, an aborted transaction, or a not-yet-visible transaction

This is how readers never block writers and writers never block readers. Each transaction sees its own consistent snapshot.

**Why VACUUM is needed:**

Dead tuples (old versions no longer visible to any transaction) waste space. VACUUM:
1. Marks dead tuples as free space that can be reused by future inserts/updates
2. Updates the visibility map (used for Index Only Scans)
3. Updates the free space map
4. Freezes old transaction IDs to prevent wraparound (transaction IDs are 32-bit, ~4 billion)

`VACUUM FULL` rewrites the entire table to reclaim space back to the OS, but locks the table exclusively. Regular `VACUUM` just marks space as reusable without locking.

**Autovacuum** handles this automatically, but for high-write tables, you may need to tune:
```sql
ALTER TABLE hot_table SET (autovacuum_vacuum_scale_factor = 0.01);  -- vacuum after 1% dead tuples instead of default 20%
ALTER TABLE hot_table SET (autovacuum_analyze_scale_factor = 0.005);
```

---

### Common Performance Issues

#### N+1 Queries

The classic ORM trap. You fetch a list of items, then for each item, run a separate query to fetch related data.

```typescript
// BAD: N+1 queries
const users = await db.query('SELECT * FROM users LIMIT 100');
for (const user of users) {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
  // 1 query for users + 100 queries for orders = 101 queries
}

// GOOD: Single JOIN or IN query
const results = await db.query(`
  SELECT u.*, o.id as order_id, o.total
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  WHERE u.id IN (SELECT id FROM users LIMIT 100)
`);

// OR: Two queries with IN clause
const users = await db.query('SELECT * FROM users LIMIT 100');
const userIds = users.rows.map(u => u.id);
const orders = await db.query('SELECT * FROM orders WHERE user_id = ANY($1)', [userIds]);
```

#### Missing Indexes

Symptoms: slow queries, high Seq Scan count in `pg_stat_user_tables`.

```sql
-- Find tables with the most sequential scans relative to index scans
SELECT schemaname, relname, seq_scan, idx_scan,
       seq_scan - idx_scan AS seq_over_idx
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan - idx_scan DESC;

-- Find slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### Table Bloat

When autovacuum cannot keep up (high update/delete rate, long-running transactions holding back the oldest visible snapshot), tables grow much larger than they need to be.

Detecting bloat:
```sql
-- Check dead tuple ratio
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

Fixing: regular VACUUM for ongoing maintenance. `pg_repack` extension for online table rewrite without exclusive lock (preferred over VACUUM FULL).

#### Connection Pooling (PgBouncer)

**Why it is needed**: PostgreSQL forks a process per connection. Each process uses ~5-10MB of RAM. If your application has 20 instances with 20 connections each, that is 400 connections and ~2-4GB just for process overhead. PostgreSQL performance degrades significantly beyond a few hundred connections.

**PgBouncer** sits between your application and PostgreSQL, maintaining a smaller pool of actual database connections.

**Modes:**
- **Session mode**: Client gets a dedicated server connection for the entire session. Supports all features (prepared statements, LISTEN/NOTIFY, temp tables). Least connection savings.
- **Transaction mode**: Client gets a server connection only for the duration of a transaction. Between transactions, the connection is returned to the pool. Cannot use session-level features (prepared statements need special handling). Best balance for most applications.
- **Statement mode**: Each statement gets its own connection. Cannot use multi-statement transactions. Rarely used.

Typical setup: Application has 200+ "connections" to PgBouncer, PgBouncer maintains 20-50 actual connections to PostgreSQL.

---

### Partitioning

Splitting a large table into smaller physical pieces while maintaining a single logical table.

#### When to Partition

- Table exceeds ~10GB or has tens of millions of rows
- Queries almost always filter by the partition key
- You need to efficiently delete old data (drop partition instead of DELETE)
- Maintenance operations (VACUUM, reindex) on the full table are too slow

#### Range Partitioning (most common)

Ideal for time-series data.

```sql
CREATE TABLE events (
    id          bigserial,
    created_at  timestamptz NOT NULL,
    event_type  text,
    payload     jsonb
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_2026_03 PARTITION OF events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Dropping old data is instant:
DROP TABLE events_2025_01;
```

#### List Partitioning

Good for categorical data.

```sql
CREATE TABLE orders (
    id          bigserial,
    region      text NOT NULL,
    total       numeric
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('us-east', 'us-west');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('eu-west', 'eu-central');
CREATE TABLE orders_ap PARTITION OF orders FOR VALUES IN ('ap-south', 'ap-east');
```

#### Hash Partitioning

Even distribution when there is no natural range or list.

```sql
CREATE TABLE sessions (
    id      uuid PRIMARY KEY,
    data    jsonb
) PARTITION BY HASH (id);

CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

#### Partition Pruning

When a query includes the partition key in the WHERE clause, PostgreSQL automatically skips partitions that cannot contain matching rows. This is the main performance win.

```sql
-- Only scans events_2026_03, skips all other partitions
SELECT * FROM events WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01';
```

Verify with EXPLAIN:
```
Append
  -> Seq Scan on events_2026_03
       Filter: (created_at >= '2026-03-01' AND created_at < '2026-04-01')
```

If you see all partitions in the plan, the planner cannot prune -- check that the partition key is in the WHERE clause and the types match.

---

## [SR] DynamoDB Deep Dive

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

## [SR] SQL vs NoSQL Decision Framework

| Factor | Choose SQL (PostgreSQL) | Choose NoSQL (DynamoDB) |
|--------|------------------------|------------------------|
| **Data Relationships** | Complex relationships, many JOINs, referential integrity needed | Flat or hierarchical data, denormalized, few relationships |
| **Query Flexibility** | Ad-hoc queries, complex aggregations, reporting, analytics | Known access patterns, simple key-value or key-range lookups |
| **Consistency Needs** | Strong consistency required (financial transactions, inventory) | Eventual consistency acceptable for most reads; single-item strong consistency available |
| **Scale** | Vertical scaling (bigger instance) + read replicas; sharding is manual and painful | Horizontal scaling is built-in and automatic; designed for massive throughput |
| **Schema Stability** | Schema is well-defined and evolves slowly; migrations are manageable | Schema-less items; different items can have different attributes; rapid iteration on data shape |
| **Team Expertise** | Team knows SQL; existing tooling for SQL databases | Team experienced with DynamoDB patterns; willing to invest in access pattern design upfront |
| **Operational Overhead** | Requires management (backups, upgrades, monitoring, vacuuming) unless using managed service (RDS) | Fully managed, zero operational overhead; AWS handles everything |
| **Cost at Scale** | More cost-effective for complex query workloads (one query can do what would take multiple DynamoDB calls) | More cost-effective for simple lookups at massive scale; pay-per-request model is efficient |
| **Latency** | Single-digit millisecond for indexed queries; can be higher for complex joins | Consistent single-digit millisecond at any scale; DAX cache for microsecond reads |

**Real-world heuristic:**
- If you are building a transactional system with complex queries and strong consistency needs (e.g., payment processing, inventory management, CMS), choose PostgreSQL.
- If you are building a high-throughput system with well-defined access patterns and you need automatic scaling (e.g., user sessions, IoT data, real-time leaderboards, event stores), choose DynamoDB.
- Many production systems use both: PostgreSQL for the core transactional data, DynamoDB for high-throughput operational data (sessions, caches, event streams).

---

## [SR] Indexing Strategies Deep Dive

### B-tree Index Internals

A B-tree is a self-balancing tree data structure that maintains sorted data and allows searches, insertions, and deletions in O(log n) time.

**Structure:**
- Root node at the top
- Internal nodes contain keys and pointers to child nodes
- Leaf nodes contain keys and pointers to the actual table rows (heap tuples)
- Leaf nodes are doubly linked for efficient range scans
- All leaf nodes are at the same depth (balanced)

**How a lookup works:**
1. Start at root, compare search key with node keys to choose the right child
2. Traverse down through internal nodes
3. Reach a leaf node containing the key and a pointer (ctid) to the heap tuple
4. Follow the pointer to read the actual row from the heap (table data file)

For a table with 10 million rows, a B-tree index is typically 3-4 levels deep. That means 3-4 page reads to find any row.

**Range scan**: Find the starting leaf, then walk the linked leaf nodes sequentially. Very efficient.

---

### Covering Indexes (INCLUDE)

A covering index contains all the columns needed by a query, so PostgreSQL can satisfy the query entirely from the index without accessing the heap (table data). This results in an **Index Only Scan**.

```sql
-- You frequently run:
SELECT status, total FROM orders WHERE user_id = $1;

-- Regular index: Index Scan on user_id, then heap lookup for status and total
CREATE INDEX idx_orders_user ON orders(user_id);

-- Covering index: Index Only Scan, no heap access needed
CREATE INDEX idx_orders_user_covering ON orders(user_id) INCLUDE (status, total);
```

**Key points:**
- `INCLUDE` columns are stored in leaf nodes only (not in internal nodes), so they do not affect tree structure or search
- `INCLUDE` columns cannot be used for searching/filtering -- only for retrieval
- Covering indexes are larger but eliminate heap lookups, which is a significant win for queries that return many rows

**When to use:**
- Queries that read a few columns from many rows
- Columns in SELECT or WHERE that are not part of the index search keys
- High-frequency queries where eliminating heap access makes a measurable difference

---

### Partial Indexes

An index that only includes rows matching a specified condition. Smaller, faster, and cheaper to maintain than a full index.

```sql
-- Only 5% of orders are "pending", but you query them constantly
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- This index is ~20x smaller than indexing all orders by created_at
-- PostgreSQL uses it when your query matches the WHERE condition:
SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-03-01';
-- Uses idx_orders_pending (Index Scan)

SELECT * FROM orders WHERE status = 'shipped' AND created_at > '2026-03-01';
-- Cannot use idx_orders_pending (condition does not match)
```

**Use cases:**
- Filtering on a status where most rows have one value and you query another
- Soft deletes: `WHERE deleted_at IS NULL` (index only active records)
- Active/inactive flags: `WHERE is_active = true`
- Excluding NULL values you never query: `WHERE some_column IS NOT NULL`

---

### Expression Indexes (Functional Indexes)

Index the result of a function or expression, not the raw column value.

```sql
-- Case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Query must use the same expression:
SELECT * FROM users WHERE LOWER(email) = 'jishnu@example.com';  -- uses the index
SELECT * FROM users WHERE email = 'Jishnu@example.com';          -- does NOT use the index

-- Extracting a field from JSONB
CREATE INDEX idx_events_type ON events((payload->>'type'));
SELECT * FROM events WHERE payload->>'type' = 'click';  -- uses the index

-- Computed value
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2026;
```

**Important**: The query must use exactly the same expression as the index definition. `LOWER(email)` in the index means you must write `LOWER(email)` in the WHERE clause.

---

### When NOT to Index

Adding indexes is not free. Each index:
- Consumes disk space
- Slows down INSERT, UPDATE, and DELETE operations (the index must be maintained)
- Uses shared buffer space

**Do not index when:**

1. **High-write, low-read tables**: Event logs, audit trails that are rarely queried. Each write updates every index on the table.

2. **Low-selectivity columns**: A boolean column with 50/50 distribution. The index would return half the table, and a Seq Scan is faster than an Index Scan for that.

3. **Very small tables**: A table with 100 rows fits in a single page. A Seq Scan reads one page. An Index Scan reads the index pages plus the data page -- more work for no benefit.

4. **Columns queried only with functions**: An index on `email` does not help `WHERE LOWER(email) = ...`. You need a functional index instead.

5. **Columns rarely used in WHERE, JOIN, or ORDER BY**: If a column only appears in SELECT, an index on it provides no benefit (unless it is an INCLUDE column in a covering index).

**How to find unused indexes:**

```sql
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

Indexes with `idx_scan = 0` after a representative period of production traffic are candidates for removal.

---

## [SR] Database Sharding and Replication

### Sharding Strategies

Sharding is splitting data across multiple database instances. Each shard holds a subset of the data. This is how you scale writes horizontally.

#### Hash-Based Sharding

Assign each row to a shard by hashing its shard key: `shard = hash(key) % num_shards`.

**Pros:**
- Even data distribution (assuming a good hash function and a reasonably distributed key)
- Simple to implement

**Cons:**
- Range queries across shard keys require querying all shards (scatter-gather)
- Adding/removing shards requires rehashing and migrating data (consistent hashing mitigates this)

**Example:** Shard users by `hash(user_id) % 4`. User data is evenly distributed, but "find all users created in March" requires querying all 4 shards.

#### Range-Based Sharding

Assign rows based on ranges of the shard key: `shard 1: user_id 1-1M, shard 2: user_id 1M-2M`.

**Pros:**
- Range queries on the shard key only hit relevant shards
- Good for time-series data (shard by month/year, old shards can be archived)

**Cons:**
- Risk of hot shards (new data always goes to the latest shard)
- Data distribution can be uneven if the key is not uniformly distributed

#### Geographic Sharding

Assign data based on geographic region.

**Pros:**
- Data locality: users access the shard closest to them (lower latency)
- Compliance: data residency requirements (GDPR -- EU data stays in EU)

**Cons:**
- Uneven distribution (some regions have more users)
- Cross-region queries are expensive

---

### Challenges

1. **Cross-shard queries**: Queries that need data from multiple shards require a scatter-gather pattern. Performance degrades as shard count increases. Solution: design the shard key to match your most common access pattern.

2. **Distributed joins**: Joining data across shards is extremely expensive (requires shipping data between shards). Denormalize to keep frequently-joined data on the same shard.

3. **Rebalancing**: When a shard gets too large, splitting it and migrating data is operationally risky. Consistent hashing (virtual nodes) helps by minimizing data movement.

4. **Schema changes**: ALTER TABLE must run on every shard. Use online DDL tools (e.g., `pt-online-schema-change`, `gh-ost`) and deploy shard-by-shard.

5. **Maintaining uniqueness across shards**: Auto-increment IDs do not work across shards. Use UUIDs, Snowflake IDs, or a centralized ID service.

6. **Transactions across shards**: 2-phase commit is slow and fragile. Prefer saga patterns or design data to avoid cross-shard transactions.

---

### Replication

#### Leader-Follower (Primary-Replica)

One leader handles all writes. Followers replicate the leader's data and serve reads.

```
  Writes -> [Leader] --replication--> [Follower 1] <- Reads
                     --replication--> [Follower 2] <- Reads
```

- **Reads scale** horizontally (add more followers)
- **Writes do not scale** (single leader bottleneck)
- **Replication lag**: Followers may be slightly behind the leader. A read immediately after a write might not see the new data (read-your-writes consistency requires reading from the leader or using synchronous replication).

PostgreSQL supports streaming replication (asynchronous by default, synchronous optional). AWS RDS supports up to 5 read replicas.

#### Leader-Leader (Multi-Primary)

Multiple nodes accept writes and replicate to each other.

```
  Writes -> [Leader A] <--replication--> [Leader B] <- Writes
```

- **Write availability**: If one leader goes down, the other continues accepting writes
- **Conflict resolution needed**: If both leaders modify the same row simultaneously, you need a strategy (last-writer-wins, custom merge logic, CRDTs)
- Rarely used in practice due to conflict complexity. PostgreSQL BDR (Bi-Directional Replication) supports this.

#### Quorum-Based Replication

Used in distributed databases (Cassandra, DynamoDB internally). Writes go to W nodes, reads from R nodes. If W + R > N (total replicas), reads are guaranteed to see the latest write.

```
N = 3 replicas
W = 2 (write to 2 of 3 nodes)
R = 2 (read from 2 of 3 nodes)
W + R = 4 > 3 = guaranteed consistency
```

Trade-off: higher W means slower writes but faster consistent reads. Higher R means slower reads but faster writes.

---

### Read Replicas

**Use cases:**
- Offload read-heavy workloads (analytics queries, reports) from the primary
- Geographic distribution (replica in each region for lower latency reads)
- Failover target (promote replica to primary if primary fails)

**Replication lag considerations:**
- Asynchronous replication: lag is typically milliseconds to seconds, but can spike during high write load or large transactions
- For "read-your-writes" consistency: either read from primary for a short window after writes, or use synchronous replication (at the cost of write latency)
- Monitor replication lag: in PostgreSQL, check `pg_stat_replication` on the primary
- In AWS RDS: CloudWatch metric `ReplicaLag`

```sql
-- Check replication lag on PostgreSQL primary
SELECT client_addr, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       replay_lag
FROM pg_stat_replication;
```

---

## [SR] Common Database Interview Questions

### 1. What is database normalization? When would you denormalize?

**Normalization** is the process of structuring a relational database to reduce redundancy and improve data integrity by dividing tables into smaller, well-defined entities.

**Normal forms (the ones that matter in practice):**

- **1NF**: Every column holds atomic (indivisible) values. No repeating groups or arrays in a single column.
- **2NF**: 1NF + every non-key column depends on the entire primary key (not just part of a composite key).
- **3NF**: 2NF + every non-key column depends only on the primary key, not on other non-key columns (no transitive dependencies).

**Example of denormalized table:**

```
orders: id, user_id, user_name, user_email, product_name, product_price, quantity
```

Problem: If a user changes their name, you must update every order row. If you miss one, data is inconsistent.

**Normalized (3NF):**

```
users: id, name, email
products: id, name, price
orders: id, user_id, product_id, quantity
```

**When to denormalize:**

- Read performance is critical and JOINs are too expensive at scale
- Data is written once and read many times (audit logs, event records)
- Reporting/analytics workloads where precomputed aggregates avoid expensive runtime calculations
- NoSQL databases where joins are not supported

The key trade-off: normalized = write simplicity + data integrity, denormalized = read performance + data redundancy.

---

### 2. Explain the difference between clustered and non-clustered indexes.

**Clustered index**: The data rows are physically stored in the order of the index. There can be only one clustered index per table because the data can only be physically sorted one way.

- In PostgreSQL, there is no persistent clustered index. The `CLUSTER` command reorders the table once, but subsequent inserts go wherever there is free space. PostgreSQL relies on the correlation statistic to estimate how well the physical order matches the index order.
- In SQL Server / MySQL InnoDB, the primary key is the clustered index. The leaf nodes of the clustered index ARE the data rows.

**Non-clustered index**: A separate data structure that contains the indexed columns and a pointer (row locator) back to the actual data row. There can be many non-clustered indexes per table.

**Practical impact:**
- Clustered index: range scans on the clustered key are extremely fast (sequential I/O)
- Non-clustered index: range scans may require random I/O to fetch data rows (unless it is a covering index)

In PostgreSQL specifically, all indexes are non-clustered. The table data (heap) is separate from all indexes. Index entries contain a `ctid` (tuple ID: page number + position) pointing to the heap.

---

### 3. How would you handle database migrations with zero downtime?

The principle: never make a change that is incompatible with the currently running application code.

**Strategy: expand-contract pattern**

**Phase 1: Expand (backward compatible)**
- Add new columns (nullable or with defaults)
- Create new tables
- Create new indexes CONCURRENTLY (does not lock the table in PostgreSQL)

```sql
-- Safe: adding a nullable column does not lock or rewrite the table
ALTER TABLE users ADD COLUMN phone text;

-- Safe: concurrent index creation
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);
```

**Phase 2: Migrate data**
- Backfill new columns from old data
- Do this in batches to avoid locking/overwhelming the database

```sql
-- Backfill in batches
UPDATE users SET phone = legacy_phone WHERE phone IS NULL AND id BETWEEN 1 AND 10000;
-- Repeat for next batch
```

**Phase 3: Deploy new code**
- New code reads from and writes to both old and new columns/tables
- Once all instances are running new code, switch reads to the new location

**Phase 4: Contract (clean up)**
- Drop old columns, old tables, old indexes
- Only after all application code no longer references them

**Things to avoid:**
- `ALTER TABLE ... ADD COLUMN ... DEFAULT value NOT NULL` on large tables in older PostgreSQL versions (< 11) rewrites the entire table. PostgreSQL 11+ handles this without a rewrite.
- Renaming columns (breaks running code). Instead: add new column, migrate data, update code, drop old column.
- `DROP COLUMN` while old code is still running.
- Long-running transactions during migrations (blocks autovacuum, holds locks).

---

### 4. What is connection pooling and why is it important?

**Problem:** Each PostgreSQL connection is a separate OS process. Process creation and memory overhead become significant at scale.

- Each connection uses ~5-10MB of memory
- Context switching between hundreds of processes wastes CPU
- PostgreSQL internal locking becomes contended beyond ~200-300 connections
- A typical Node.js application server creates a pool of connections (e.g., 10-20 per instance). With 30 instances, that is 300-600 connections.

**Solution:** A connection pooler (PgBouncer, pgpool-II) sits between the application and PostgreSQL.

```
App Instance 1 (20 conns) --\
App Instance 2 (20 conns) ----> PgBouncer (maintains 30 actual PG connections)
App Instance 3 (20 conns) --/
```

The application thinks it has 60 connections, but PgBouncer multiplexes them onto 30 real connections.

**PgBouncer modes** (recap):
- **Session**: One-to-one mapping for the session lifetime. Least efficient but supports all features.
- **Transaction**: Connection is returned to the pool after each transaction. Best for most applications. Caveat: prepared statements need `protocol-level prepared statements` or `DEALLOCATE ALL` workarounds.
- **Statement**: Connection returned after each statement. No transaction support.

**Why it matters for Node.js/TypeScript specifically:**
Node.js is single-threaded. Libraries like `pg` (node-postgres) have built-in connection pooling, but each Node process has its own pool. With Lambda or many ECS tasks, you can easily exceed PostgreSQL's connection limit. PgBouncer solves this at the infrastructure level.

---

### 5. How do you debug a slow query?

**Step-by-step process:**

**1. Identify the slow query.**
```sql
-- Enable pg_stat_statements extension (if not already)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries by mean execution time
SELECT query, calls, mean_exec_time, total_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

Or check `log_min_duration_statement` in PostgreSQL config to log queries slower than a threshold.

**2. Run EXPLAIN ANALYZE.**

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ... your slow query ...;
```

The `BUFFERS` option shows how many pages were read from cache vs disk.

**3. Look for these red flags:**

- **Seq Scan on a large table**: Needs an index.
- **Estimated rows wildly different from actual rows**: Run `ANALYZE tablename` to update statistics.
- **Nested Loop with high loop count**: Inner node is executed many times. Consider a Hash Join or Merge Join (may need more `work_mem`).
- **Sort with external merge (disk)**: Increase `work_mem`.
- **Bitmap Heap Scan with many "Recheck" rows**: The filter is not selective enough, or the table has high physical correlation disorder.

**4. Check for locking.**

```sql
SELECT pid, wait_event_type, wait_event, state, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL;
```

**5. Check table statistics.**

```sql
SELECT relname, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze, n_dead_tup
FROM pg_stat_user_tables
WHERE relname = 'your_table';
```

**6. Fix the issue:**
- Add an appropriate index
- Rewrite the query (avoid subqueries that prevent index use, use JOINs instead)
- Update statistics (`ANALYZE`)
- Increase `work_mem` for complex queries
- Vacuum the table if bloated
- Consider partitioning for very large tables

---

### 6. When would you choose PostgreSQL over DynamoDB (and vice versa)?

**Choose PostgreSQL when:**
- You need complex queries with JOINs, aggregations, window functions, CTEs
- Data has complex relationships with referential integrity requirements
- You need strong, multi-row transactional consistency
- Your access patterns are not fully known upfront (ad-hoc queries)
- You need full-text search without a separate search engine (PostgreSQL's built-in FTS is solid)
- Team has SQL expertise and existing SQL tooling/ORMs

**Choose DynamoDB when:**
- You need consistent single-digit millisecond latency at any scale
- Your access patterns are well-defined and unlikely to change drastically
- You need automatic horizontal scaling without operational overhead
- You are building serverless (Lambda) applications on AWS
- Data is mostly key-value or key-range with simple lookups
- You need built-in event streaming (DynamoDB Streams) for reactive architectures
- You want zero database administration (no patching, backups, vacuuming, connection management)

**Common pattern in practice:**
PostgreSQL for the core transactional database (users, orders, payments), DynamoDB for high-throughput operational workloads (sessions, feature flags, real-time activity feeds, IoT telemetry).

---

### 7. Explain optimistic vs pessimistic locking.

**Pessimistic locking**: Assume conflicts will happen. Lock the resource before modifying it.

```sql
-- PostgreSQL: SELECT ... FOR UPDATE acquires a row-level lock
BEGIN;
SELECT * FROM inventory WHERE product_id = 42 FOR UPDATE;
-- This row is now locked. Other transactions trying to SELECT ... FOR UPDATE
-- on the same row will BLOCK until this transaction commits or rolls back.
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42;
COMMIT;
```

**Pros:** Guaranteed to prevent conflicts. Simple logic.
**Cons:** Reduced concurrency. Risk of deadlocks. Holding locks for long periods blocks other transactions.

**Optimistic locking**: Assume conflicts are rare. Do not lock upfront, but check for conflicts at write time.

```sql
-- Application reads current version
SELECT quantity, version FROM inventory WHERE product_id = 42;
-- Returns: quantity = 10, version = 5

-- Application modifies and writes back, checking that version has not changed
UPDATE inventory
SET quantity = 9, version = 6
WHERE product_id = 42 AND version = 5;

-- If another transaction modified the row (version is now 6), this UPDATE
-- affects 0 rows. The application detects this and retries.
```

In DynamoDB, optimistic locking is implemented via condition expressions:

```typescript
await dynamodb.updateItem({
  TableName: 'Inventory',
  Key: { product_id: { N: '42' } },
  UpdateExpression: 'SET quantity = :newQty, version = :newVersion',
  ConditionExpression: 'version = :currentVersion',
  ExpressionAttributeValues: {
    ':newQty': { N: '9' },
    ':newVersion': { N: '6' },
    ':currentVersion': { N: '5' },
  },
}).promise();
// Throws ConditionalCheckFailedException if version has changed
```

**Pros:** Higher concurrency. No locking overhead.
**Cons:** Must handle retries. Under high contention, retries can cascade and performance degrades.

**When to use which:**
- Pessimistic: High contention resources (limited inventory, seat reservations). Short-lived transactions.
- Optimistic: Low contention (most rows are rarely updated simultaneously). Long-lived operations where holding a lock would be impractical.

---

### 8. What are the trade-offs of database sharding?

**Benefits:**
- **Write scalability**: Each shard handles a fraction of the total writes
- **Storage scalability**: Total data capacity is the sum of all shards
- **Fault isolation**: A shard failure affects only a subset of users/data
- **Geographic distribution**: Shards in different regions for lower latency

**Costs:**
- **Operational complexity**: Managing multiple database instances, monitoring, backups, upgrades
- **Cross-shard queries**: Queries spanning multiple shards are slow and complex (scatter-gather)
- **Distributed joins**: Essentially impossible at scale; must denormalize
- **Rebalancing**: Adding/removing shards requires data migration
- **Transaction boundaries**: Cross-shard transactions require distributed commit protocols (2PC) or saga patterns
- **Application complexity**: Application must be shard-aware (routing logic, handling failures)
- **Schema changes**: Must be applied to every shard; rollback is risky

**Alternatives to consider first:**
1. Vertical scaling (bigger machine) -- often sufficient up to TB-scale
2. Read replicas (if reads are the bottleneck)
3. Caching (Redis/Memcached for hot data)
4. Table partitioning (single database, multiple partitions -- PostgreSQL handles this natively)
5. Managed services like DynamoDB that handle sharding transparently

**Rule of thumb**: Shard only when you have exhausted all simpler options and your write throughput or storage exceeds what a single database can handle.

---

### 9. How does MVCC work in PostgreSQL?

(Covered in detail in the PostgreSQL section above; here is the concise interview answer.)

MVCC (Multi-Version Concurrency Control) allows PostgreSQL to handle concurrent access without readers blocking writers or vice versa.

**Mechanism:**
- Every row version (tuple) has two hidden fields: `xmin` (the transaction ID that created this version) and `xmax` (the transaction ID that deleted/expired this version, 0 if the row is still live).
- An UPDATE does not modify the row in place. Instead, it marks the old tuple's `xmax` with the current transaction ID and creates a new tuple with the updated values and a new `xmin`.
- A DELETE sets the tuple's `xmax` to the current transaction ID but does not physically remove it.
- Each transaction has a snapshot that determines which tuples are visible: a tuple is visible if its `xmin` committed before the snapshot was taken and its `xmax` is either 0, uncommitted, or committed after the snapshot.

**Consequence:**
- Readers see a consistent snapshot without holding locks. They never block writers.
- Writers hold row-level locks to prevent conflicting updates, but these do not block readers.
- Dead tuples (old versions no longer visible to any active transaction) accumulate and must be cleaned up by VACUUM.

**Why this matters in interviews:**
It explains PostgreSQL's concurrency model, why VACUUM is essential, why long-running transactions are problematic (they prevent dead tuple cleanup), and how isolation levels are implemented (different snapshot rules).

---

### 10. What is the Write-Ahead Log and why does it matter?

The WAL (Write-Ahead Log) is a sequential, append-only log of all changes made to the database.

**How it works:**
1. When a transaction modifies data, the change is first written to the WAL buffer.
2. On COMMIT, the WAL buffer is flushed (fsynced) to the WAL files on disk.
3. The actual data files (tables, indexes) are updated later by the background writer and checkpointer.

**Why write to the WAL first?**

The WAL is sequential writes to a single file -- much faster than the random I/O needed to update data files across many table and index pages. By guaranteeing the WAL is on disk before acknowledging a COMMIT, PostgreSQL ensures:

**Durability**: If the server crashes after COMMIT, the WAL contains all committed changes. On restart, PostgreSQL replays the WAL from the last checkpoint to bring the database to a consistent state.

**Performance**: The "write amplification" problem (one logical change touches many pages in tables and indexes) is amortized. The WAL captures the logical change once; the actual page writes happen later in batches.

**Replication**: Streaming replication works by continuously shipping WAL records to replicas. The replica applies the WAL, keeping it in sync with the primary. This is also how point-in-time recovery (PITR) works -- replay the base backup plus WAL up to the desired timestamp.

**Key configuration parameters:**
- `wal_level`: `replica` (default, supports replication) or `logical` (supports logical replication/decoding)
- `max_wal_size`: Maximum size before triggering a checkpoint (default 1GB)
- `synchronous_commit`: `on` (wait for WAL flush, safest), `off` (acknowledge commit before flush, faster but risk of losing last few transactions on crash)

**Interview tip**: The WAL is the foundation of PostgreSQL's durability, crash recovery, replication, and point-in-time recovery. Understanding it demonstrates deep knowledge of how databases actually work under the hood.

---

## Quick Reference: Key Numbers to Remember

| Metric | Value |
|--------|-------|
| PostgreSQL connection memory overhead | ~5-10MB per connection |
| PostgreSQL B-tree depth for 10M rows | 3-4 levels |
| PostgreSQL page size | 8KB |
| PostgreSQL WAL segment size | 16MB |
| DynamoDB max item size | 400KB |
| DynamoDB partition throughput limit | 3,000 RCU / 1,000 WCU |
| DynamoDB partition storage limit | 10GB |
| DynamoDB max GSIs per table | 20 |
| DynamoDB max LSIs per table | 5 |
| DynamoDB BatchGetItem max items | 100 |
| DynamoDB BatchWriteItem max items | 25 |
| DynamoDB Streams retention | 24 hours |

---

*This guide covers the core database knowledge expected in SDE2 interviews. For each topic, be prepared to go deeper with specific examples from your experience using PostgreSQL and DynamoDB in production.*
