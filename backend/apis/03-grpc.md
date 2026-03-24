# gRPC

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
