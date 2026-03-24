# PostgreSQL Deep Dive

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
