# Low-Level Design Problems

7 LLD problems with full TypeScript implementations. Each problem covers requirements, design patterns, class diagrams, working code, SOLID principles, and extension points.

---

## Problem 1: Parking Lot System **[SR]**

### Requirements
- Multi-floor parking lot with different spot sizes (small, medium, large)
- Support vehicle types: motorcycle, car, truck
- Assign the nearest available spot of appropriate size
- Track entry/exit time and calculate parking fee
- Multiple entry/exit points
- Different pricing strategies (hourly, daily, flat rate)

### Key Design Patterns
- **Strategy Pattern**: for pricing calculation (swap algorithms at runtime)
- **Factory Pattern**: for creating vehicles and parking spots
- **Singleton Pattern**: for the ParkingLot instance (one lot)

### Class Diagram

```
+-------------------+       +-------------------+
|   ParkingLot      |       |   ParkingFloor    |
|-------------------|       |-------------------|
| - floors[]        |1----*>| - floorNumber     |
| - entryPanels[]   |       | - spots[]         |
| - exitPanels[]    |       |-------------------|
|-------------------|       | + getAvailableSpot()|
| + getAvailableSpot()|     +-------------------+
| + parkVehicle()   |              |
| + unparkVehicle() |              | 1
+-------------------+              |
                                   | *
+-------------------+       +-------------------+
|   Vehicle         |       |   ParkingSpot     |
|-------------------|       |-------------------|
| - licensePlate    |       | - id              |
| - type            |       | - size            |
| - size            |       | - isOccupied      |
|-------------------|       | - vehicle?        |
| (interface)       |       |-------------------|
+-------------------+       | + assign(vehicle) |
       ^                    | + release()       |
       |                    +-------------------+
  +---------+
  |Car|Truck|Motorcycle|

+-------------------+       +-------------------+
|   ParkingTicket   |       |<<interface>>      |
|-------------------|       |PricingStrategy    |
| - ticketId        |       |-------------------|
| - vehicle         |       | + calculate(      |
| - spot            |       |     entryTime,    |
| - entryTime       |       |     exitTime): num|
| - exitTime?       |       +-------------------+
| - amount?         |              ^
|-------------------|         +---------+----------+
| + calculateFee()  |         |         |          |
+-------------------+    Hourly    Daily    FlatRate
                         Pricing   Pricing  Pricing
```

### Code Implementation

```typescript
// ============================================================
// Types and Enums
// ============================================================

enum VehicleSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

enum VehicleType {
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  TRUCK = "TRUCK",
}

enum SpotSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

// ============================================================
// Vehicle (Interface + Implementations)
// ============================================================

interface IVehicle {
  licensePlate: string;
  type: VehicleType;
  size: VehicleSize;
}

class Motorcycle implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.MOTORCYCLE;
  size = VehicleSize.SMALL;
}

class Car implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.CAR;
  size = VehicleSize.MEDIUM;
}

class Truck implements IVehicle {
  constructor(public licensePlate: string) {}
  type = VehicleType.TRUCK;
  size = VehicleSize.LARGE;
}

// ============================================================
// Vehicle Factory
// ============================================================

class VehicleFactory {
  static create(type: VehicleType, licensePlate: string): IVehicle {
    switch (type) {
      case VehicleType.MOTORCYCLE:
        return new Motorcycle(licensePlate);
      case VehicleType.CAR:
        return new Car(licensePlate);
      case VehicleType.TRUCK:
        return new Truck(licensePlate);
      default:
        throw new Error(`Unknown vehicle type: ${type}`);
    }
  }
}

// ============================================================
// Parking Spot
// ============================================================

class ParkingSpot {
  private _vehicle: IVehicle | null = null;

  constructor(
    public readonly id: string,
    public readonly size: SpotSize,
    public readonly floorNumber: number
  ) {}

  get isOccupied(): boolean {
    return this._vehicle !== null;
  }

  get vehicle(): IVehicle | null {
    return this._vehicle;
  }

  canFit(vehicleSize: VehicleSize): boolean {
    const sizeOrder: Record<string, number> = {
      SMALL: 1,
      MEDIUM: 2,
      LARGE: 3,
    };
    return sizeOrder[this.size] >= sizeOrder[vehicleSize];
  }

  assign(vehicle: IVehicle): void {
    if (this._vehicle) {
      throw new Error(`Spot ${this.id} is already occupied`);
    }
    this._vehicle = vehicle;
  }

  release(): IVehicle | null {
    const vehicle = this._vehicle;
    this._vehicle = null;
    return vehicle;
  }
}

// ============================================================
// Pricing Strategy (Strategy Pattern)
// ============================================================

interface IPricingStrategy {
  calculate(entryTime: Date, exitTime: Date): number;
}

class HourlyPricing implements IPricingStrategy {
  constructor(private ratePerHour: number) {}

  calculate(entryTime: Date, exitTime: Date): number {
    const hours = Math.ceil(
      (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
    );
    return hours * this.ratePerHour;
  }
}

class DailyPricing implements IPricingStrategy {
  constructor(private ratePerDay: number) {}

  calculate(entryTime: Date, exitTime: Date): number {
    const days = Math.ceil(
      (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days * this.ratePerDay;
  }
}

class FlatRatePricing implements IPricingStrategy {
  constructor(private flatRate: number) {}

  calculate(_entryTime: Date, _exitTime: Date): number {
    return this.flatRate;
  }
}

// ============================================================
// Parking Ticket
// ============================================================

class ParkingTicket {
  public exitTime: Date | null = null;
  public amount: number | null = null;

  constructor(
    public readonly ticketId: string,
    public readonly vehicle: IVehicle,
    public readonly spot: ParkingSpot,
    public readonly entryTime: Date,
    private pricingStrategy: IPricingStrategy
  ) {}

  calculateFee(exitTime: Date): number {
    this.exitTime = exitTime;
    this.amount = this.pricingStrategy.calculate(this.entryTime, exitTime);
    return this.amount;
  }
}

// ============================================================
// Parking Floor
// ============================================================

class ParkingFloor {
  private spots: ParkingSpot[] = [];

  constructor(public readonly floorNumber: number) {}

  addSpot(spot: ParkingSpot): void {
    this.spots.push(spot);
  }

  getAvailableSpot(vehicleSize: VehicleSize): ParkingSpot | null {
    for (const spot of this.spots) {
      if (!spot.isOccupied && spot.canFit(vehicleSize)) {
        return spot;
      }
    }
    return null;
  }

  get availableSpotCount(): number {
    return this.spots.filter((s) => !s.isOccupied).length;
  }

  get totalSpotCount(): number {
    return this.spots.length;
  }
}

// ============================================================
// Parking Lot (Singleton)
// ============================================================

class ParkingLot {
  private static instance: ParkingLot;
  private floors: ParkingFloor[] = [];
  private activeTickets: Map<string, ParkingTicket> = new Map(); // licensePlate -> ticket
  private pricingStrategy: IPricingStrategy;
  private ticketCounter = 0;

  private constructor(pricingStrategy: IPricingStrategy) {
    this.pricingStrategy = pricingStrategy;
  }

  static getInstance(pricingStrategy?: IPricingStrategy): ParkingLot {
    if (!ParkingLot.instance) {
      if (!pricingStrategy) {
        throw new Error("Pricing strategy required for first initialization");
      }
      ParkingLot.instance = new ParkingLot(pricingStrategy);
    }
    return ParkingLot.instance;
  }

  // For testing: reset the singleton
  static resetInstance(): void {
    ParkingLot.instance = null as unknown as ParkingLot;
  }

  setPricingStrategy(strategy: IPricingStrategy): void {
    this.pricingStrategy = strategy;
  }

  addFloor(floor: ParkingFloor): void {
    this.floors.push(floor);
  }

  parkVehicle(vehicle: IVehicle): ParkingTicket {
    if (this.activeTickets.has(vehicle.licensePlate)) {
      throw new Error(`Vehicle ${vehicle.licensePlate} is already parked`);
    }

    for (const floor of this.floors) {
      const spot = floor.getAvailableSpot(vehicle.size);
      if (spot) {
        spot.assign(vehicle);
        const ticket = new ParkingTicket(
          `T-${++this.ticketCounter}`,
          vehicle,
          spot,
          new Date(),
          this.pricingStrategy
        );
        this.activeTickets.set(vehicle.licensePlate, ticket);
        return ticket;
      }
    }

    throw new Error("No available spot for this vehicle");
  }

  unparkVehicle(licensePlate: string): ParkingTicket {
    const ticket = this.activeTickets.get(licensePlate);
    if (!ticket) {
      throw new Error(`No active ticket for vehicle ${licensePlate}`);
    }

    ticket.calculateFee(new Date());
    ticket.spot.release();
    this.activeTickets.delete(licensePlate);
    return ticket;
  }

  getAvailability(): { floor: number; available: number; total: number }[] {
    return this.floors.map((f) => ({
      floor: f.floorNumber,
      available: f.availableSpotCount,
      total: f.totalSpotCount,
    }));
  }
}

// ============================================================
// Example Usage
// ============================================================

ParkingLot.resetInstance();
const lot = ParkingLot.getInstance(new HourlyPricing(5)); // $5/hour

// Add floors with spots
const floor1 = new ParkingFloor(1);
floor1.addSpot(new ParkingSpot("1-S1", SpotSize.SMALL, 1));
floor1.addSpot(new ParkingSpot("1-M1", SpotSize.MEDIUM, 1));
floor1.addSpot(new ParkingSpot("1-M2", SpotSize.MEDIUM, 1));
floor1.addSpot(new ParkingSpot("1-L1", SpotSize.LARGE, 1));
lot.addFloor(floor1);

// Park vehicles
const car = VehicleFactory.create(VehicleType.CAR, "ABC-123");
const ticket = lot.parkVehicle(car);
console.log(`Parked ${car.licensePlate} at spot ${ticket.spot.id}`);

console.log("Availability:", lot.getAvailability());

// Unpark and pay
const completedTicket = lot.unparkVehicle("ABC-123");
console.log(`Fee: $${completedTicket.amount}`);

// Switch pricing strategy at runtime
lot.setPricingStrategy(new DailyPricing(20)); // $20/day
```

