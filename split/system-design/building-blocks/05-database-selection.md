# Database Selection

## 5. Database Selection **[SR]**

### What It Is
Choosing the right database type based on data model, access patterns, consistency requirements, and scale needs.

### Decision Framework

```
What does your data look like?
         |
    +----+----+
    |         |
Structured   Unstructured / Semi-structured
(relations,  (flexible schema, nested docs)
 joins,       |
 ACID)        +----> Document DB (DynamoDB, MongoDB)
    |
    v
Relational DB (PostgreSQL, MySQL)

Access Pattern?
    |
    +--- Key-value lookups --> Redis, DynamoDB
    +--- Wide column / time series --> Cassandra, TimescaleDB
    +--- Graph traversals --> Neo4j
    +--- Full-text search --> Elasticsearch
```

### Database Comparison

| Type | Example | Strengths | Weaknesses | Use When |
|------|---------|-----------|------------|----------|
| Relational | PostgreSQL | ACID, joins, mature tooling | Horizontal scaling is hard | Complex queries, transactions, data integrity matters |
| Document | DynamoDB, MongoDB | Flexible schema, horizontal scale | No joins (DynamoDB), eventual consistency | Known access patterns, denormalized data |
| Key-Value | Redis, DynamoDB | Sub-ms reads, simple API | No complex queries | Caching, sessions, leaderboards |
| Wide-Column | Cassandra | Write-heavy, time-series, massive scale | No joins, limited query flexibility | IoT, event logs, time-series |
| Graph | Neo4j | Relationship traversals | Not general purpose | Social networks, recommendations |

### Key Trade-offs
- **SQL**: consistency and query flexibility at the cost of horizontal scaling complexity
- **NoSQL**: scale and flexibility at the cost of consistency guarantees and query power

### When to Use (Interview Triggers)
- Always justify your DB choice: "I chose PostgreSQL because we need transactions for payment processing" or "DynamoDB because access is purely key-based and we need single-digit ms latency at scale"
- Multi-database designs are common: PostgreSQL for transactions + Redis for caching + Elasticsearch for search

### Real-World Mapping
- **PostgreSQL (RDS)**: your primary relational DB experience
- **DynamoDB**: your NoSQL experience, single-table design, on-demand scaling
- **Redis (ElastiCache)**: caching and ephemeral data
- In your Treez work: likely PostgreSQL for inventory/orders (ACID) + DynamoDB for high-throughput event logs
