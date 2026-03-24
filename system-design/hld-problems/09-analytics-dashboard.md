# Real-time Analytics Dashboard

## Problem 9: Real-time Analytics Dashboard **[SR]**

### Problem Statement
Design a real-time analytics dashboard that ingests event streams, computes aggregations, and displays live-updating metrics to users.

### Step 1: Requirements

**Functional Requirements**
- Ingest high-volume events (page views, clicks, transactions)
- Real-time aggregations (counts, sums, averages, percentiles) over time windows
- Dashboard with live-updating charts (updates every few seconds)
- Support custom queries: filter by dimension, group by time interval
- Historical data queries (last 7 days, 30 days)

**Non-Functional Requirements**
- Event ingestion latency: < 5 seconds from event to dashboard
- Query latency: < 500ms for dashboard queries
- Handle 100K events/sec at peak
- Data durability (no event loss)

### Step 2: Back-of-Envelope Estimation

```
100K events/sec peak
Average event size: 200 bytes
Ingestion bandwidth: 100K * 200B = 20MB/sec

Storage (raw events):
  100K * 200B * 86400 = ~1.7TB/day
  30-day retention: ~51TB raw (need aggregation/rollup strategy)

Pre-aggregated data:
  1-minute buckets, 100 metric types, 1000 dimension combos
  = 100K records/minute = 144M records/day at ~100B each = 14GB/day
  30-day retention: ~420GB (much more manageable)
```

### Step 3: High-Level Architecture

```
  Event Sources (web, mobile, backend services)
       |
       v
  +------------------+
  | Event Ingestion  |  (Kafka / Kinesis)
  | (append-only log)|
  +------------------+
       |            |
       v            v
  +---------+  +-----------+
  |Stream   |  |Batch      |
  |Processor|  |Processor  |
  |(Flink/  |  |(hourly/   |
  | Lambda) |  | daily     |
  +---------+  | rollups)  |
       |       +-----------+
       v            |
  +-----------+     |
  |Time-Series|<----+
  |DB         |
  |(TimescaleDB|
  | or ClickHouse)
  +-----------+
       |
       v
  +-----------+       +------------------+
  |Query API  |<----->| Dashboard (React)|
  +-----------+       | (WebSocket for   |
       |              |  live updates)   |
       |              +------------------+
  (also serves
   REST for
   historical)
```

### Step 4: Database Design

**Choice: TimescaleDB** (PostgreSQL extension for time-series) or ClickHouse (columnar, fast aggregations).

```
TimescaleDB:
  Table: events_raw (hypertable, partitioned by time)
    event_id        UUID
    event_type      VARCHAR     -- "page_view", "click", "purchase"
    timestamp       TIMESTAMPTZ -- partition key
    user_id         VARCHAR
    session_id      VARCHAR
    properties      JSONB       -- { "page": "/home", "device": "mobile" }
    amount_cents    INT         -- for purchase events

  Table: metrics_1min (continuous aggregate / materialized view)
    bucket          TIMESTAMPTZ  -- 1-minute bucket
    event_type      VARCHAR
    dimension_key   VARCHAR      -- e.g., "page=/home"
    count           BIGINT
    sum_amount      BIGINT
    avg_amount      DOUBLE
    p95_latency     DOUBLE

  Table: metrics_1hour (rolled up from 1min)
    bucket          TIMESTAMPTZ
    event_type      VARCHAR
    dimension_key   VARCHAR
    count           BIGINT
    sum_amount      BIGINT

  -- Retention policies:
  -- raw events: 7 days
  -- 1-min aggregates: 30 days
  -- 1-hour aggregates: 1 year
  -- 1-day aggregates: forever
```

### Step 5: API Design

```
-- Event ingestion:
POST /api/v1/events/batch
  Body: {
    "events": [
      { "type": "page_view", "timestamp": "...", "properties": { "page": "/home" } },
      { "type": "purchase", "timestamp": "...", "amount_cents": 5000 }
    ]
  }
  Status: 202 Accepted

-- Dashboard queries:
GET /api/v1/metrics?event_type=page_view&interval=1m&from=2024-01-15T00:00&to=2024-01-15T23:59&group_by=page
  Response: {
    "buckets": [
      { "timestamp": "2024-01-15T10:00", "count": 1234, "dimensions": { "/home": 800, "/products": 434 } },
      ...
    ]
  }

-- Live updates via WebSocket:
WS /ws/metrics?event_type=page_view&interval=5s
  Server pushes: { "timestamp": "...", "count": 42, "delta": 5 }
```

### Step 6: Deep Dive

**1. Stream Processing Pipeline**

```
Kafka Topic: raw-events (partitioned by event_type)
       |
       v
Stream Processor (Flink / Kinesis Data Analytics / Lambda):
  - Window: tumbling 1-minute window
  - Aggregate: count, sum, avg per (event_type, dimension)
  - Output: write to metrics_1min table
  - Also: trigger alerts if metric exceeds threshold
```

**2. Pre-aggregation Strategy (Lambda Architecture Lite)**

- **Speed layer**: stream processor computes real-time 1-minute aggregates
- **Batch layer**: hourly job rolls up 1-minute -> 1-hour aggregates, daily job rolls up to 1-day
- **Serving layer**: query API reads from the appropriate aggregation level based on time range
  - Last hour: 1-minute buckets
  - Last day: 1-minute buckets
  - Last week: 1-hour buckets
  - Last month: 1-hour buckets
  - Last year: 1-day buckets

**3. WebSocket Live Updates**

Dashboard opens WebSocket connection with subscription:
- Server pushes latest aggregated metric every 5 seconds
- Client merges with existing chart data
- On disconnect/reconnect: REST API backfills the gap

### Step 7: Scaling and Trade-offs

- **Kafka partitioning**: partition by event_type for parallel processing. If one event type is hot, further partition by hash.
- **Trade-off**: real-time accuracy vs query speed. Pre-aggregation makes queries fast but loses granularity. Keep raw data for drill-down.
- **Trade-off**: storage cost vs query range. Rollup reduces storage massively but cannot query sub-minute data after 30 days.
- **Hot dimensions**: if dashboard queries always filter by the same dimension, pre-aggregate by that dimension.
- **Backpressure**: if stream processor is overwhelmed, Kafka buffers. But dashboard may lag. Alert on consumer lag.
