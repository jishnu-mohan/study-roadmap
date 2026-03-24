# Search

## 14. Search **[SR]**

### What It Is
Full-text search capability that goes beyond database LIKE queries. Built on inverted indexes for fast, relevant text matching.

### How It Works

```
INVERTED INDEX

Documents:
  Doc1: "The quick brown fox"
  Doc2: "The quick blue car"
  Doc3: "A brown dog"

Inverted Index:
  "the"   -> [Doc1, Doc2]
  "quick" -> [Doc1, Doc2]
  "brown" -> [Doc1, Doc3]
  "fox"   -> [Doc1]
  "blue"  -> [Doc2]
  "car"   -> [Doc2]
  "dog"   -> [Doc3]

Query "brown fox" -> intersection of [Doc1, Doc3] and [Doc1] = [Doc1]
```

### Elasticsearch Basics
- **Index**: like a database table, holds documents
- **Document**: a JSON object (a row)
- **Mapping**: schema definition (field types, analyzers)
- **Analyzer**: tokenizer + filters (lowercase, stemming, stop words)
- **Shards**: an index is split into shards for distribution (uses Lucene under the hood)
- **Replicas**: copies of shards for HA and read throughput

### When to Add Search to a Design
- Text search across multiple fields
- Fuzzy matching / typo tolerance
- Faceted search (filter by category, price range, etc.)
- Autocomplete / suggestions
- Log analysis and aggregation

### Key Trade-offs

| Gain | Lose |
|------|------|
| Fast full-text search, relevance scoring | Additional infrastructure to maintain |
| Fuzzy matching, autocomplete | Data must be synced from primary DB (eventual consistency) |
| Aggregations and analytics | Not a primary data store (no ACID) |

### When to Use (Interview Triggers)
- "Users need to search products/content" -- Elasticsearch
- "How to implement autocomplete?" -- search index with prefix queries
- "How to search across millions of documents?" -- inverted index

### Real-World Mapping
- **OpenSearch (AWS)**: managed Elasticsearch-compatible service
- **CloudSearch**: simpler AWS search service (less flexible)
- Typical pattern: PostgreSQL (source of truth) -> Change Data Capture -> OpenSearch (search index)
- In your e-commerce context: product catalog search, inventory search
