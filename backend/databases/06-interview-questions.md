# Common Database Interview Questions

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
