# Chat/Messaging System

## Problem 3: Chat/Messaging System **[SR]**

### Problem Statement
Design a real-time messaging system like Slack or WhatsApp supporting 1:1 chats, group chats, online/offline status, and message delivery guarantees.

### Step 1: Requirements

**Functional Requirements**
- Send and receive messages in real-time (1:1 and group)
- Message persistence and history
- Online/offline presence indicators
- Read receipts (delivered, read)
- Support for multimedia messages (images, files)

**Non-Functional Requirements**
- Real-time delivery (< 100ms for online users)
- Message ordering guaranteed within a conversation
- No message loss (at-least-once delivery)
- Support 50M DAU, 1B messages/day

### Step 2: Back-of-Envelope Estimation

```
1B messages/day = ~12,000 messages/sec
Average message size: 200 bytes
Storage per day: 1B * 200B = 200GB/day
Storage per year: ~73TB

Concurrent WebSocket connections: 50M DAU, ~30% concurrent = 15M connections
Each connection ~10KB memory = 150GB connection state
Need ~150 chat servers (1M connections each, standard limit)
```

### Step 3: High-Level Architecture

```
                       +------------------+
  Client <--WebSocket-->| Chat Server Pool |
  (mobile/              | (stateful WS     |
   web)                 |  connections)    |
                        +------------------+
                         |              |
                    +--------+    +---------+
                    |Message |    |Presence |
                    |Service |    |Service  |
                    +--------+    +---------+
                      |    |          |
                +------+ +------+  +-----+
                |Kafka | | DB   |  |Redis|
                |(msg  | |(msg  |  |(who |
                | fan  | | store|  | is  |
                | out) | |      |  |online)|
                +------+ +------+  +-----+
                            |
                      +----------+
                      |Cassandra |
                      |(messages)|
                      +----------+
```

### Step 4: Database Design

**Choice: Cassandra for messages** -- write-heavy, time-series nature (messages are append-only), partition by conversation_id for locality, handles massive scale.

**Redis for presence** -- ephemeral data, needs sub-ms reads.

```
Cassandra - messages table:
  conversation_id  UUID    -- partition key
  message_id       TIMEUUID -- clustering key (time-ordered)
  sender_id        UUID
  content          TEXT
  content_type     VARCHAR  -- "text", "image", "file"
  media_url        TEXT     -- nullable, S3 pre-signed URL
  created_at       TIMESTAMP
  status           VARCHAR  -- "sent", "delivered", "read"

  PRIMARY KEY (conversation_id, message_id)
  -- All messages for a conversation are co-located
  -- Ordered by time within partition

PostgreSQL - conversations/users:
  Table: users (id, name, avatar_url, last_seen)
  Table: conversations (id, type, created_at)
  Table: conversation_members (conversation_id, user_id, joined_at)

Redis - presence:
  key: "presence:{user_id}"
  value: { "status": "online", "last_active": timestamp, "server_id": "chat-server-3" }
  TTL: 60 seconds (heartbeat refreshes)
```

### Step 5: API Design

```
-- WebSocket connection
WS /ws/chat?token=jwt_token

-- WebSocket messages (bidirectional JSON):

Client -> Server:
  { "type": "send_message", "conversation_id": "...", "content": "Hello", "client_msg_id": "uuid" }
  { "type": "typing", "conversation_id": "..." }
  { "type": "read_receipt", "conversation_id": "...", "message_id": "..." }

Server -> Client:
  { "type": "new_message", "conversation_id": "...", "message": {...} }
  { "type": "delivery_receipt", "client_msg_id": "uuid", "message_id": "server-uuid" }
  { "type": "user_typing", "conversation_id": "...", "user_id": "..." }

-- REST APIs for non-real-time operations:
GET /api/v1/conversations
GET /api/v1/conversations/:id/messages?before=cursor&limit=50
POST /api/v1/conversations  (create group)
POST /api/v1/conversations/:id/members
```

### Step 6: Deep Dive

**1. WebSocket Connection Management**

Each chat server maintains a mapping: user_id -> WebSocket connection. When User A sends a message to User B:
- Chat server looks up which server User B is connected to (from Redis)
- Routes message to that server
- That server pushes to User B's WebSocket

```
User A (Server 1) --> Message Service --> lookup User B's server (Redis)
                                      --> route to Server 3
                                      --> Server 3 pushes to User B's WebSocket
```

**2. Offline Message Handling**

If User B is offline:
- Message is stored in DB with status "sent"
- When User B comes online and connects via WebSocket:
  1. Query for all undelivered messages (status != "delivered")
  2. Push them in order
  3. Update status to "delivered"

**3. Group Chat Fan-out**

For a group of 100 members:
- Write message to Kafka topic partitioned by conversation_id
- Consumer reads and fans out to each member's chat server
- For very large groups (1000+), use a tiered approach: batch notifications

### Step 7: Scaling and Trade-offs

- **Chat server scaling**: add more servers, use service discovery (Redis) to track user-to-server mapping
- **Message ordering**: Kafka partition by conversation_id ensures ordering within a conversation
- **Trade-off**: push (WebSocket) vs pull (polling). Push is better for latency, but requires persistent connections and connection management.
- **Trade-off**: storing messages in Cassandra (write-optimized, scalable) vs PostgreSQL (easier to query, harder to scale writes). Cassandra wins for chat's append-heavy pattern.
- **Media messages**: upload to S3 via pre-signed URL, store S3 key in message record