### SOLID Principles Applied
- **S (Single Responsibility)**: Each class has one job -- ParkingSpot manages spot state, PricingStrategy handles pricing, ParkingFloor manages a collection of spots.
- **O (Open/Closed)**: New pricing strategies can be added without modifying existing code. Just implement IPricingStrategy.
- **L (Liskov Substitution)**: Any vehicle subclass (Car, Truck, Motorcycle) can be used wherever IVehicle is expected.
- **I (Interface Segregation)**: IPricingStrategy has a single method. IVehicle has only the properties needed.
- **D (Dependency Inversion)**: ParkingTicket depends on IPricingStrategy (abstraction), not HourlyPricing (concrete).

### Extension Points
- **New vehicle types**: implement IVehicle, add to VehicleFactory
- **New pricing models**: implement IPricingStrategy (e.g., weekend pricing, first-hour-free)
- **Electric vehicle spots**: subclass ParkingSpot with a hasCharger property
- **Reservation system**: add a ReservationService that pre-assigns spots
- **Multiple entry/exit points**: add EntryPanel and ExitPanel classes that delegate to ParkingLot

---

## Problem 2: LRU Cache **[SR]**

### Requirements
- Get and Put operations in O(1) time
- Fixed capacity -- evict least recently used entry when full
- Get operation marks the entry as recently used
- Support generic key-value types

### Key Design Patterns
- **Doubly-linked list + HashMap**: the classic combination for O(1) LRU
- The list maintains access order; the map provides O(1) key lookup

### Class Diagram

```
+-------------------+
|   LRUCache<K,V>   |
|-------------------|
| - capacity        |
| - map: Map<K,Node>|
| - head: Node      | (most recent)
| - tail: Node      | (least recent)
|-------------------|
| + get(key): V?    |
| + put(key, val)   |
| - moveToHead(node)|
| - removeTail()    |
| - addToHead(node) |
| - removeNode(node)|
+-------------------+
         |
         | uses
         v
+-------------------+
| DoublyLinkedNode  |
|-------------------|
| - key: K          |
| - value: V        |
| - prev: Node?     |
| - next: Node?     |
+-------------------+

  head <-> [A] <-> [B] <-> [C] <-> tail
  (MRU)                        (LRU)

  get(B): move B to head
  head <-> [B] <-> [A] <-> [C] <-> tail

  put(D) when full: remove C (tail), add D at head
  head <-> [D] <-> [B] <-> [A] <-> tail
```

### Code Implementation

```typescript
// ============================================================
// Doubly-Linked List Node
// ============================================================

class DLLNode<K, V> {
  key: K;
  value: V;
  prev: DLLNode<K, V> | null = null;
  next: DLLNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

// ============================================================
// LRU Cache
// ============================================================

class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, DLLNode<K, V>>;
  private head: DLLNode<K, V>; // sentinel -- most recently used side
  private tail: DLLNode<K, V>; // sentinel -- least recently used side

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be positive");
    }
    this.capacity = capacity;
    this.map = new Map();

    // Sentinel nodes simplify edge cases (no null checks needed)
    this.head = new DLLNode<K, V>(null as unknown as K, null as unknown as V);
    this.tail = new DLLNode<K, V>(null as unknown as K, null as unknown as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    // Move to head (mark as recently used)
    this.removeNode(node);
    this.addToHead(node);

    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);

    if (existing) {
      // Update value and move to head
      existing.value = value;
      this.removeNode(existing);
      this.addToHead(existing);
      return;
    }

    // Create new node
    const newNode = new DLLNode(key, value);
    this.map.set(key, newNode);
    this.addToHead(newNode);

    // Evict if over capacity
    if (this.map.size > this.capacity) {
      const evicted = this.removeTail();
      if (evicted) {
        this.map.delete(evicted.key);
      }
    }
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) {
      return false;
    }
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  get size(): number {
    return this.map.size;
  }

  // -- Private helper methods --

  private addToHead(node: DLLNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: DLLNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = null;
    node.next = null;
  }

  private removeTail(): DLLNode<K, V> | null {
    const node = this.tail.prev;
    if (node === this.head) {
      return null; // empty list
    }
    this.removeNode(node!);
    return node;
  }

  // For debugging: return entries in MRU -> LRU order
  toArray(): Array<{ key: K; value: V }> {
    const result: Array<{ key: K; value: V }> = [];
    let current = this.head.next;
    while (current && current !== this.tail) {
      result.push({ key: current.key, value: current.value });
      current = current.next;
    }
    return result;
  }
}

// ============================================================
// Example Usage
// ============================================================

const cache = new LRUCache<string, number>(3);

cache.put("a", 1);
cache.put("b", 2);
cache.put("c", 3);
console.log(cache.toArray()); // [{c,3}, {b,2}, {a,1}]

cache.get("a"); // Access "a", moves to front
console.log(cache.toArray()); // [{a,1}, {c,3}, {b,2}]

cache.put("d", 4); // Evicts "b" (LRU)
console.log(cache.toArray()); // [{d,4}, {a,1}, {c,3}]

console.log(cache.get("b")); // undefined (evicted)
console.log(cache.get("c")); // 3
```

### SOLID Principles Applied
- **S**: LRUCache handles caching logic, DLLNode is purely a data container.
- **O**: Could extend with TTL support by subclassing or decorating without modifying the core.
- **L**: Generic types K/V mean the cache works with any data type.
- **D**: The cache does not depend on any specific storage mechanism -- it uses the standard Map interface.

### Extension Points
- **TTL support**: add an `expiresAt` field to DLLNode, check on get(), background cleanup job
- **LFU variant**: replace doubly-linked list with frequency buckets (each frequency has its own list)
- **Thread-safe version**: wrap operations in a mutex (for multi-threaded runtimes)
- **Metrics**: add hit/miss counters, eviction count, hit rate calculation
- **Max memory size**: evict based on total memory used rather than entry count

---

## Problem 3: Rate Limiter **[SR]**

### Requirements
- Support multiple rate limiting algorithms (token bucket, sliding window)
- Configure limits per client/key
- Return whether a request is allowed
- Track remaining tokens/requests
- Thread-safe (atomic operations)

### Key Design Patterns
- **Strategy Pattern**: swap rate limiting algorithms at runtime
- **Factory Pattern**: create the right limiter based on configuration

### Class Diagram

