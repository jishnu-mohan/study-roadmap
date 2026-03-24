# LRU Cache

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
