# GraphQL

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
