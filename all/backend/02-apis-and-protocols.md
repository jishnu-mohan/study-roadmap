# APIs and Protocols -- Comprehensive Design Guide

---

## [SR] REST API Design Best Practices

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

## [SR] GraphQL

### Schema Design

GraphQL uses a strongly-typed schema that serves as the contract between client and server.

```graphql
# Scalar types: String, Int, Float, Boolean, ID
# Custom scalars for domain-specific types
scalar DateTime
scalar EmailAddress

# Enums for fixed sets of values
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

# Object types
type User {
  id: ID!
  name: String!
  email: EmailAddress!
  createdAt: DateTime!
  orders(status: OrderStatus, first: Int = 10): [Order!]!
}

type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  status: OrderStatus!
  total: Float!
  createdAt: DateTime!
}

type OrderItem {
  product: Product!
  quantity: Int!
  price: Float!
}

# Input types for mutations (separate from output types)
input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

# Root types
type Query {
  user(id: ID!): User
  users(first: Int = 20, after: String): UserConnection!
  order(id: ID!): Order
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order!
  cancelOrder(id: ID!): Order!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

type Subscription {
  orderStatusChanged(orderId: ID!): Order!
}
```

**Key design principles:**
- Use `!` (non-null) judiciously: required in input, but be cautious in output (a nullable field is easier to evolve than a non-null one that might need to become nullable later)
- Use `Input` types for mutations -- never reuse output types as input
- Use connections pattern for paginated lists (Relay specification)
- Prefer specific mutation names (`createOrder`, `cancelOrder`) over generic CRUD

---

### Resolver Architecture

Resolvers are functions that fetch data for each field in the schema. They receive four arguments:

```typescript
const resolvers = {
  Query: {
    user: async (parent, args, context, info) => {
      // parent: the result of the parent resolver (root for Query)
      // args: { id: "123" }
      // context: shared across all resolvers (auth, DB, dataloaders)
      // info: AST of the query (advanced use)
      return context.db.users.findById(args.id);
    },
  },

  User: {
    // Field-level resolver -- called for each User object
    orders: async (parent, args, context) => {
      // parent is the User object from the parent resolver
      return context.dataloaders.ordersByUserId.load(parent.id);
    },

    // Trivial fields (name, email) do not need explicit resolvers
    // GraphQL uses default resolver: (parent) => parent[fieldName]
  },

  Mutation: {
    createOrder: async (_, args, context) => {
      // Check authentication via context
      if (!context.currentUser) {
        throw new AuthenticationError("Must be logged in");
      }
      return context.services.orders.create(args.input);
    },
  },
};
```

**Context setup (per-request):**
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    currentUser: authenticateRequest(req),  // decode JWT, validate
    db: databaseConnection,
    dataloaders: createDataLoaders(),  // fresh loaders per request
  }),
});
```

---

### The N+1 Problem and DataLoader

**The problem:** When a query fetches a list of users and each user's orders, a naive implementation fires one query for all users, then N individual queries for each user's orders:

```graphql
query {
  users(first: 50) {
    id
    name
    orders {      # This triggers 50 separate DB queries
      id
      total
    }
  }
}
```

```
SQL executed:
  SELECT * FROM users LIMIT 50;                    -- 1 query
  SELECT * FROM orders WHERE user_id = 1;          -- +50 queries
  SELECT * FROM orders WHERE user_id = 2;
  ...
  SELECT * FROM orders WHERE user_id = 50;
-- Total: 51 queries (the "N+1" problem, where N = 50)
```

**The solution -- DataLoader:**

DataLoader batches and deduplicates data fetching within a single request tick.

```typescript
import DataLoader from "dataloader";

// Batch function: receives array of keys, returns array of results
// in the SAME ORDER as the keys
const ordersByUserIdLoader = new DataLoader(async (userIds: string[]) => {
  // Single batched query instead of N individual queries
  const orders = await db.query(
    "SELECT * FROM orders WHERE user_id = ANY($1)",
    [userIds]
  );

  // Group by user_id
  const ordersByUserId = new Map<string, Order[]>();
  for (const order of orders) {
    const existing = ordersByUserId.get(order.userId) || [];
    existing.push(order);
    ordersByUserId.set(order.userId, existing);
  }

  // Return in same order as input keys (critical requirement)
  return userIds.map((id) => ordersByUserId.get(id) || []);
});

// In resolver:
const resolvers = {
  User: {
    orders: (parent, _args, context) => {
      return context.dataloaders.ordersByUserId.load(parent.id);
      // DataLoader collects all .load() calls in the same tick,
      // then calls the batch function ONCE with all collected keys
    },
  },
};
```

```
SQL executed with DataLoader:
  SELECT * FROM users LIMIT 50;                              -- 1 query
  SELECT * FROM orders WHERE user_id = ANY([1,2,...,50]);    -- 1 query
