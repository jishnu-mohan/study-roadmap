# REST API Design Best Practices

### Resource Naming

REST APIs model resources, not actions. Use nouns (not verbs), plural forms, and nested resources to express relationships.

```
GOOD:
  GET    /users
  GET    /users/123
  GET    /users/123/orders
  GET    /users/123/orders/456
  POST   /users/123/orders

BAD:
  GET    /getUser/123
  POST   /createOrder
  GET    /user/123/fetchAllOrders
```

Guidelines:
- Use lowercase with hyphens for multi-word resources: `/order-items`, not `/orderItems`
- Limit nesting to two levels maximum: `/users/123/orders` is fine; `/users/123/orders/456/items/789/reviews` is too deep -- promote `items` and `reviews` to top-level resources with query filters instead
- Use query parameters for filtering, not new endpoints: `/orders?user_id=123&status=shipped`
- For actions that do not map to CRUD, use a sub-resource noun: `POST /users/123/activation` rather than `POST /users/123/activate`

---

### HTTP Methods and Idempotency

| Method  | Purpose              | Request Body | Idempotent | Safe |
|---------|----------------------|--------------|------------|------|
| GET     | Read resource(s)     | No           | Yes        | Yes  |
| POST    | Create resource      | Yes          | No         | No   |
| PUT     | Full replace         | Yes          | Yes        | No   |
| PATCH   | Partial update       | Yes          | No*        | No   |
| DELETE  | Remove resource      | No           | Yes        | No   |

*PATCH can be made idempotent depending on implementation (e.g., "set name to X" is idempotent; "append item to list" is not).

**Idempotency explained:** Calling the operation N times produces the same result as calling it once. This matters for retries -- if a network timeout occurs, the client can safely retry an idempotent request without side effects.

**PUT vs PATCH:**
- PUT replaces the entire resource. Omitted fields are set to defaults/null.
- PATCH updates only the fields provided. Omitted fields remain unchanged.

```
PUT /users/123
{ "name": "Jishnu", "email": "j@example.com", "role": "sde2" }
-- All fields required; missing fields are reset

PATCH /users/123
{ "role": "senior-sde" }
-- Only role is updated; name and email are untouched
```

---

### HTTP Status Codes

**2xx -- Success:**

| Code | Name         | When to Use                                                     |
|------|--------------|-----------------------------------------------------------------|
| 200  | OK           | Successful GET, PUT, PATCH, or DELETE that returns a body       |
| 201  | Created      | Successful POST that creates a resource. Include Location header|
| 204  | No Content   | Successful DELETE or PUT/PATCH with no response body            |

**3xx -- Redirection:**

| Code | Name              | When to Use                                                  |
|------|-------------------|--------------------------------------------------------------|
| 301  | Moved Permanently | Resource URL has permanently changed. Clients should update. |
| 304  | Not Modified      | Conditional GET -- resource has not changed (ETag/If-None-Match) |

**4xx -- Client Errors:**

| Code | Name                 | When to Use                                                              |
|------|----------------------|--------------------------------------------------------------------------|
| 400  | Bad Request          | Malformed syntax, invalid JSON, missing required fields                  |
| 401  | Unauthorized         | No credentials provided or credentials are invalid (really "unauthenticated") |
| 403  | Forbidden            | Authenticated but lacks permission for the action                        |
| 404  | Not Found            | Resource does not exist. Also use to hide existence from unauthorized users |
| 409  | Conflict             | State conflict: duplicate entry, version mismatch, concurrent edit       |
| 422  | Unprocessable Entity | Syntactically valid JSON but semantically invalid (e.g., negative age)   |
| 429  | Too Many Requests    | Rate limit exceeded. Include Retry-After header.                         |

**5xx -- Server Errors:**

| Code | Name                  | When to Use                                                    |
|------|-----------------------|----------------------------------------------------------------|
| 500  | Internal Server Error | Unexpected server failure. Never leak stack traces to clients. |
| 502  | Bad Gateway           | Upstream service returned invalid response                     |
| 503  | Service Unavailable   | Server temporarily overloaded or under maintenance             |
| 504  | Gateway Timeout       | Upstream service did not respond in time                       |

---

### Pagination

#### Cursor-Based Pagination

The server returns an opaque cursor token that points to the position in the result set. The client passes this cursor to fetch the next page.

**Request:**
```
GET /users?limit=20&cursor=eyJpZCI6MTAwfQ==
```

**Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIwfQ==",
    "has_next": true
  }
}
```

The cursor is typically a base64-encoded representation of the last item's sort key (e.g., `{"id": 120}` or `{"created_at": "2026-03-24T10:00:00Z", "id": 120}` for compound sort).

**Advantages:**
- Consistent results even when rows are inserted or deleted between page requests
- Performs well on large datasets (uses indexed WHERE clause, not OFFSET)
- Ideal for infinite scroll and real-time feeds

**Disadvantages:**
- Cannot jump to an arbitrary page ("show me page 7")
- Cursor is opaque -- clients cannot construct or modify it

**SQL behind the scenes:**
```sql
-- Instead of: SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 100
-- Cursor-based:
SELECT * FROM users WHERE id > 120 ORDER BY id LIMIT 20
```

#### Offset-Based Pagination

Classic approach: specify page number or offset and a limit.

**Request:**
```
GET /users?page=3&per_page=20
-- or equivalently:
GET /users?offset=40&limit=20
```

**Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 3,
    "per_page": 20,
    "total_count": 253,
    "total_pages": 13
  }
}
```