```
+-------------------+       +------------------------+
| RateLimiterManager|       |<<interface>>           |
|-------------------|       | IRateLimitAlgorithm    |
| - limiters: Map   |       |------------------------|
|-------------------|       | + tryAcquire(key): bool |
| + isAllowed(key)  |       | + getRemainingTokens() |
| + configure(...)  |       +------------------------+
+-------------------+              ^          ^
         |                         |          |
         | uses                    |          |
         v                         |          |
+-------------------+    +-----------+  +-------------+
| RateLimitResult   |    |TokenBucket|  |SlidingWindow|
|-------------------|    |Algorithm  |  |Algorithm    |
| - allowed: bool   |    +-----------+  +-------------+
| - remaining: num  |
| - retryAfter: num |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Rate Limit Result
// ============================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // 0 if allowed
  limit: number;
}

// ============================================================
// Rate Limit Algorithm Interface (Strategy Pattern)
// ============================================================

interface IRateLimitAlgorithm {
  tryAcquire(key: string): RateLimitResult;
  reset(key: string): void;
}

// ============================================================
// Token Bucket Algorithm
// ============================================================

interface TokenBucketState {
  tokens: number;
  lastRefillTime: number; // ms since epoch
}

class TokenBucketAlgorithm implements IRateLimitAlgorithm {
  private buckets: Map<string, TokenBucketState> = new Map();

  constructor(
    private maxTokens: number,       // bucket capacity
    private refillRate: number,      // tokens per second
    private refillInterval: number = 1000 // ms between refills
  ) {}

  tryAcquire(key: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefillTime: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefillTime;
    const tokensToAdd = Math.floor(
      (elapsedMs / this.refillInterval) * this.refillRate
    );

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    }

    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
        limit: this.maxTokens,
      };
    }

    // No tokens available
    const msUntilNextToken =
      this.refillInterval / this.refillRate -
      (now - bucket.lastRefillTime);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, Math.ceil(msUntilNextToken)),
      limit: this.maxTokens,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

// ============================================================
// Sliding Window Counter Algorithm
// ============================================================

interface SlidingWindowState {
  currentCount: number;
  previousCount: number;
  currentWindowStart: number; // ms since epoch
}

class SlidingWindowAlgorithm implements IRateLimitAlgorithm {
  private windows: Map<string, SlidingWindowState> = new Map();

  constructor(
    private maxRequests: number,    // max requests per window
    private windowSizeMs: number    // window size in milliseconds
  ) {}

  tryAcquire(key: string): RateLimitResult {
    const now = Date.now();
    let state = this.windows.get(key);

    if (!state) {
      state = {
        currentCount: 0,
        previousCount: 0,
        currentWindowStart: this.getWindowStart(now),
      };
      this.windows.set(key, state);
    }

    // Check if we need to advance the window
    const currentWindowStart = this.getWindowStart(now);

    if (currentWindowStart > state.currentWindowStart + this.windowSizeMs) {
      // We are two or more windows ahead -- reset both
      state.previousCount = 0;
      state.currentCount = 0;
      state.currentWindowStart = currentWindowStart;
    } else if (currentWindowStart > state.currentWindowStart) {
      // We are in the next window
      state.previousCount = state.currentCount;
      state.currentCount = 0;
      state.currentWindowStart = currentWindowStart;
    }

    // Calculate weighted count using sliding window
    const elapsedInCurrentWindow = now - state.currentWindowStart;
    const previousWindowWeight =
      1 - elapsedInCurrentWindow / this.windowSizeMs;

    const estimatedCount =
      state.currentCount + Math.floor(state.previousCount * previousWindowWeight);

    if (estimatedCount < this.maxRequests) {
      state.currentCount += 1;
      return {
        allowed: true,
        remaining: this.maxRequests - estimatedCount - 1,
        retryAfterMs: 0,
        limit: this.maxRequests,
      };
    }

    // Rate limited
    const retryAfterMs = this.windowSizeMs - elapsedInCurrentWindow;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.ceil(retryAfterMs),
      limit: this.maxRequests,
    };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private getWindowStart(timestampMs: number): number {
    return Math.floor(timestampMs / this.windowSizeMs) * this.windowSizeMs;
  }
}

// ============================================================
// Rate Limiter Factory
// ============================================================

type AlgorithmType = "token_bucket" | "sliding_window";

interface RateLimiterConfig {
  algorithm: AlgorithmType;
  maxRequests: number;         // max tokens or max requests per window
  windowSizeMs?: number;       // for sliding window (default 60000 = 1 min)
  refillRate?: number;         // for token bucket (tokens per second)
}

class RateLimiterFactory {
  static create(config: RateLimiterConfig): IRateLimitAlgorithm {
    switch (config.algorithm) {
      case "token_bucket":
        return new TokenBucketAlgorithm(
          config.maxRequests,
          config.refillRate ?? config.maxRequests / 60 // default: refill to max in 60s
        );
      case "sliding_window":
        return new SlidingWindowAlgorithm(
          config.maxRequests,
          config.windowSizeMs ?? 60_000
        );
      default:
        throw new Error(`Unknown algorithm: ${config.algorithm}`);
    }
  }
}

// ============================================================
// Rate Limiter Manager (Facade)
// ============================================================

class RateLimiterManager {
  private limiters: Map<string, IRateLimitAlgorithm> = new Map();
  private defaultLimiter: IRateLimitAlgorithm;

  constructor(defaultConfig: RateLimiterConfig) {
    this.defaultLimiter = RateLimiterFactory.create(defaultConfig);
  }

  configureEndpoint(endpoint: string, config: RateLimiterConfig): void {
    this.limiters.set(endpoint, RateLimiterFactory.create(config));
  }

  isAllowed(key: string, endpoint?: string): RateLimitResult {
    const limiter = endpoint
      ? this.limiters.get(endpoint) ?? this.defaultLimiter
      : this.defaultLimiter;

    return limiter.tryAcquire(key);
  }
}

// ============================================================
// Example Usage
// ============================================================

// Token bucket: 10 requests max, refills 2 per second
const manager = new RateLimiterManager({
  algorithm: "token_bucket",
  maxRequests: 10,
  refillRate: 2,
});

// Specific endpoint with sliding window: 5 requests per 10 seconds
manager.configureEndpoint("/api/expensive", {
  algorithm: "sliding_window",
  maxRequests: 5,
  windowSizeMs: 10_000,
});

// Simulate requests
const clientKey = "user-123";

for (let i = 0; i < 12; i++) {
  const result = manager.isAllowed(clientKey);
  console.log(
    `Request ${i + 1}: ${result.allowed ? "ALLOWED" : "BLOCKED"} ` +
    `(remaining: ${result.remaining})`
  );
}

// Check specific endpoint
const expensiveResult = manager.isAllowed(clientKey, "/api/expensive");
console.log(`Expensive endpoint: ${expensiveResult.allowed ? "ALLOWED" : "BLOCKED"}`);
```

### SOLID Principles Applied
- **S**: Each algorithm class handles only its own logic. The manager handles routing.
- **O**: New algorithms (leaky bucket, fixed window) can be added by implementing IRateLimitAlgorithm -- no existing code changes.
- **L**: Any IRateLimitAlgorithm implementation can be swapped in anywhere an algorithm is expected.
- **I**: IRateLimitAlgorithm is minimal -- just tryAcquire and reset.
- **D**: RateLimiterManager depends on IRateLimitAlgorithm (abstraction), not on concrete algorithm classes.

### Extension Points
- **Redis-backed**: replace in-memory Maps with Redis commands (INCR, EXPIRE, Lua scripts) for distributed rate limiting
- **Leaky bucket algorithm**: implement IRateLimitAlgorithm with a fixed-rate output queue
- **Weighted requests**: some endpoints cost more tokens than others (e.g., search costs 5 tokens, profile view costs 1)
- **Dynamic configuration**: load limits from a config service, hot-reload without restart
- **Metrics**: track allowed/blocked counts per key for monitoring dashboards

---

## Problem 4: Task Scheduler **[SR]**

### Requirements
- Schedule tasks for immediate or delayed execution
- Priority-based processing (higher priority runs first)
- Retry failed tasks with configurable backoff
- Register task handlers for different task types
- Cancel pending tasks

### Key Design Patterns
- **Observer Pattern**: notify listeners on task state changes
- **Strategy Pattern**: different retry strategies
- **Priority Queue**: for task ordering

### Class Diagram

```
+-------------------+       +-------------------+
| TaskScheduler     |       |<<interface>>      |
|-------------------|       | ITaskHandler      |
| - queue: PriorityQ|       |-------------------|
| - handlers: Map   |       | + handle(task)    |
| - listeners: []   |       +-------------------+
|-------------------|              ^
| + schedule(task)  |              |
| + cancel(taskId)  |         Concrete handlers
| + registerHandler()|         (EmailHandler,
| + start()         |          ReportHandler,
| + stop()          |          etc.)
+-------------------+
         |
         | manages
         v
+-------------------+       +-------------------+
| Task              |       |<<interface>>      |
|-------------------|       | IRetryStrategy    |
| - id              |       |-------------------|
| - type            |       | + getDelay(attempt)|
| - payload         |       | + shouldRetry()   |
| - priority        |       +-------------------+
| - status          |              ^
| - scheduledAt     |         +---------+----------+
| - retryCount      |         |         |          |
+-------------------+    Exponential  Fixed    NoRetry
                         Backoff      Delay
```

### Code Implementation

