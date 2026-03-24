# SQL vs NoSQL Decision Framework

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