**Advantages:**
- Simple to implement and understand
- Allows jumping directly to any page
- total_count enables UI page controls

**Disadvantages:**
- Inconsistent with concurrent writes: if a row is inserted on page 1, all subsequent pages shift by one -- items can be skipped or duplicated
- Performance degrades on large offsets (database must scan and discard OFFSET rows)

**Recommendation:** Use cursor-based for feeds, timelines, and any dataset with frequent writes. Use offset-based for admin dashboards, search results, or datasets that rarely change.

---

### Filtering, Sorting, and Field Selection

**Filtering via query parameters:**
```
GET /orders?status=active&customer_id=123&created_after=2026-01-01
```

**Sorting:** Prefix with `-` for descending:
```
GET /orders?sort=-created_at,total_amount
-- Primary sort: created_at descending
-- Secondary sort: total_amount ascending
```

**Field selection (sparse fieldsets):** Reduce payload size by requesting only needed fields:
```
GET /users?fields=id,name,email
```

This is especially valuable for mobile clients with bandwidth constraints. GraphQL solves this natively, but REST can support it at the API layer.

---

### Versioning Strategies

| Strategy       | Example                                     | Pros                                  | Cons                                    |
|----------------|---------------------------------------------|---------------------------------------|-----------------------------------------|
| URL Path       | `GET /v1/users`                             | Explicit, easy to test, easy to route | Clutters URL, harder to sunset          |
| Accept Header  | `Accept: application/vnd.myapi.v1+json`     | Clean URLs, follows HTTP semantics    | Harder to test (curl, browser), hidden  |
| Query Param    | `GET /users?version=1`                      | Easy to add                           | Ugly, easily forgotten, caching issues  |

**Recommendation:** URL path versioning (`/v1/`, `/v2/`). It is the most widely adopted, the easiest to reason about, works in every HTTP client without special config, and is trivial to route at the gateway level (e.g., AWS API Gateway stage variables).

**When to version:**
- Breaking changes: removing a field, changing a field type, altering response structure
- Do NOT version for additive changes: new optional fields, new endpoints -- these are backward-compatible

---

### Standardized Error Response Format

Every error should return a consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid fields.",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address.",
        "value": "not-an-email"
      },
      {
        "field": "age",
        "issue": "Must be a positive integer.",
        "value": -5
      }
    ],
    "request_id": "req_abc123xyz",
    "documentation_url": "https://api.example.com/docs/errors#VALIDATION_ERROR"
  }
}
```

Key principles:
- `code` is a machine-readable constant (use for programmatic handling)
- `message` is a human-readable summary
- `details` is an array of specific issues (useful for form validation)
- `request_id` enables correlation with server logs for debugging
- Always return the same shape -- even for 500 errors (just omit `details`)

---

### Idempotency Keys

POST requests are not idempotent by nature. If a client sends a POST to create an order and the response is lost due to a network failure, retrying would create a duplicate order. Idempotency keys solve this.

**Flow:**
1. Client generates a unique key (UUID) and sends it with the request:
   ```
   POST /orders
   Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
   Content-Type: application/json

   { "item_id": "abc", "quantity": 2 }
   ```
2. Server checks if this key has been seen before:
   - **Not seen:** Process the request, store the key + response (in Redis or DB), return the response.
   - **Seen:** Return the stored response without reprocessing.
3. Keys expire after a TTL (e.g., 24 hours).

**Implementation approach with Redis:**
```
-- Pseudocode
key = "idempotency:{idempotency_key}"

existing = redis.GET(key)
if existing:
    return deserialize(existing)  -- cached response

result = process_request(body)
redis.SET(key, serialize(result), EX=86400)  -- 24h TTL
return result
```

**Important considerations:**
- The key must be scoped per client/user to prevent cross-user collisions
- Handle the race condition where two identical requests arrive simultaneously: use Redis SET with NX (set-if-not-exists) or a database unique constraint to ensure only one proceeds
- Stripe popularized this pattern and it is now an industry standard for payment APIs

---

### HATEOAS (Hypermedia as the Engine of Application State)

HATEOAS is a REST constraint where the server includes links in responses that tell the client what actions are available next:

```json
{
  "id": 123,
  "name": "Jishnu",
  "status": "active",
  "_links": {
    "self": { "href": "/users/123" },
    "orders": { "href": "/users/123/orders" },
    "deactivate": { "href": "/users/123/deactivation", "method": "POST" }
  }
}
```

The idea is that clients discover the API dynamically by following links rather than hardcoding URLs.

**Why it is rarely used in practice:**
- Frontend and mobile clients almost always have hardcoded routes and API calls -- they do not dynamically discover endpoints
- It adds significant payload overhead
- Most teams find OpenAPI/Swagger specs more practical for API discoverability
- The theoretical benefit (clients resilient to URL changes) rarely materializes because clients depend on the link relation names, which are just as likely to change as URLs

Know the concept for interviews; do not spend time implementing it unless your API serves truly generic/hypermedia clients.

---
