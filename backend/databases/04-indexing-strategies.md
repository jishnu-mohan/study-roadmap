# Indexing Strategies Deep Dive

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