```typescript
// ============================================================
// Types and Enums
// ============================================================

enum TaskStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  DEAD_LETTER = "DEAD_LETTER",
}

enum TaskPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

interface TaskDefinition {
  type: string;
  payload: Record<string, unknown>;
  priority?: TaskPriority;
  delayMs?: number;
  maxRetries?: number;
}

// ============================================================
// Task
// ============================================================

class Task {
  public readonly id: string;
  public readonly type: string;
  public readonly payload: Record<string, unknown>;
  public readonly priority: TaskPriority;
  public readonly createdAt: Date;
  public readonly scheduledAt: Date;
  public readonly maxRetries: number;

  public status: TaskStatus = TaskStatus.PENDING;
  public retryCount: number = 0;
  public lastError: string | null = null;
  public startedAt: Date | null = null;
  public completedAt: Date | null = null;

  constructor(definition: TaskDefinition) {
    this.id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.type = definition.type;
    this.payload = definition.payload;
    this.priority = definition.priority ?? TaskPriority.NORMAL;
    this.createdAt = new Date();
    this.scheduledAt = new Date(Date.now() + (definition.delayMs ?? 0));
    this.maxRetries = definition.maxRetries ?? 3;
  }

  get isReady(): boolean {
    return (
      this.status === TaskStatus.PENDING &&
      new Date() >= this.scheduledAt
    );
  }
}

// ============================================================
// Priority Queue (Min-Heap by priority then scheduledAt)
// ============================================================

class TaskPriorityQueue {
  private heap: Task[] = [];

  enqueue(task: Task): void {
    this.heap.push(task);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): Task | null {
    if (this.heap.length === 0) return null;

    const top = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  peek(): Task | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  remove(taskId: string): boolean {
    const index = this.heap.findIndex((t) => t.id === taskId);
    if (index === -1) return false;

    const last = this.heap.pop()!;
    if (index < this.heap.length) {
      this.heap[index] = last;
      this.bubbleUp(index);
      this.bubbleDown(index);
    }
    return true;
  }

  get size(): number {
    return this.heap.length;
  }

  private compare(a: Task, b: Task): number {
    // Lower priority number = higher priority
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Earlier scheduled time wins
    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
      [this.heap[index], this.heap[parentIndex]] = [
        this.heap[parentIndex],
        this.heap[index],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

// ============================================================
// Retry Strategy (Strategy Pattern)
// ============================================================

interface IRetryStrategy {
  shouldRetry(task: Task): boolean;
  getDelayMs(attempt: number): number;
}

class ExponentialBackoffRetry implements IRetryStrategy {
  constructor(
    private baseDelayMs: number = 1000,
    private maxDelayMs: number = 30000
  ) {}

  shouldRetry(task: Task): boolean {
    return task.retryCount < task.maxRetries;
  }

  getDelayMs(attempt: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(delay + jitter, this.maxDelayMs);
  }
}

class FixedDelayRetry implements IRetryStrategy {
  constructor(private delayMs: number = 5000) {}

  shouldRetry(task: Task): boolean {
    return task.retryCount < task.maxRetries;
  }

  getDelayMs(_attempt: number): number {
    return this.delayMs;
  }
}

class NoRetry implements IRetryStrategy {
  shouldRetry(_task: Task): boolean {
    return false;
  }

  getDelayMs(_attempt: number): number {
    return 0;
  }
}

// ============================================================
// Task Handler Interface
// ============================================================

interface ITaskHandler {
  handle(task: Task): Promise<void>;
}

// ============================================================
// Task Event Listener (Observer Pattern)
// ============================================================

type TaskEvent = "scheduled" | "started" | "completed" | "failed" | "cancelled" | "dead_letter";

interface ITaskEventListener {
  onTaskEvent(event: TaskEvent, task: Task): void;
}

// ============================================================
// Task Scheduler
// ============================================================

class TaskScheduler {
  private queue: TaskPriorityQueue = new TaskPriorityQueue();
  private handlers: Map<string, ITaskHandler> = new Map();
  private retryStrategy: IRetryStrategy;
  private listeners: ITaskEventListener[] = [];
  private taskMap: Map<string, Task> = new Map();
  private running: boolean = false;
  private pollIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    retryStrategy: IRetryStrategy = new ExponentialBackoffRetry(),
    pollIntervalMs: number = 100
  ) {
    this.retryStrategy = retryStrategy;
    this.pollIntervalMs = pollIntervalMs;
  }

  registerHandler(taskType: string, handler: ITaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  addListener(listener: ITaskEventListener): void {
    this.listeners.push(listener);
  }

  schedule(definition: TaskDefinition): Task {
    const task = new Task(definition);
    task.status = TaskStatus.SCHEDULED;
    this.taskMap.set(task.id, task);
    this.queue.enqueue(task);
    this.emit("scheduled", task);
    return task;
  }

  cancel(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task || task.status === TaskStatus.RUNNING) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    this.queue.remove(taskId);
    this.emit("cancelled", task);
    return true;
  }

  getTask(taskId: string): Task | undefined {
    return this.taskMap.get(taskId);
  }

  start(): void {
    this.running = true;
    this.timer = setInterval(() => this.processNext(), this.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processNext(): Promise<void> {
    const task = this.queue.peek();
    if (!task || !task.isReady) return;

    this.queue.dequeue();

    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = TaskStatus.FAILED;
      task.lastError = `No handler registered for task type: ${task.type}`;
      this.emit("failed", task);
      return;
    }

    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this.emit("started", task);

    try {
      await handler.handle(task);
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      this.emit("completed", task);
    } catch (error) {
      task.lastError = error instanceof Error ? error.message : String(error);
      task.retryCount += 1;

      if (this.retryStrategy.shouldRetry(task)) {
        // Re-schedule with delay
        const delayMs = this.retryStrategy.getDelayMs(task.retryCount);
        task.status = TaskStatus.PENDING;
        (task as { scheduledAt: Date }).scheduledAt = new Date(Date.now() + delayMs);
        this.queue.enqueue(task);
        this.emit("failed", task);
      } else {
        // Move to dead letter
        task.status = TaskStatus.DEAD_LETTER;
        this.emit("dead_letter", task);
      }
    }
  }

  private emit(event: TaskEvent, task: Task): void {
    for (const listener of this.listeners) {
      listener.onTaskEvent(event, task);
    }
  }
}

// ============================================================
// Example: Concrete Handler and Listener
// ============================================================

class EmailTaskHandler implements ITaskHandler {
  async handle(task: Task): Promise<void> {
    const { to, subject, body } = task.payload as {
      to: string;
      subject: string;
      body: string;
    };

    // Simulate sending email (could fail)
    if (Math.random() < 0.3) {
      throw new Error("SMTP connection timeout");
    }

    console.log(`Email sent to ${to}: "${subject}"`);
  }
}

class LoggingListener implements ITaskEventListener {
  onTaskEvent(event: TaskEvent, task: Task): void {
    const retryInfo =
      task.retryCount > 0 ? ` (retry ${task.retryCount}/${task.maxRetries})` : "";
    console.log(
      `[${event.toUpperCase()}] Task ${task.id} (${task.type})${retryInfo}` +
      (task.lastError ? ` -- error: ${task.lastError}` : "")
    );
  }
}

// ============================================================
// Example Usage
// ============================================================

const scheduler = new TaskScheduler(new ExponentialBackoffRetry(500, 10000));

scheduler.registerHandler("send_email", new EmailTaskHandler());
scheduler.addListener(new LoggingListener());

// Schedule immediate task
scheduler.schedule({
  type: "send_email",
  payload: { to: "user@example.com", subject: "Welcome", body: "Hi there" },
  priority: TaskPriority.HIGH,
});

// Schedule delayed task
scheduler.schedule({
  type: "send_email",
  payload: { to: "admin@example.com", subject: "Report", body: "Daily report" },
  priority: TaskPriority.LOW,
  delayMs: 5000,
});

// Start processing
scheduler.start();

// Stop after 15 seconds
setTimeout(() => {
  scheduler.stop();
  console.log("Scheduler stopped");
}, 15000);
```

### SOLID Principles Applied
- **S**: Task is a data object, TaskScheduler manages scheduling, handlers contain business logic, the queue handles ordering.
- **O**: New task types are supported by registering new ITaskHandler implementations. New retry strategies by implementing IRetryStrategy.
- **L**: Any IRetryStrategy (ExponentialBackoff, Fixed, NoRetry) works interchangeably.
- **I**: ITaskHandler has one method (handle). ITaskEventListener has one method (onTaskEvent). Minimal interfaces.
- **D**: TaskScheduler depends on ITaskHandler and IRetryStrategy abstractions.

### Extension Points
- **Persistent queue**: replace in-memory TaskPriorityQueue with Redis sorted set or SQS for durability
- **Recurring tasks**: add a CronScheduler that periodically enqueues tasks based on cron expressions
- **Concurrency control**: add a worker pool with configurable concurrency (process N tasks simultaneously)
- **Rate limiting per task type**: integrate with the Rate Limiter (Problem 3) to limit how many tasks of a type run per second
- **Dead letter dashboard**: expose API to query dead-letter tasks, manually retry or acknowledge them

---

## Problem 5: Pub-Sub System **[SR]**

### Requirements
- Create topics that publishers can send messages to
- Subscribers subscribe to topics and receive messages
- Support multiple subscribers per topic (fan-out)
- Message filtering (subscribers can specify filter criteria)
- Delivery guarantees (at-least-once)
- Message acknowledgment

### Key Design Patterns
- **Observer Pattern**: core of pub/sub (publishers notify subscribers via topic)
- **Iterator Pattern**: for message consumption (pull-based)

### Class Diagram