-- Total: 2 queries
```

**Important:** Create new DataLoader instances per request (not globally) to prevent stale cached data from leaking across requests.

---

### GraphQL vs REST Decision Framework

| Factor              | GraphQL                                        | REST                                          |
|----------------------|------------------------------------------------|-----------------------------------------------|
| Over-fetching        | Eliminated -- client specifies exact fields    | Common; fixed response shapes                 |
| Under-fetching       | Eliminated -- single query can span types      | Common; often need multiple round-trips       |
| Caching              | Hard -- POST-based, varies by query            | Easy -- HTTP caching (ETags, Cache-Control)   |
| Tooling              | GraphiQL, Apollo DevTools, codegen             | Mature -- Postman, OpenAPI, curl              |
| Learning curve       | Steeper -- schema, resolvers, batching         | Lower -- most developers know REST            |
| Real-time            | Subscriptions built in                         | Requires separate WebSocket/SSE setup         |
| File uploads         | Not natively supported (workarounds exist)     | Straightforward with multipart/form-data      |
| Error handling       | Always returns 200; errors in response body    | HTTP status codes are semantic and standard   |
| API evolution        | Deprecate fields, add new ones                 | Version entire API (/v1, /v2)                 |
| Type safety          | Intrinsic -- schema is the type system         | Requires OpenAPI spec (optional)              |

**When to choose GraphQL:**
- Multiple clients (web, mobile, third-party) with different data needs
- Complex, deeply nested data relationships
- Rapid frontend iteration without backend changes

**When to choose REST:**
- Simple CRUD APIs
- Heavy reliance on HTTP caching
- File upload/download is a core concern
- Team is small and already proficient with REST

---

### Batching and Caching

**Query Batching:** Multiple GraphQL operations sent in a single HTTP request:
```json
[
  { "query": "query { user(id: \"1\") { name } }" },
  { "query": "query { orders(userId: \"1\") { id } }" }
]
```
The server executes them in parallel and returns an array of responses. Reduces HTTP overhead, especially on mobile.

**Persisted Queries:** Instead of sending the full query string on every request, the client sends a hash:
```
GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123..."}}
```
Benefits: smaller payloads, prevents arbitrary queries (security), enables CDN caching via GET requests.

**CDN Caching Challenges:**
- GraphQL typically uses POST, which CDNs do not cache
- Persisted queries with GET enable CDN caching, but responses vary per query
- Use `@cacheControl` directives to set max-age at the field level
- Consider response-level caching in a reverse proxy keyed on the query hash

---

### Schema Evolution

GraphQL schemas should evolve without breaking existing clients.

**Deprecating fields:**
```graphql
type User {
  name: String! @deprecated(reason: "Use firstName and lastName instead")
  firstName: String!
  lastName: String!
}
```
Deprecated fields remain functional but are hidden from introspection tools. Remove them only after confirming no clients use them (monitor query analytics).

**Safe changes (non-breaking):**
- Adding new fields to existing types
- Adding new types
- Adding optional arguments to existing fields
- Deprecating fields

**Breaking changes (avoid):**
- Removing a field or type
- Changing a field's type
- Making a nullable field non-null
- Adding a required argument to an existing field

**Strategy:** Treat the schema like a public contract. Only add; never remove or change. When a major restructuring is needed, create new types/fields and deprecate old ones.

---

## [SR] gRPC

### Protocol Buffers

gRPC uses Protocol Buffers (protobuf) as its interface definition language and serialization format. Messages are defined in `.proto` files, which are compiled into language-specific code.

```protobuf
syntax = "proto3";

package ecommerce;

// Message definitions
message User {
  string id = 1;           // Field numbers (1, 2, 3) are used in binary encoding
  string name = 2;         // -- never reuse or change field numbers
  string email = 3;
  repeated Order orders = 4;  // repeated = array/list
}

message Order {
  string id = 1;
  string user_id = 2;
  OrderStatus status = 3;
  double total = 4;
  google.protobuf.Timestamp created_at = 5;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;  // proto3 requires 0 as default
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_SHIPPED = 2;
  ORDER_STATUS_DELIVERED = 3;
}

// Service definition
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);   // server streaming
  rpc CreateUser (CreateUserRequest) returns (User);
}

message GetUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}
```

**Code generation:**
```bash
protoc --ts_out=./generated --grpc_out=./generated user.proto
```
This produces typed client stubs and server interfaces in your target language. The generated code handles serialization, deserialization, and transport.

**Why protobuf?**
- Binary format: significantly smaller and faster to parse than JSON
- Strongly typed: schema violations are caught at compile time
- Backward compatible: adding new fields does not break old clients (unknown fields are ignored)

---

### Communication Patterns

| Pattern                   | Description                                                | Example Use Case                              |
|---------------------------|------------------------------------------------------------|-----------------------------------------------|
| Unary                     | Single request, single response (like REST)                | Get user by ID, create order                  |
| Server Streaming          | Single request, stream of responses                        | Real-time stock prices, log tailing           |
| Client Streaming          | Stream of requests, single response                        | File upload in chunks, aggregation            |
| Bidirectional Streaming   | Both sides stream simultaneously                           | Chat, multiplayer game state, live collab     |

```protobuf
service ChatService {
  // Unary
  rpc GetRoom (GetRoomRequest) returns (Room);

  // Server streaming
  rpc StreamMessages (StreamRequest) returns (stream ChatMessage);

  // Client streaming
  rpc UploadFile (stream FileChunk) returns (UploadResponse);

  // Bidirectional streaming
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}
```

---

### When to Use gRPC

**Good fit:**
- Internal microservice-to-microservice communication (behind the API gateway)
- High-throughput, low-latency requirements (protobuf is 5-10x faster to serialize than JSON)
- Polyglot environments (generate clients for Go, Java, Python, TypeScript from one .proto file)
- Streaming use cases (native support, unlike REST)
- Strong contract enforcement between teams

**Not a good fit:**
- Browser-facing APIs (gRPC requires HTTP/2 and browsers cannot make raw gRPC calls -- gRPC-Web exists but adds complexity)
- Simple CRUD APIs where REST is sufficient
- Teams unfamiliar with protobuf tooling
- When human-readable payloads matter for debugging

---

### gRPC vs REST Comparison

| Factor           | gRPC                                       | REST                                     |
|------------------|--------------------------------------------|------------------------------------------|
| Protocol         | HTTP/2 (required)                          | HTTP/1.1 or HTTP/2                       |
| Payload format   | Protocol Buffers (binary)                  | JSON (text), also XML, others            |
| Browser support  | Limited (needs gRPC-Web proxy)             | Native, universal                        |
| Tooling          | protoc, BloomRPC, grpcurl                  | Postman, curl, browsers, OpenAPI         |
| Performance      | High (binary, multiplexed, compressed)     | Moderate (text-based, larger payloads)   |
| Learning curve   | Steeper (proto files, code gen, HTTP/2)    | Low (everyone knows REST)               |
| Streaming        | First-class (4 patterns)                   | Requires WebSocket/SSE bolt-on           |
| Code generation  | Built-in via protoc                        | Optional (OpenAPI codegen)               |
| Use case         | Internal services, high-perf pipelines     | Public APIs, web/mobile backends         |

---

## [SR] WebSockets and Server-Sent Events

### WebSocket

WebSocket provides full-duplex, bidirectional communication over a single long-lived TCP connection.

**Connection lifecycle:**
```
1. Client sends HTTP Upgrade request:
   GET /chat HTTP/1.1
   Host: server.example.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13

2. Server responds with 101 Switching Protocols:
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. Connection is now upgraded -- both sides can send messages freely

4. Either side sends a Close frame to terminate
```

**Client-side example:**
```typescript
const ws = new WebSocket("wss://api.example.com/chat");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ type: "join", room: "general" }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};

