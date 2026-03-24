# WebSockets and Server-Sent Events

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