```
+-------------------+       +-------------------+
| PubSubBroker      |       |   Topic           |
|-------------------|       |-------------------|
| - topics: Map     |1---*->| - name            |
|-------------------|       | - subscriptions[] |
| + createTopic()   |       | - messageQueue[]  |
| + deleteTopic()   |       |-------------------|
| + publish()       |       | + addSubscription()|
| + subscribe()     |       | + publish()       |
| + unsubscribe()   |       +-------------------+
+-------------------+              |
                                   | 1
                                   |
                                   | *
                            +-------------------+
                            | Subscription      |
                            |-------------------|
                            | - id              |
                            | - handler         |
                            | - filter?         |
                            | - pendingMessages |
                            | - ackdMessages    |
                            |-------------------|
                            | + deliver()       |
                            | + ack()           |
                            +-------------------+

+-------------------+
| Message           |
|-------------------|
| - id              |
| - topic           |
| - body            |
| - attributes      |
| - timestamp       |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Message
// ============================================================

interface MessageAttributes {
  [key: string]: string | number | boolean;
}

class Message {
  public readonly id: string;
  public readonly timestamp: Date;

  constructor(
    public readonly topic: string,
    public readonly body: unknown,
    public readonly attributes: MessageAttributes = {}
  ) {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.timestamp = new Date();
  }
}

// ============================================================
// Message Filter
// ============================================================

interface IMessageFilter {
  matches(message: Message): boolean;
}

class AttributeFilter implements IMessageFilter {
  constructor(
    private criteria: Partial<MessageAttributes>
  ) {}

  matches(message: Message): boolean {
    for (const [key, value] of Object.entries(this.criteria)) {
      if (message.attributes[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

class NoFilter implements IMessageFilter {
  matches(_message: Message): boolean {
    return true;
  }
}

// ============================================================
// Subscription
// ============================================================

type MessageHandler = (message: Message) => Promise<void> | void;

interface PendingMessage {
  message: Message;
  deliveredAt: Date;
  deliveryCount: number;
}

class Subscription {
  public readonly id: string;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private acknowledgedIds: Set<string> = new Set();
  private handler: MessageHandler | null = null;
  private filter: IMessageFilter;

  constructor(
    public readonly topicName: string,
    filter?: IMessageFilter
  ) {
    this.id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.filter = filter ?? new NoFilter();
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async deliver(message: Message): Promise<void> {
    // Check filter
    if (!this.filter.matches(message)) {
      return; // Message does not match filter, skip
    }

    // Check if already acknowledged (idempotency)
    if (this.acknowledgedIds.has(message.id)) {
      return;
    }

    // Track as pending
    const existing = this.pendingMessages.get(message.id);
    this.pendingMessages.set(message.id, {
      message,
      deliveredAt: new Date(),
      deliveryCount: existing ? existing.deliveryCount + 1 : 1,
    });

    // Invoke handler if registered (push-based)
    if (this.handler) {
      try {
        await this.handler(message);
        this.ack(message.id); // Auto-ack on success
      } catch {
        // Handler failed, message stays in pending for redelivery
      }
    }
  }

  ack(messageId: string): boolean {
    if (!this.pendingMessages.has(messageId)) {
      return false;
    }
    this.pendingMessages.delete(messageId);
    this.acknowledgedIds.add(messageId);
    return true;
  }

  // Pull-based consumption: get pending messages
  pullMessages(limit: number = 10): Message[] {
    const messages: Message[] = [];
    for (const [, pending] of this.pendingMessages) {
      if (messages.length >= limit) break;
      messages.push(pending.message);
    }
    return messages;
  }

  get pendingCount(): number {
    return this.pendingMessages.size;
  }
}

// ============================================================
// Topic
// ============================================================

class Topic {
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize: number;

  constructor(
    public readonly name: string,
    maxHistorySize: number = 1000
  ) {
    this.maxHistorySize = maxHistorySize;
  }

  addSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  removeSubscription(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  async publish(message: Message): Promise<{ delivered: number; failed: number }> {
    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Fan out to all subscriptions
    let delivered = 0;
    let failed = 0;

    const deliveryPromises = Array.from(this.subscriptions.values()).map(
      async (sub) => {
        try {
          await sub.deliver(message);
          delivered++;
        } catch {
          failed++;
        }
      }
    );

    await Promise.all(deliveryPromises);
    return { delivered, failed };
  }

  get subscriberCount(): number {
    return this.subscriptions.size;
  }

  getRecentMessages(limit: number = 10): Message[] {
    return this.messageHistory.slice(-limit);
  }
}

// ============================================================
// Pub/Sub Broker (Facade)
// ============================================================

class PubSubBroker {
  private topics: Map<string, Topic> = new Map();
  private subscriptionToTopic: Map<string, string> = new Map();

  createTopic(name: string): Topic {
    if (this.topics.has(name)) {
      throw new Error(`Topic "${name}" already exists`);
    }
    const topic = new Topic(name);
    this.topics.set(name, topic);
    return topic;
  }

  deleteTopic(name: string): boolean {
    return this.topics.delete(name);
  }

  getTopic(name: string): Topic | undefined {
    return this.topics.get(name);
  }

  async publish(
    topicName: string,
    body: unknown,
    attributes: MessageAttributes = {}
  ): Promise<Message> {
    const topic = this.topics.get(topicName);
    if (!topic) {
      throw new Error(`Topic "${topicName}" does not exist`);
    }

    const message = new Message(topicName, body, attributes);
    await topic.publish(message);
    return message;
  }

  subscribe(
    topicName: string,
    handler?: MessageHandler,
    filter?: IMessageFilter
  ): Subscription {
    const topic = this.topics.get(topicName);
    if (!topic) {
      throw new Error(`Topic "${topicName}" does not exist`);
    }

    const subscription = new Subscription(topicName, filter);
    if (handler) {
      subscription.onMessage(handler);
    }
    topic.addSubscription(subscription);
    this.subscriptionToTopic.set(subscription.id, topicName);
    return subscription;
  }

  unsubscribe(subscriptionId: string): boolean {
    const topicName = this.subscriptionToTopic.get(subscriptionId);
    if (!topicName) return false;

    const topic = this.topics.get(topicName);
    if (!topic) return false;

    this.subscriptionToTopic.delete(subscriptionId);
    return topic.removeSubscription(subscriptionId);
  }

  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }
}

// ============================================================
// Example Usage
// ============================================================

async function main() {
  const broker = new PubSubBroker();

  // Create topics
  broker.createTopic("order-events");
  broker.createTopic("user-events");

  // Subscribe to all order events
  const orderSub = broker.subscribe(
    "order-events",
    (msg) => {
      console.log(`[Order Handler] Received: ${JSON.stringify(msg.body)}`);
    }
  );

  // Subscribe only to high-value order events (with filter)
  const highValueSub = broker.subscribe(
    "order-events",
    (msg) => {
      console.log(`[High Value Alert] Order: ${JSON.stringify(msg.body)}`);
    },
    new AttributeFilter({ priority: "high" })
  );

  // Subscribe to user events
  const userSub = broker.subscribe(
    "user-events",
    (msg) => {
      console.log(`[User Handler] Received: ${JSON.stringify(msg.body)}`);
    }
  );

  // Publish messages
  await broker.publish(
    "order-events",
    { orderId: "123", amount: 5000 },
    { priority: "high" }
  );
  // Both orderSub and highValueSub receive this

  await broker.publish(
    "order-events",
    { orderId: "456", amount: 25 },
    { priority: "low" }
  );
  // Only orderSub receives this (highValueSub filter rejects it)

  await broker.publish(
    "user-events",
    { userId: "789", action: "login" }
  );
  // Only userSub receives this

  // Check stats
  console.log(`Order topic subscribers: ${broker.getTopic("order-events")?.subscriberCount}`);
  console.log(`Topics: ${broker.listTopics().join(", ")}`);
}

main();
```

### SOLID Principles Applied
- **S**: Message is a data object, Subscription handles delivery to one subscriber, Topic manages fan-out, Broker is the facade.
- **O**: New filter types (regex filter, range filter) implement IMessageFilter without changing existing code.
- **L**: Any IMessageFilter works wherever a filter is expected (NoFilter, AttributeFilter, custom filters).
- **I**: IMessageFilter has a single method (matches). MessageHandler is a single-function type.
- **D**: Subscription depends on IMessageFilter abstraction, not concrete filter types.

### Extension Points
- **Dead letter topic**: route undeliverable messages (handler keeps failing) to a DLT
- **Message ordering**: add sequence numbers and enforce ordering within a partition key
- **Persistence**: swap in-memory storage for a durable store (Kafka-style log, Redis streams)
- **Consumer groups**: multiple subscribers share the load (each message goes to only one member of the group)
- **Message schemas**: add schema validation (e.g., JSON Schema) before publishing

---

## Problem 6: State Machine for Order Processing **[SR]**

### Requirements
- Define states and valid transitions for an order lifecycle
- Validate transitions (reject invalid state changes)
- Execute actions on state entry/exit
- Emit events on state transitions
- Support guards (conditions that must be true for a transition to occur)

### Key Design Patterns
- **State Pattern**: each state is an object that defines its behavior and valid transitions
- **Observer Pattern**: emit events on state transitions for other systems to react

### Class Diagram