ws.onclose = (event) => {
  console.log(`Disconnected: code=${event.code} reason=${event.reason}`);
  // Implement reconnection logic
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

**Use cases:** Chat applications, live collaboration (Google Docs-style), multiplayer gaming, live trading dashboards, real-time notifications.

**Key characteristics:**
- Protocol: `ws://` (unencrypted) or `wss://` (TLS-encrypted)
- Stays open until explicitly closed or connection drops
- Very low overhead per message (2-14 bytes frame header vs hundreds of bytes for HTTP headers)
- Both client and server can initiate messages at any time

---

### Server-Sent Events (SSE)

SSE is a unidirectional protocol where the server pushes events to the client over a standard HTTP connection.

```typescript
// Server (Node.js/Express):
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send events
  const sendEvent = (data: object, eventType?: string) => {
    if (eventType) res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n`);
    res.write(`id: ${Date.now()}\n`);  // for reconnection
    res.write("\n");  // blank line terminates event
  };

  sendEvent({ message: "Connected" }, "init");

  const interval = setInterval(() => {
    sendEvent({ price: Math.random() * 100 }, "stock-update");
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

// Client:
const source = new EventSource("/events");

source.addEventListener("stock-update", (event) => {
  const data = JSON.parse(event.data);
  updateStockPrice(data.price);
});

source.onerror = () => {
  // EventSource automatically reconnects
  // It sends Last-Event-ID header on reconnection
};
```

**Key characteristics:**
- Unidirectional: server to client only
- Uses standard HTTP -- works through proxies, load balancers, firewalls without special configuration
- Automatic reconnection is built into the browser API (with `Last-Event-ID` for resumption)
- Text-based (UTF-8); no binary support
- Simple to implement; no special server infrastructure

**Use cases:** Live news/social feeds, notification streams, progress updates for long-running jobs, live sports scores.

---

### Long Polling

The simplest real-time technique. The client sends a request, and the server holds it open until new data is available (or a timeout occurs), then responds. The client immediately sends a new request.

```
Client                              Server
  |--- GET /updates?since=100 ------->|
  |                                    | (holds request open, waiting...)
  |                                    | (new data arrives after 30s)
  |<-- 200 OK [{id:101, ...}] --------|
  |--- GET /updates?since=101 ------->|  (immediately reconnects)
  |                                    | (holds again...)
```

**Characteristics:**
- Works everywhere (plain HTTP, any browser, any proxy)
- Simpler than WebSocket on the server side
- Wastes resources: each "connection" consumes a server thread/connection slot, and the constant reconnection adds HTTP overhead
- Higher latency than WebSocket (roundtrip for each new message batch)

---

### Comparison: WebSocket vs SSE vs Long Polling

| Factor             | WebSocket                        | SSE                              | Long Polling                    |
|--------------------|----------------------------------|----------------------------------|---------------------------------|
| Direction          | Bidirectional                    | Server to client only            | Server to client (effectively)  |
| Protocol           | ws:// / wss://                   | HTTP                             | HTTP                            |
| Auto-reconnect     | Manual implementation needed     | Built-in                         | Manual implementation needed    |
| Binary data        | Supported                        | Not supported (text only)        | Supported (via response body)   |
| Browser support    | All modern browsers              | All modern (not IE)              | Universal                       |
| Max connections    | No limit (per browser)           | 6 per domain (HTTP/1.1)         | 6 per domain (HTTP/1.1)        |
| Complexity         | Medium                           | Low                              | Low                             |
| Infrastructure     | Needs WS-aware proxies/LBs      | Standard HTTP infrastructure     | Standard HTTP infrastructure    |
| Best for           | Chat, gaming, collaboration      | Feeds, notifications, progress   | Legacy support, simple cases    |

**Decision heuristic:**
- Need bidirectional communication? Use WebSocket.
- Server-to-client only? Use SSE (simpler, auto-reconnect).
- Cannot use either (legacy constraints)? Use Long Polling.

---

### Scaling WebSocket Connections

WebSocket connections are stateful and persistent, which creates challenges at scale.

**Problem 1: Sticky Sessions**
When running multiple server instances behind a load balancer, a WebSocket connection is tied to one specific server. If User A is connected to Server 1 and User B is connected to Server 2, Server 1 cannot directly send a message to User B.

**Solution: Redis Pub/Sub for cross-server messaging**
```
                   +----------+
                   |  Redis   |
                   | Pub/Sub  |
                   +----+-----+
                   /    |     \
              +---+  +--+--+  +---+
              | S1 | | S2  |  | S3 |
              +-+--+ +-+---+  +-+--+
               /|      |  \      |\
            U1  U2    U3  U4   U5 U6
```

When a message is sent to a chat room:
1. Server 1 receives the message from User 1
2. Server 1 publishes to Redis channel `room:general`
3. All servers subscribed to `room:general` receive the message
4. Each server forwards it to its locally connected users in that room

```typescript
// Publish
const redis = new Redis();
redis.publish("room:general", JSON.stringify({
  userId: "u1",
  message: "Hello everyone",
}));

// Subscribe (on each server instance)
const sub = new Redis();
sub.subscribe("room:general");
sub.on("message", (channel, data) => {
  const parsed = JSON.parse(data);
  // Send to all local WebSocket connections in this room
  localConnections.get(channel)?.forEach((ws) => ws.send(data));
});
```

**Problem 2: Connection Management**
- **Heartbeats/Pings:** Send periodic ping frames (every 30s) to detect dead connections. If no pong is received within a timeout, close and clean up.
- **Connection cleanup:** Maintain a registry of active connections. On disconnect (graceful or detected via heartbeat), remove from the registry and unsubscribe from relevant channels.
- **Graceful shutdown:** When deploying a new version, drain existing connections (stop accepting new ones, notify connected clients to reconnect, wait for active connections to close or force-close after timeout).

**Problem 3: Sticky Sessions and Uneven Distribution**
Sticky sessions can cause hotspots (one server has 10,000 connections, another has 100). Mitigation:
- Use connection-count-aware load balancing (least connections algorithm)
- Horizontally scale with consistent hashing
- Consider dedicated WebSocket servers separate from your HTTP API servers

---

## [SR] Authentication and Authorization

### OAuth 2.0 Flows

#### Authorization Code Flow + PKCE

The most secure flow for public clients (SPAs, mobile apps) where a client secret cannot be safely stored.

```
+--------+                                +---------------+
| Client |                                | Authorization |
| (SPA)  |                                |    Server     |
+---+----+                                | (e.g.Cognito) |
    |                                     +-------+-------+
    | 1. Generate code_verifier (random string)   |
    |    code_challenge = SHA256(code_verifier)    |
    |                                              |
    | 2. Redirect to /authorize                    |
    |    ?response_type=code                       |
    |    &client_id=abc                            |
    |    &redirect_uri=https://app.com/callback    |
    |    &code_challenge=xyz                       |
    |    &code_challenge_method=S256               |
    |    &scope=openid profile                     |
    |--------------------------------------------->|
    |                                              |
    | 3. User logs in and consents                 |
    |                                              |
    | 4. Redirect back with authorization code     |
    |<------ /callback?code=AUTH_CODE -------------|
    |                                              |
    | 5. Exchange code for tokens                  |
    |    POST /token                               |
    |    grant_type=authorization_code             |
    |    &code=AUTH_CODE                           |
    |    &code_verifier=ORIGINAL_VERIFIER          |
    |    &client_id=abc                            |
    |    &redirect_uri=https://app.com/callback    |
    |--------------------------------------------->|
    |                                              |
    | 6. Server verifies:                          |
    |    SHA256(code_verifier) == code_challenge    |
    |                                              |
    | 7. Returns access_token + refresh_token      |
    |<---------------------------------------------|
```

**Why PKCE?** Without it, an attacker who intercepts the authorization code (via a malicious app or browser extension) could exchange it for tokens. With PKCE, the attacker would also need the `code_verifier`, which never leaves the client.

#### Client Credentials Flow

For machine-to-machine communication where no user is involved.

```
+--------+                                +---------------+
| Service|                                | Authorization |
|   A    |                                |    Server     |
+---+----+                                +-------+-------+
    |                                              |
    | 1. POST /token                               |
    |    grant_type=client_credentials             |
    |    &client_id=service-a                      |
    |    &client_secret=SECRET                     |
    |    &scope=orders:read                        |
    |--------------------------------------------->|
    |                                              |
    | 2. Returns access_token                      |
    |<---------------------------------------------|
    |                                              |
    | 3. Call Service B with access_token          |
    |    Authorization: Bearer <access_token>      |
    +--------------------------------------------->|
```

No user login, no redirect. The service authenticates itself directly. Use this for backend services, cron jobs, and service-to-service API calls.

#### Flow Comparison

| Flow                      | Use Case                        | Client Type | User Involved | Security Level |
|---------------------------|---------------------------------|-------------|---------------|----------------|
| Authorization Code + PKCE | SPAs, mobile apps, CLIs         | Public      | Yes           | High           |
| Client Credentials        | Service-to-service, cron jobs   | Confidential| No            | High           |
| Implicit (deprecated)     | Was used for SPAs               | Public      | Yes           | Low (no more)  |
| Resource Owner Password   | Legacy; first-party apps only   | Trusted     | Yes           | Low            |

---

### JWT (JSON Web Tokens)

A JWT consists of three base64url-encoded parts separated by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSmlzaG51Iiwicm9sZSI6InNkZTIiLCJpYXQiOjE3MTE0MDAwMDAsImV4cCI6MTcxMTQwMDkwMH0.signature_here

|________ Header ________|.________ Payload ________|.__ Signature __|
```

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload (claims):**
```json
{
  "sub": "user-123",
  "name": "Jishnu",
  "role": "sde2",
  "iat": 1711400000,
  "exp": 1711400900,
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com"
}
```

**Signature:**
```
RS256(
  base64urlEncode(header) + "." + base64urlEncode(payload),
  privateKey
)
```

The signature ensures the token has not been tampered with. The server verifies using the public key (RS256) or shared secret (HS256). Prefer RS256 in distributed systems so that any service can verify tokens using the public key without knowing the signing secret.

#### Access Token vs Refresh Token

| Property       | Access Token                     | Refresh Token                          |
|----------------|----------------------------------|----------------------------------------|
| Purpose        | Authorize API requests           | Obtain new access tokens               |
| Lifetime       | Short (5-15 minutes)             | Long (days to weeks)                   |
| Storage        | Memory (SPA) or httpOnly cookie  | httpOnly, Secure, SameSite cookie      |
| Sent with      | Every API request (Bearer header)| Only to the token endpoint             |
| Revocable      | Not easily (must wait for expiry)| Yes (server-side revocation list)      |

#### Token Rotation

Refresh token rotation prevents stolen refresh tokens from being usable indefinitely:

```
1. Client sends refresh_token_v1 to /token endpoint
2. Server validates refresh_token_v1
3. Server issues:
   - New access_token
   - New refresh_token_v2  (refresh_token_v1 is now invalidated)
4. If refresh_token_v1 is used AGAIN (by an attacker who stole it):
   - Server detects reuse of an already-rotated token
   - Server invalidates the ENTIRE token family (all refresh tokens for this session)
   - User must re-authenticate
```

This is known as **automatic reuse detection**. AWS Cognito supports this natively.

---

### Session-Based vs Token-Based Authentication

| Factor             | Session-Based                          | Token-Based (JWT)                       |
|--------------------|----------------------------------------|-----------------------------------------|
| State storage      | Server-side (session store/DB/Redis)   | Client-side (token contains claims)     |
| Scalability        | Requires shared session store          | Stateless -- any server can verify      |
| Revocation         | Easy (delete session from store)       | Hard (token valid until expiry)         |
| Mobile support     | Awkward (cookies are HTTP-centric)     | Natural (send in Authorization header)  |
| CSRF vulnerability | Yes (if using cookies)                 | No (if token sent via header)           |
| Payload size       | Small cookie (session ID only)         | Larger (JWT contains claims)            |
| Server memory      | Grows with active sessions             | None                                    |
| Cross-domain       | Complex (cookie SameSite, CORS)        | Simple (header-based)                   |

**In practice:** Most modern APIs (especially those used by SPAs and mobile apps) use JWT-based auth. Session-based auth still works well for traditional server-rendered web apps. Hybrid approaches exist: short-lived JWTs for stateless verification, with a server-side allowlist/blocklist for revocation.

---

### RBAC vs ABAC

#### Role-Based Access Control (RBAC)

Permissions are assigned to roles, and users are assigned roles.

```
Roles:
  admin  -> [users:read, users:write, orders:read, orders:write, reports:read]
  editor -> [orders:read, orders:write]
  viewer -> [orders:read]

Users:
  Jishnu -> admin
  Alice  -> editor
  Bob    -> viewer
```

```typescript
// Middleware
function requirePermission(permission: string) {
  return (req, res, next) => {
    const userPermissions = getRolePermissions(req.user.role);
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

app.delete("/users/:id", requirePermission("users:write"), deleteUser);
```

**Pros:** Simple to understand, easy to audit, sufficient for most applications.
**Cons:** Role explosion when permissions become granular; "admin-but-not-for-billing" requires a new role.

#### Attribute-Based Access Control (ABAC)

Policies evaluate attributes of the user, resource, action, and environment.

```
Policy: "Allow if user.department == resource.department AND action == 'read'"
Policy: "Allow if user.clearance_level >= resource.classification_level"
Policy: "Deny if environment.time NOT IN business_hours AND action == 'write'"
```

**Pros:** Extremely flexible, handles complex rules without role explosion, can incorporate context (time, IP, device).
**Cons:** Harder to reason about, difficult to audit ("who can access what?"), more complex to implement.

**When to use each:**
- RBAC: Most applications. Start here. It covers 90% of authorization needs.
- ABAC: When you need context-dependent rules, multi-tenant isolation, or your RBAC roles are proliferating uncontrollably. Common in healthcare, finance, and government systems.

---

### AWS Cognito as Identity Provider

Since Jishnu works with Cognito daily, this is likely to come up in system design discussions.

**User Pools (Authentication):**
- Managed user directory: sign-up, sign-in, password reset, MFA
- Issues JWTs (ID token, access token, refresh token)
- Supports federation with external IdPs (Google, Facebook, SAML, OIDC)
- Hosted UI for quick login page deployment
- Customizable via Lambda triggers:
  - Pre Sign-up: validate/auto-confirm users
  - Pre Token Generation: add custom claims to JWT
  - Post Confirmation: send welcome email, provision resources
  - Custom Message: customize verification emails/SMS
  - Pre Authentication: implement custom validation (IP blocking, etc.)

**Identity Pools (Authorization for AWS resources):**
- Maps authenticated users (from User Pools or external IdPs) to IAM roles
- Provides temporary AWS credentials (STS)
- Use case: allowing a frontend app to upload directly to S3 or access DynamoDB
- Supports unauthenticated (guest) access with a restricted IAM role

**Common architecture with API Gateway:**
```
Client -> Cognito User Pool (login) -> JWT
Client -> API Gateway (JWT in Authorization header)
       -> Cognito Authorizer validates JWT
       -> Lambda / ECS / EC2 backend
```

**API Gateway integration:**
- Cognito Authorizer: built-in, validates JWT against the User Pool, extracts claims
- Custom Lambda Authorizer: when you need additional validation beyond Cognito (check blacklist, verify custom claims, multi-tenant routing)

---

### API Key Authentication

API keys are simple bearer tokens used to identify the calling application (not the user).

```
GET /api/data
X-API-Key: sk_live_abc123xyz789
```

**Characteristics:**
- Simple to implement and use
- Identifies the application, not the user (no user context)
- Cannot be easily scoped to specific permissions (typically all-or-nothing)
- Should be sent via header (`X-API-Key`), never as a query parameter (query params are logged in server access logs, browser history, and proxy logs)

**When to use:**
- Server-to-server communication where OAuth would be overkill
- Rate limiting and usage tracking per client/partner
- Public APIs where you need to identify callers but user-level auth is not required

**When NOT to use:**
- As the sole auth mechanism for user-facing APIs
- For anything requiring fine-grained permissions
- When the key might be exposed (mobile apps, SPAs) -- use OAuth instead

**Best practices:**
- Store keys hashed (like passwords) -- if your database leaks, raw keys are not exposed
- Support key rotation: allow multiple active keys per client with expiration dates
- Prefix keys for easy identification: `sk_live_` for production, `sk_test_` for sandbox

---

## [SR] Rate Limiting

### Algorithms

#### Token Bucket

A bucket holds up to B tokens. Tokens are added at a fixed rate of R tokens per second. Each request consumes one token. If the bucket is empty, the request is rejected.

```
Bucket capacity (B): 10 tokens
Refill rate (R): 2 tokens/second

Time 0s: Bucket has 10 tokens
  -> 6 requests arrive, all allowed. Bucket: 4 tokens
Time 1s: 2 tokens refilled. Bucket: 6 tokens
  -> 8 requests arrive, 6 allowed, 2 rejected. Bucket: 0 tokens
Time 2s: 2 tokens refilled. Bucket: 2 tokens
```

**Characteristics:**
- Allows bursts up to the bucket size (good for APIs with bursty traffic)
- Average rate converges to the refill rate
- Used by AWS API Gateway, Stripe, and most cloud providers
- Most commonly used algorithm in practice

#### Leaky Bucket

Requests enter a queue (bucket). The queue is processed at a fixed rate. If the queue is full, new requests are dropped.

```
Queue capacity: 10
Processing rate: 2 requests/second

Requests enter the queue and are drained at a constant rate,
regardless of how bursty the input is.
```

**Characteristics:**
- Smooths out bursts -- output rate is always constant
- Good for APIs that need a consistent processing rate (e.g., sending emails, writing to a rate-limited downstream)
- Requests may experience queuing delay even when the system is not fully loaded

#### Fixed Window Counter

Divide time into fixed windows (e.g., each minute). Count requests per window. Reject when count exceeds the limit.

```
Window: 60 seconds, Limit: 100 requests

[00:00 - 01:00] -> 100 requests allowed
[01:00 - 02:00] -> counter resets, 100 more allowed

Problem: A burst of 100 requests at 00:59 and 100 at 01:01
         = 200 requests in 2 seconds, even though the limit is 100/min
```

**Characteristics:**
- Simplest to implement (single counter per window)
- The boundary burst problem: 2x the rate limit can pass in a short period at the window boundary
- Acceptable for non-critical rate limiting where simplicity matters

#### Sliding Window Log

Store the timestamp of every request. For each new request, count how many timestamps fall within the last window duration. If count exceeds limit, reject.

```
Window: 60 seconds, Limit: 100

Incoming request at T=125s:
  Count all stored timestamps where timestamp > (125 - 60) = 65s
  If count >= 100, reject
  Otherwise, allow and store timestamp 125s
  Clean up timestamps older than 65s
```

**Characteristics:**
- Most accurate -- no boundary burst issue
- Memory-intensive: stores every request timestamp
- Cleanup overhead: must periodically remove old entries
- Use for critical rate limiting where accuracy justifies the cost

#### Sliding Window Counter

Combines fixed window and sliding window. Uses the weighted count from the previous window plus the current window's count.

```
Window: 60 seconds, Limit: 100
Previous window count: 84
Current window count: 36
Current position in window: 25% through (15 seconds in)

Weighted count = (84 * 0.75) + 36 = 63 + 36 = 99
Next request: 99 < 100 -> ALLOW

If current count were 37:
Weighted count = (84 * 0.75) + 37 = 100 -> REJECT
```

**Characteristics:**
- Smooth rate limiting without the boundary burst problem
- Memory efficient: only two counters (previous window + current window)
- Not perfectly accurate, but very close in practice
- Best balance of accuracy, memory, and complexity

---

### Algorithm Comparison

| Algorithm              | Burst Handling            | Memory       | Accuracy   | Complexity |
|------------------------|---------------------------|-------------|------------|------------|
| Token Bucket           | Allows controlled bursts  | Low (1 counter + timestamp) | Good | Low        |
| Leaky Bucket           | Smooths out bursts        | Low (queue) | Good       | Low        |
| Fixed Window Counter   | 2x burst at boundary      | Very Low    | Poor       | Very Low   |
| Sliding Window Log     | No burst issue            | High        | Excellent  | Medium     |
| Sliding Window Counter | Minimal burst issue       | Low         | Very Good  | Low        |

**Recommendation:** Token Bucket for most API rate limiting (simple, allows reasonable bursts, industry standard). Sliding Window Counter when you need more accuracy without the memory cost of Sliding Window Log.

---

### Distributed Rate Limiting with Redis

In a multi-server deployment, rate limiting must be centralized. Redis is the standard choice due to its atomic operations and low latency.

**Simple approach: INCR + EXPIRE (Fixed Window)**
```
-- Pseudocode
key = "rate_limit:{user_id}:{current_minute}"

count = redis.INCR(key)
if count == 1:
    redis.EXPIRE(key, 60)  -- set TTL on first request

if count > limit:
    return 429 Too Many Requests
```

**Problem:** The INCR and EXPIRE are two separate commands. If the server crashes between them, the key persists forever without a TTL.

**Solution: Lua script for atomicity**
```lua
-- Redis Lua script (executed atomically)
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, window)
end

if current > limit then
    return 0  -- rejected
else
    return 1  -- allowed
end
```

```typescript
// TypeScript usage
const RATE_LIMIT_SCRIPT = `...`;  // Lua script above

async function checkRateLimit(
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const result = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, limit, windowSeconds);

  const currentCount = await redis.get(key);
  return {
    allowed: result === 1,
    remaining: Math.max(0, limit - Number(currentCount)),
  };
}
```

**Token Bucket in Redis (more sophisticated):**
```lua
-- Token Bucket Lua script
local key = KEYS[1]
local capacity = tonumber(ARGV[1])     -- max tokens
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])          -- current timestamp (ms)

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Calculate tokens to add based on elapsed time
local elapsed = (now - last_refill) / 1000
local new_tokens = math.min(capacity, tokens + (elapsed * refill_rate))

if new_tokens >= 1 then
    new_tokens = new_tokens - 1
    redis.call("HMSET", key, "tokens", new_tokens, "last_refill", now)
    redis.call("EXPIRE", key, capacity / refill_rate * 2)  -- auto-cleanup
    return 1  -- allowed
else
    redis.call("HMSET", key, "tokens", new_tokens, "last_refill", now)
    return 0  -- rejected
end
```

---

### Rate Limit Response Headers

When rate limiting is active, include these headers in every response so clients can self-regulate:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100          -- max requests allowed in window
X-RateLimit-Remaining: 57       -- requests remaining in current window
X-RateLimit-Reset: 1711401600   -- Unix timestamp when the window resets

-- On rate limit exceeded:
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711401600
Retry-After: 30                 -- seconds until the client should retry
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit of 100 requests per minute.",
    "retry_after": 30
  }
}
```

**Implementation tip for API Gateway:** AWS API Gateway supports usage plans with throttling (token bucket algorithm). Configure burst limit (bucket size) and rate limit (refill rate) per API key or per Cognito user group. This offloads rate limiting from application code entirely.

---

## Quick Reference: Interview Talking Points

1. **REST vs GraphQL vs gRPC:** REST for public/simple APIs, GraphQL for flexible client-driven queries, gRPC for internal high-performance service mesh.

2. **Auth flow for SPAs:** Authorization Code + PKCE. Never use Implicit flow. Store tokens in memory or httpOnly cookies, never localStorage.

3. **Rate limiting at scale:** Token Bucket in Redis with Lua scripts for atomicity. Return proper headers so clients can back off gracefully.

4. **Real-time communication:** WebSocket for bidirectional, SSE for server-push, Long Polling only as a fallback. Scale WebSocket with Redis Pub/Sub.

5. **Pagination:** Cursor-based for feeds and large/mutable datasets. Offset-based only for small/static datasets or when "jump to page" is required.

6. **Idempotency:** GET, PUT, DELETE are naturally idempotent. POST needs explicit idempotency keys (client-generated UUID, server caches result).

7. **JWT lifecycle:** Short-lived access tokens (15 min) + long-lived refresh tokens with rotation and reuse detection.
