# E-commerce Product Catalog

## Problem 8: E-commerce Product Catalog **[SR]**

### Problem Statement
Design a product catalog system for an e-commerce platform that handles product ingestion, search, inventory synchronization, and event-driven updates. This directly maps to your Treez cannabis retail/POS experience.

### Step 1: Requirements

**Functional Requirements**
- CRUD operations for products with rich attributes (name, description, variants, pricing, images)
- Full-text search with faceted filtering (category, price range, brand)
- Real-time inventory sync across multiple sales channels
- Bulk product import/update from suppliers
- Product change events for downstream consumers

**Non-Functional Requirements**
- Search latency < 100ms
- Inventory accuracy (strong consistency for stock levels)
- Handle 1M+ products
- Eventual consistency acceptable for catalog updates (search index may lag)
- Event-driven: changes propagate to all consumers within seconds

### Step 2: Back-of-Envelope Estimation

```
1M products, average 5 variants each = 5M SKUs
Product record: ~5KB (with all attributes)
Total catalog: 5M * 5KB = 25GB (fits in a single PostgreSQL instance)

Read QPS: 10,000 product views/sec (cacheable)
Write QPS: 100 product updates/sec (inventory updates are higher)
Inventory updates: 1,000/sec during peak (POS transactions)

Search index: 25GB + inverted index overhead = ~50GB (Elasticsearch)
```

### Step 3: High-Level Architecture

```
  Admin/Supplier             Customer              POS System
       |                        |                      |
       v                        v                      v
  +-----------+          +-----------+          +-----------+
  |Catalog    |          |Search     |          |Inventory  |
  |Service    |          |Service    |          |Service    |
  +-----------+          +-----------+          +-----------+
       |                      |                      |
       v                      v                      v
  +-----------+         +------------+         +-----------+
  |PostgreSQL |-------->|Elasticsearch|        |PostgreSQL |
  |(products) | CDC     |(search)     |        |(inventory)|
  +-----------+         +------------+         +-----------+
       |                                             |
       +----------+     +----------------------------+
                  |     |
                  v     v
            +------------------+
            | EventBridge      |
            | (product.updated,|
            |  inventory.      |
            |  changed)        |
            +------------------+
               /      |      \
              v       v       v
          +------+ +------+ +------+
          |SQS   | |SQS   | |SQS   |
          |Search| |Price  | |Noti- |
          |Index | |Sync   | |fier  |
          +------+ +------+ +------+
              |       |        |
          Lambda  Lambda   Lambda
```

### Step 4: Database Design

```
PostgreSQL - Product Catalog:
  Table: products
    id              UUID PRIMARY KEY
    name            VARCHAR(255)
    slug            VARCHAR(255) UNIQUE
    description     TEXT
    brand           VARCHAR(100)
    category_id     UUID REFERENCES categories(id)
    status          VARCHAR -- "active", "draft", "archived"
    attributes      JSONB  -- flexible product attributes
    images          JSONB  -- [{ "url": "s3://...", "alt": "...", "order": 1 }]
    created_at      TIMESTAMP
    updated_at      TIMESTAMP

  Table: product_variants
    id              UUID PRIMARY KEY
    product_id      UUID REFERENCES products(id)
    sku             VARCHAR(50) UNIQUE
    name            VARCHAR(100)  -- "Large, Red"
    price_cents     INT
    cost_cents      INT
    weight_grams    INT
    attributes      JSONB  -- { "size": "L", "color": "Red" }

  Table: categories
    id              UUID
    name            VARCHAR
    parent_id       UUID (self-referencing for hierarchy)
    path            LTREE  -- PostgreSQL ltree for hierarchical queries

PostgreSQL - Inventory (separate DB / service):
  Table: inventory
    id              UUID
    sku             VARCHAR REFERENCES product_variants(sku)
    location_id     UUID    -- warehouse/store
    quantity        INT
    reserved        INT     -- held for pending orders
    available       INT GENERATED ALWAYS AS (quantity - reserved)
    updated_at      TIMESTAMP

  -- Use SELECT ... FOR UPDATE for inventory reservation (pessimistic locking)
  -- Or optimistic locking with version column

Elasticsearch - Search Index:
  Index: products
    Mapping:
      name: text (analyzed for full-text search)
      brand: keyword (for exact match / faceting)
      category_path: keyword
      price: integer (for range queries)
      attributes: nested object
      in_stock: boolean
```