```
+-------------------+        +-------------------+
| StateMachine      |        |<<interface>>      |
|-------------------|        | IState            |
| - currentState    |        |-------------------|
| - states: Map     |        | + name: string    |
| - context         |        | + onEnter(ctx)    |
| - listeners[]     |        | + onExit(ctx)     |
|-------------------|        | + getTransitions()|
| + transition(evt) |        +-------------------+
| + getState()      |              ^
| + canTransition() |              |
+-------------------+    +--------+---------+
                         |        |         |
                      Placed   Paid    Shipped  ...

+-------------------+
| Transition        |
|-------------------|
| - event: string   |
| - targetState     |
| - guard?: fn      |
| - action?: fn     |
+-------------------+
```

### Code Implementation

```typescript
// ============================================================
// Types
// ============================================================

interface OrderContext {
  orderId: string;
  items: Array<{ sku: string; quantity: number; priceCents: number }>;
  totalCents: number;
  paymentId: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  history: Array<{ from: string; to: string; event: string; at: Date }>;
}

type GuardFn = (context: OrderContext) => boolean;
type ActionFn = (context: OrderContext) => void | Promise<void>;

interface TransitionConfig {
  event: string;
  target: string;
  guard?: GuardFn;
  action?: ActionFn;
}

// ============================================================
// State Interface and Implementations
// ============================================================

interface IState {
  readonly name: string;
  onEnter(context: OrderContext): void | Promise<void>;
  onExit(context: OrderContext): void | Promise<void>;
  getTransitions(): TransitionConfig[];
}

class PlacedState implements IState {
  readonly name = "PLACED";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Order ${context.orderId} has been placed`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "PAYMENT_RECEIVED",
        target: "PAID",
        guard: (ctx) => ctx.totalCents > 0,
        action: (ctx) => {
          ctx.paymentId = `pay_${Date.now()}`;
        },
      },
      {
        event: "CANCEL",
        target: "CANCELLED",
        action: (ctx) => {
          ctx.cancelReason = ctx.cancelReason ?? "Cancelled by customer before payment";
        },
      },
    ];
  }
}

class PaidState implements IState {
  readonly name = "PAID";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Payment ${context.paymentId} confirmed for order ${context.orderId}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "SHIP",
        target: "SHIPPED",
        guard: (ctx) => ctx.items.length > 0,
        action: (ctx) => {
          ctx.trackingNumber = `TRK${Date.now()}`;
        },
      },
      {
        event: "CANCEL",
        target: "REFUND_PENDING",
        action: (ctx) => {
          ctx.cancelReason = ctx.cancelReason ?? "Cancelled after payment";
        },
      },
    ];
  }
}

class ShippedState implements IState {
  readonly name = "SHIPPED";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Order ${context.orderId} shipped with tracking ${context.trackingNumber}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "DELIVER",
        target: "DELIVERED",
      },
      {
        event: "RETURN_REQUESTED",
        target: "RETURN_PENDING",
      },
    ];
  }
}

class DeliveredState implements IState {
  readonly name = "DELIVERED";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Order ${context.orderId} has been delivered`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "RETURN_REQUESTED",
        target: "RETURN_PENDING",
      },
    ];
  }
}

class CancelledState implements IState {
  readonly name = "CANCELLED";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Order ${context.orderId} cancelled: ${context.cancelReason}`
    );
  }

  onExit(_context: OrderContext): void {
    // Terminal state -- should not exit
  }

  getTransitions(): TransitionConfig[] {
    return []; // Terminal state, no transitions out
  }
}

class RefundPendingState implements IState {
  readonly name = "REFUND_PENDING";

  onEnter(context: OrderContext): void {
    console.log(
      `  [${this.name}] Refund initiated for order ${context.orderId}, payment ${context.paymentId}`
    );
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "REFUND_COMPLETED",
        target: "CANCELLED",
        action: (ctx) => {
          ctx.cancelReason =
            (ctx.cancelReason ?? "Cancelled") + " -- refund completed";
        },
      },
    ];
  }
}

class ReturnPendingState implements IState {
  readonly name = "RETURN_PENDING";

  onEnter(context: OrderContext): void {
    console.log(`  [${this.name}] Return requested for order ${context.orderId}`);
  }

  onExit(_context: OrderContext): void {
    // No-op
  }

  getTransitions(): TransitionConfig[] {
    return [
      {
        event: "RETURN_RECEIVED",
        target: "REFUND_PENDING",
      },
      {
        event: "RETURN_REJECTED",
        target: "DELIVERED",
      },
    ];
  }
}

// ============================================================
// Transition Event Listener (Observer Pattern)
// ============================================================

interface TransitionEvent {
  from: string;
  to: string;
  event: string;
  context: OrderContext;
  timestamp: Date;
}

interface ITransitionListener {
  onTransition(event: TransitionEvent): void;
}

// ============================================================
// State Machine
// ============================================================

class OrderStateMachine {
  private states: Map<string, IState> = new Map();
  private currentState: IState;
  private context: OrderContext;
  private listeners: ITransitionListener[] = [];

  constructor(initialState: IState, context: OrderContext) {
    this.currentState = initialState;
    this.context = context;
    this.registerState(initialState);
  }

  registerState(state: IState): void {
    this.states.set(state.name, state);
  }

  registerStates(states: IState[]): void {
    states.forEach((s) => this.registerState(s));
  }

  addListener(listener: ITransitionListener): void {
    this.listeners.push(listener);
  }

  getStateName(): string {
    return this.currentState.name;
  }

  getContext(): Readonly<OrderContext> {
    return this.context;
  }

  canTransition(event: string): boolean {
    const transition = this.findTransition(event);
    if (!transition) return false;
    if (transition.guard && !transition.guard(this.context)) return false;
    return true;
  }

  getAvailableEvents(): string[] {
    return this.currentState
      .getTransitions()
      .filter((t) => !t.guard || t.guard(this.context))
      .map((t) => t.event);
  }

  async transition(event: string): Promise<void> {
    const transitionConfig = this.findTransition(event);

    if (!transitionConfig) {
      throw new Error(
        `Invalid transition: event "${event}" is not valid from state "${this.currentState.name}". ` +
        `Available events: [${this.getAvailableEvents().join(", ")}]`
      );
    }

    // Check guard
    if (transitionConfig.guard && !transitionConfig.guard(this.context)) {
      throw new Error(
        `Guard condition failed for transition "${event}" from state "${this.currentState.name}"`
      );
    }

    const targetState = this.states.get(transitionConfig.target);
    if (!targetState) {
      throw new Error(`Target state "${transitionConfig.target}" is not registered`);
    }

    const fromName = this.currentState.name;

    // Exit current state
    await this.currentState.onExit(this.context);

    // Execute transition action
    if (transitionConfig.action) {
      await transitionConfig.action(this.context);
    }

    // Enter new state
    this.currentState = targetState;
    await this.currentState.onEnter(this.context);

    // Record in history
    this.context.history.push({
      from: fromName,
      to: this.currentState.name,
      event,
      at: new Date(),
    });

    // Notify listeners
    const transitionEvent: TransitionEvent = {
      from: fromName,
      to: this.currentState.name,
      event,
      context: this.context,
      timestamp: new Date(),
    };

    for (const listener of this.listeners) {
      listener.onTransition(transitionEvent);
    }
  }

  private findTransition(event: string): TransitionConfig | undefined {
    return this.currentState
      .getTransitions()
      .find((t) => t.event === event);
  }
}

// ============================================================
// Example: Event Logger Listener
// ============================================================

class EventLoggerListener implements ITransitionListener {
  onTransition(event: TransitionEvent): void {
    console.log(
      `  [EVENT] ${event.from} -> ${event.to} (trigger: ${event.event})`
    );
  }
}

class EventBridgePublisher implements ITransitionListener {
  onTransition(event: TransitionEvent): void {
    // In production: publish to EventBridge
    console.log(
      `  [EventBridge] Published: order.${event.event.toLowerCase()} ` +
      `for order ${event.context.orderId}`
    );
  }
}

// ============================================================
// Example Usage
// ============================================================

async function runOrderExample() {
  // Create order context
  const context: OrderContext = {
    orderId: "ORD-001",
    items: [
      { sku: "WIDGET-A", quantity: 2, priceCents: 1500 },
      { sku: "GADGET-B", quantity: 1, priceCents: 3000 },
    ],
    totalCents: 6000,
    paymentId: null,
    trackingNumber: null,
    cancelReason: null,
    history: [],
  };

  // Create state machine
  const placed = new PlacedState();
  const sm = new OrderStateMachine(placed, context);

  // Register all states
  sm.registerStates([
    new PaidState(),
    new ShippedState(),
    new DeliveredState(),
    new CancelledState(),
    new RefundPendingState(),
    new ReturnPendingState(),
  ]);

  // Add listeners
  sm.addListener(new EventLoggerListener());
  sm.addListener(new EventBridgePublisher());

  // Enter initial state
  console.log("=== Order Processing ===");
  console.log(`Current state: ${sm.getStateName()}`);
  console.log(`Available events: ${sm.getAvailableEvents().join(", ")}`);

  // Process the order through its lifecycle
  await sm.transition("PAYMENT_RECEIVED");
  console.log(`Current state: ${sm.getStateName()}`);

  await sm.transition("SHIP");
  console.log(`Current state: ${sm.getStateName()}`);

  await sm.transition("DELIVER");
  console.log(`Current state: ${sm.getStateName()}`);

  // Try invalid transition
  try {
    await sm.transition("SHIP"); // Cannot ship a delivered order
  } catch (err) {
    console.log(`Expected error: ${(err as Error).message}`);
  }

  // Print history
  console.log("\n=== Order History ===");
  for (const entry of context.history) {
    console.log(`  ${entry.from} -> ${entry.to} via ${entry.event} at ${entry.at.toISOString()}`);
  }
}

runOrderExample();
```

### SOLID Principles Applied
- **S**: Each state class defines only its own behavior and transitions. The state machine handles orchestration. Listeners handle side effects.
- **O**: New states (e.g., PartiallyShippedState) are added by creating a new class and registering it. No existing state code changes.
- **L**: All IState implementations are interchangeable in the state machine.
- **I**: IState has focused methods (onEnter, onExit, getTransitions). ITransitionListener has one method.
- **D**: StateMachine depends on IState and ITransitionListener abstractions. Adding EventBridge publishing is just a new listener.

### Extension Points
- **Persistence**: serialize state machine context to DB, reload on service restart (critical for order processing)
- **Timeout transitions**: auto-transition if stuck in a state too long (e.g., PAYMENT_PENDING for > 30 min -> auto-cancel)
- **Parallel states**: support compound states where order can be in multiple sub-states (e.g., SHIPPED + PARTIALLY_REFUNDED)
- **State machine visualization**: generate DOT graph from state definitions for documentation
- **AWS Step Functions mapping**: each state maps directly to a Step Functions state, making this design portable to orchestrated workflows

---

## Problem 7: Strategy Pattern Showcase -- Payment Processing **[SR]**

### Requirements
- Support multiple payment methods (credit card, PayPal, bank transfer, crypto)
- Each payment method has different processing logic, validation, and fee structure
- Add new payment methods without modifying existing code
- Handle payment lifecycle: authorize, capture, refund
- Fee calculation varies by payment method

### Key Design Patterns
- **Strategy Pattern**: each payment method is a strategy with its own processing logic
- **Factory Pattern**: create the right payment processor based on payment method type

### Class Diagram

```
+---------------------+       +------------------------+
| PaymentService      |       |<<interface>>           |
|---------------------|       | IPaymentProcessor      |
| - processors: Map   |       |------------------------|
| - factory           |       | + authorize(payment)   |
|---------------------|       | + capture(authId)      |
| + processPayment()  |       | + refund(paymentId)    |
| + refundPayment()   |       | + calculateFee(amount) |
| + getProcessor()    |       | + validate(details)    |
+---------------------+       +------------------------+
                                       ^
                           +-----------+-----------+-----------+
                           |           |           |           |
                    CreditCard    PayPal     BankTransfer   Crypto
                    Processor    Processor   Processor     Processor

+---------------------+
| PaymentProcessorFactory|
|---------------------|
| + create(type):     |
|   IPaymentProcessor |
+---------------------+

+---------------------+       +---------------------+
| Payment             |       | PaymentResult       |
|---------------------|       |---------------------|
| - id                |       | - success           |
| - amount            |       | - transactionId     |
| - currency          |       | - fee               |
| - method            |       | - message           |
| - status            |       +---------------------+
| - details           |
+---------------------+
```

### Code Implementation

```typescript
// ============================================================
// Types and Interfaces
// ============================================================

enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  PAYPAL = "PAYPAL",
  BANK_TRANSFER = "BANK_TRANSFER",
  CRYPTO = "CRYPTO",
}

enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

interface PaymentDetails {
  // Credit Card
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  // PayPal
  paypalEmail?: string;
  // Bank Transfer
  accountNumber?: string;
  routingNumber?: string;
  // Crypto
  walletAddress?: string;
  cryptoCurrency?: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  details: PaymentDetails;
  authorizationId: string | null;
  transactionId: string | null;
  feeCents: number;
  createdAt: Date;
}

interface PaymentResult {
  success: boolean;
  transactionId: string | null;
  authorizationId: string | null;
  feeCents: number;
  message: string;
}

// ============================================================
// Payment Processor Interface (Strategy)
// ============================================================

interface IPaymentProcessor {
  readonly methodName: string;
  validate(details: PaymentDetails): { valid: boolean; errors: string[] };
  authorize(payment: Payment): Promise<PaymentResult>;
  capture(authorizationId: string, amountCents: number): Promise<PaymentResult>;
  refund(transactionId: string, amountCents: number): Promise<PaymentResult>;
  calculateFeeCents(amountCents: number): number;
}

// ============================================================
// Credit Card Processor
// ============================================================

class CreditCardProcessor implements IPaymentProcessor {
  readonly methodName = "Credit Card";
  private feePercentage = 2.9;   // 2.9%
  private fixedFeeCents = 30;     // $0.30

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.cardNumber || details.cardNumber.length < 13) {
      errors.push("Invalid card number");
    }
    if (!details.cardExpiry || !/^\d{2}\/\d{2}$/.test(details.cardExpiry)) {
      errors.push("Invalid expiry date (MM/YY)");
    }
    if (!details.cardCvv || !/^\d{3,4}$/.test(details.cardCvv)) {
      errors.push("Invalid CVV");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    // Simulate credit card authorization via payment gateway
    console.log(
      `  [CreditCard] Authorizing $${(payment.amountCents / 100).toFixed(2)} ` +
      `on card ending ${payment.details.cardNumber?.slice(-4)}`
    );

    // Simulate network call
    const authId = `auth_cc_${Date.now()}`;
    const feeCents = this.calculateFeeCents(payment.amountCents);

    return {
      success: true,
      transactionId: null,
      authorizationId: authId,
      feeCents,
      message: `Authorized $${(payment.amountCents / 100).toFixed(2)} on credit card`,
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [CreditCard] Capturing $${(amountCents / 100).toFixed(2)} for auth ${authorizationId}`
    );

    return {
      success: true,
      transactionId: `txn_cc_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Payment captured",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [CreditCard] Refunding $${(amountCents / 100).toFixed(2)} for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_cc_${Date.now()}`,
      authorizationId: null,
      feeCents: 0, // refund processing fees vary by provider
      message: "Refund processed (5-10 business days)",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100)) + this.fixedFeeCents;
  }
}

// ============================================================
// PayPal Processor
// ============================================================

class PayPalProcessor implements IPaymentProcessor {
  readonly methodName = "PayPal";
  private feePercentage = 3.49;
  private fixedFeeCents = 49;

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.paypalEmail || !details.paypalEmail.includes("@")) {
      errors.push("Invalid PayPal email");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [PayPal] Creating payment for $${(payment.amountCents / 100).toFixed(2)} ` +
      `to ${payment.details.paypalEmail}`
    );

    return {
      success: true,
      transactionId: null,
      authorizationId: `auth_pp_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: "PayPal authorization created",
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [PayPal] Executing payment for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_pp_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "PayPal payment captured",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [PayPal] Refunding $${(amountCents / 100).toFixed(2)} for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_pp_${Date.now()}`,
      authorizationId: null,
      feeCents: 0,
      message: "PayPal refund processed (3-5 business days)",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100)) + this.fixedFeeCents;
  }
}

// ============================================================
// Bank Transfer Processor
// ============================================================

class BankTransferProcessor implements IPaymentProcessor {
  readonly methodName = "Bank Transfer (ACH)";
  private flatFeeCents = 25; // $0.25 flat

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.accountNumber || details.accountNumber.length < 8) {
      errors.push("Invalid account number");
    }
    if (!details.routingNumber || details.routingNumber.length !== 9) {
      errors.push("Routing number must be 9 digits");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [BankTransfer] Initiating ACH debit for $${(payment.amountCents / 100).toFixed(2)}`
    );

    // Bank transfers are typically capture-only (no separate auth step)
    // But we model it as auth for consistency
    return {
      success: true,
      transactionId: null,
      authorizationId: `auth_ach_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: "ACH transfer initiated (settles in 2-3 business days)",
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [BankTransfer] Confirming ACH for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_ach_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "ACH transfer confirmed",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [BankTransfer] Initiating ACH credit for $${(amountCents / 100).toFixed(2)}`
    );

    return {
      success: true,
      transactionId: `refund_ach_${Date.now()}`,
      authorizationId: null,
      feeCents: 0,
      message: "ACH refund initiated (5-7 business days)",
    };
  }

  calculateFeeCents(_amountCents: number): number {
    return this.flatFeeCents;
  }
}

// ============================================================
// Crypto Processor
// ============================================================

class CryptoProcessor implements IPaymentProcessor {
  readonly methodName = "Cryptocurrency";
  private feePercentage = 1.0;