### Step 5: API Design

```
-- Product CRUD:
POST   /api/v1/products                Body: { product data }
GET    /api/v1/products/:id
PUT    /api/v1/products/:id            Body: { updated fields }
DELETE /api/v1/products/:id

-- Search:
GET /api/v1/products/search?q=organic+flower&category=edibles&min_price=10&max_price=50&sort=price_asc&page=1&limit=20
  Response: {
    "products": [...],
    "facets": {
      "categories": [{ "name": "Edibles", "count": 42 }],
      "brands": [{ "name": "BrandX", "count": 15 }],
      "price_ranges": [{ "range": "10-25", "count": 30 }]
    },
    "total": 150,
    "page": 1
  }

-- Inventory:
GET  /api/v1/inventory/:sku?location_id=...
PUT  /api/v1/inventory/:sku/adjust  Body: { "quantity_change": -1, "reason": "sale" }
POST /api/v1/inventory/:sku/reserve Body: { "quantity": 2, "order_id": "..." }

-- Bulk Import:
POST /api/v1/products/bulk-import
  Body: { "s3_url": "s3://imports/products-2024-01.csv" }
  Response: { "job_id": "...", "status": "processing" }
  Status: 202 Accepted
```

### Step 6: Deep Dive

**1. Event-Driven Catalog Sync**

When a product is updated in PostgreSQL:
1. Service publishes `product.updated` event to EventBridge
2. EventBridge rules route to:
   - SQS -> Lambda: update Elasticsearch index
   - SQS -> Lambda: sync to external sales channels
   - SQS -> Lambda: invalidate CDN cache for product page

```
Event schema:
{
  "source": "catalog-service",
  "detail-type": "product.updated",
  "detail": {
    "product_id": "uuid",
    "changes": ["price", "description"],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

This is the exact pattern you build with EventBridge in your Treez work.

**2. Inventory Reservation (Preventing Oversell)**

```
-- Pessimistic locking:
BEGIN;
SELECT quantity, reserved FROM inventory WHERE sku = 'ABC' FOR UPDATE;
-- Check: quantity - reserved >= requested_amount
UPDATE inventory SET reserved = reserved + 2 WHERE sku = 'ABC';
COMMIT;

-- Optimistic locking:
UPDATE inventory
SET reserved = reserved + 2, version = version + 1
WHERE sku = 'ABC' AND version = 5 AND (quantity - reserved) >= 2;
-- If 0 rows affected, someone else updated -> retry
```

**3. Search Index Consistency**

PostgreSQL is the source of truth. Elasticsearch is eventually consistent.
- Use Change Data Capture (CDC) or application-level events to keep ES in sync
- If ES is behind, searches might show stale data (stock shown but actually out of stock)
- Mitigation: check real inventory on product detail page and at checkout (not just search results)

### Step 7: Scaling and Trade-offs

- **Read scaling**: CDN for product pages, Redis cache for product details, Elasticsearch for search
- **Write scaling**: inventory updates are the hottest path. Use write-ahead log pattern or event sourcing.
- **Trade-off**: strong consistency (inventory) vs eventual consistency (search). Inventory MUST be strongly consistent to prevent overselling. Search index can lag by seconds.
- **Trade-off**: denormalized search index (fast queries) vs normalized DB (data integrity). Both, synced via events.
- **Bulk imports**: process asynchronously via S3 -> Lambda -> batch DB writes to avoid blocking the API