  validate(details: PaymentDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!details.walletAddress || details.walletAddress.length < 20) {
      errors.push("Invalid wallet address");
    }
    if (!details.cryptoCurrency) {
      errors.push("Cryptocurrency type is required");
    }
    return { valid: errors.length === 0, errors };
  }

  async authorize(payment: Payment): Promise<PaymentResult> {
    console.log(
      `  [Crypto] Creating ${payment.details.cryptoCurrency} payment for ` +
      `$${(payment.amountCents / 100).toFixed(2)} to ${payment.details.walletAddress}`
    );

    // Crypto payments are typically immediate (no separate auth)
    return {
      success: true,
      transactionId: `txn_crypto_${Date.now()}`,
      authorizationId: `auth_crypto_${Date.now()}`,
      feeCents: this.calculateFeeCents(payment.amountCents),
      message: `${payment.details.cryptoCurrency} payment pending confirmation`,
    };
  }

  async capture(authorizationId: string, amountCents: number): Promise<PaymentResult> {
    console.log(`  [Crypto] Confirming blockchain transaction for auth ${authorizationId}`);

    return {
      success: true,
      transactionId: `txn_crypto_${Date.now()}`,
      authorizationId,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Blockchain confirmation received",
    };
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymentResult> {
    console.log(
      `  [Crypto] Initiating crypto refund of $${(amountCents / 100).toFixed(2)} ` +
      `for txn ${transactionId}`
    );

    return {
      success: true,
      transactionId: `refund_crypto_${Date.now()}`,
      authorizationId: null,
      feeCents: this.calculateFeeCents(amountCents),
      message: "Crypto refund sent to wallet",
    };
  }

  calculateFeeCents(amountCents: number): number {
    return Math.round(amountCents * (this.feePercentage / 100));
  }
}

// ============================================================
// Payment Processor Factory
// ============================================================

class PaymentProcessorFactory {
  private static processors: Map<PaymentMethod, IPaymentProcessor> = new Map();

  static register(method: PaymentMethod, processor: IPaymentProcessor): void {
    PaymentProcessorFactory.processors.set(method, processor);
  }

  static create(method: PaymentMethod): IPaymentProcessor {
    const processor = PaymentProcessorFactory.processors.get(method);
    if (!processor) {
      throw new Error(`No processor registered for payment method: ${method}`);
    }
    return processor;
  }

  static getAvailableMethods(): PaymentMethod[] {
    return Array.from(PaymentProcessorFactory.processors.keys());
  }
}

// Register processors
PaymentProcessorFactory.register(PaymentMethod.CREDIT_CARD, new CreditCardProcessor());
PaymentProcessorFactory.register(PaymentMethod.PAYPAL, new PayPalProcessor());
PaymentProcessorFactory.register(PaymentMethod.BANK_TRANSFER, new BankTransferProcessor());
PaymentProcessorFactory.register(PaymentMethod.CRYPTO, new CryptoProcessor());

// ============================================================
// Payment Service (Facade)
// ============================================================

class PaymentService {
  private payments: Map<string, Payment> = new Map();

  async processPayment(
    method: PaymentMethod,
    amountCents: number,
    currency: string,
    details: PaymentDetails
  ): Promise<Payment> {
    const processor = PaymentProcessorFactory.create(method);

    // Validate payment details
    const validation = processor.validate(details);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Create payment record
    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountCents,
      currency,
      method,
      status: PaymentStatus.PENDING,
      details,
      authorizationId: null,
      transactionId: null,
      feeCents: 0,
      createdAt: new Date(),
    };

    // Authorize
    const authResult = await processor.authorize(payment);
    if (!authResult.success) {
      payment.status = PaymentStatus.FAILED;
      this.payments.set(payment.id, payment);
      throw new Error(`Authorization failed: ${authResult.message}`);
    }

    payment.authorizationId = authResult.authorizationId;
    payment.feeCents = authResult.feeCents;
    payment.status = PaymentStatus.AUTHORIZED;

    // Capture
    const captureResult = await processor.capture(
      payment.authorizationId!,
      amountCents
    );
    if (!captureResult.success) {
      payment.status = PaymentStatus.FAILED;
      this.payments.set(payment.id, payment);
      throw new Error(`Capture failed: ${captureResult.message}`);
    }

    payment.transactionId = captureResult.transactionId;
    payment.status = PaymentStatus.CAPTURED;
    this.payments.set(payment.id, payment);

    return payment;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new Error(`Cannot refund payment in status ${payment.status}`);
    }

    const processor = PaymentProcessorFactory.create(payment.method);
    const result = await processor.refund(
      payment.transactionId!,
      payment.amountCents
    );

    if (!result.success) {
      throw new Error(`Refund failed: ${result.message}`);
    }

    payment.status = PaymentStatus.REFUNDED;
    return payment;
  }

  getPayment(paymentId: string): Payment | undefined {
    return this.payments.get(paymentId);
  }

  compareFees(amountCents: number): Array<{ method: string; feeCents: number; feePercent: string }> {
    const methods = PaymentProcessorFactory.getAvailableMethods();
    return methods.map((method) => {
      const processor = PaymentProcessorFactory.create(method);
      const feeCents = processor.calculateFeeCents(amountCents);
      return {
        method: processor.methodName,
        feeCents,
        feePercent: ((feeCents / amountCents) * 100).toFixed(2) + "%",
      };
    });
  }
}

// ============================================================
// Example Usage
// ============================================================

async function runPaymentExample() {
  const service = new PaymentService();

  console.log("=== Fee Comparison for $100.00 ===");
  const fees = service.compareFees(10000);
  for (const fee of fees) {
    console.log(`  ${fee.method}: $${(fee.feeCents / 100).toFixed(2)} (${fee.feePercent})`);
  }

  console.log("\n=== Credit Card Payment ===");
  const ccPayment = await service.processPayment(
    PaymentMethod.CREDIT_CARD,
    5000, // $50.00
    "USD",
    {
      cardNumber: "4111111111111111",
      cardExpiry: "12/25",
      cardCvv: "123",
    }
  );
  console.log(
    `  Payment ${ccPayment.id}: ${ccPayment.status}, ` +
    `fee: $${(ccPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== PayPal Payment ===");
  const ppPayment = await service.processPayment(
    PaymentMethod.PAYPAL,
    7500, // $75.00
    "USD",
    { paypalEmail: "user@example.com" }
  );
  console.log(
    `  Payment ${ppPayment.id}: ${ppPayment.status}, ` +
    `fee: $${(ppPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== Refund Credit Card Payment ===");
  const refundedPayment = await service.refundPayment(ccPayment.id);
  console.log(`  Payment ${refundedPayment.id}: ${refundedPayment.status}`);

  console.log("\n=== Crypto Payment ===");
  const cryptoPayment = await service.processPayment(
    PaymentMethod.CRYPTO,
    25000, // $250.00
    "USD",
    {
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1E",
      cryptoCurrency: "ETH",
    }
  );
  console.log(
    `  Payment ${cryptoPayment.id}: ${cryptoPayment.status}, ` +
    `fee: $${(cryptoPayment.feeCents / 100).toFixed(2)}`
  );

  console.log("\n=== Validation Error Example ===");
  try {
    await service.processPayment(
      PaymentMethod.CREDIT_CARD,
      1000,
      "USD",
      { cardNumber: "123" } // Invalid
    );
  } catch (err) {
    console.log(`  Expected error: ${(err as Error).message}`);
  }
}

runPaymentExample();
```

### SOLID Principles Applied
- **S**: Each processor handles only its own payment method logic. PaymentService orchestrates the flow. Factory handles instantiation.
- **O**: Adding a new payment method (e.g., Apple Pay) requires only a new class implementing IPaymentProcessor and registering it with the factory. Zero changes to existing code.
- **L**: All IPaymentProcessor implementations are interchangeable. The PaymentService does not know or care which concrete processor it is using.
- **I**: IPaymentProcessor is focused on payment operations only. Validation, processing, and fee calculation are all payment-related concerns.
- **D**: PaymentService depends on IPaymentProcessor (abstraction) and PaymentProcessorFactory. It never imports CreditCardProcessor directly.

### Extension Points
- **Apple Pay / Google Pay**: implement IPaymentProcessor, register with factory. Done.
- **Webhooks**: add a webhook listener for async payment confirmations (crypto confirmations, ACH settlements)
- **Idempotency**: add idempotency key to prevent duplicate charges (critical for production -- map to your idempotency_key pattern)
- **Partial refunds**: extend the refund method to accept a partial amount
- **Payment retry**: wrap authorization in a retry mechanism with exponential backoff (reuse the retry strategies from Problem 4)
- **Audit logging**: add an observer/listener that logs all payment events for compliance (similar to the state machine's transition listeners)

---

## Summary: Design Patterns Quick Reference

| Problem | Primary Pattern | Supporting Patterns |
|---------|----------------|-------------------|
| Parking Lot | Strategy (pricing) | Factory (vehicles), Singleton (lot) |
| LRU Cache | Composite (DLL + HashMap) | -- |
| Rate Limiter | Strategy (algorithm) | Factory (creation) |
| Task Scheduler | Observer (events) | Strategy (retry), Priority Queue |
| Pub-Sub System | Observer (core mechanic) | Iterator (pull consumption) |
| Order State Machine | State (lifecycle) | Observer (transition events) |
| Payment Processing | Strategy (processors) | Factory (processor creation) |
