# Graph Algorithms

[SR] Tag: graph, dijkstra, union-find, shortest-path, weighted-graph

### When to Recognize

- Problem involves **weighted graphs** and asks for **shortest/cheapest path**.
- Problem involves **connectivity**, "are nodes connected?", or **component counting**.
- Keywords: "network delay", "cheapest flight", "minimum cost to connect", "redundant connection".
- Need efficient union/find operations across dynamic connectivity queries.

### Core Idea

Dijkstra finds shortest paths in graphs with non-negative weights using a min-heap,
greedily extending the shortest known path. Union-Find (Disjoint Set Union) efficiently
tracks connected components with near-O(1) amortized operations using path compression
and union by rank. BFS gives shortest path in unweighted graphs. Choose the algorithm
based on edge weights and the specific query type.

### Code Template

```typescript
// Dijkstra's Algorithm
// graph: adjacency list Map<number, [neighbor, weight][]>
function dijkstra(graph: Map<number, [number, number][]>, source: number, n: number): number[] {
    const dist: number[] = new Array(n).fill(Infinity);
    dist[source] = 0;
    // Min-heap: [distance, node]. Use a simple sorted array or a heap library.
    const minHeap: [number, number][] = [[0, source]];

    while (minHeap.length > 0) {
        minHeap.sort((a, b) => a[0] - b[0]);
        const [d, u] = minHeap.shift()!;
        if (d > dist[u]) continue;  // skip stale entries
        for (const [v, weight] of graph.get(u) ?? []) {
            const newDist = d + weight;
            if (newDist < dist[v]) {
                dist[v] = newDist;
                minHeap.push([newDist, v]);
            }
        }
    }

    return dist;
}

// Union-Find (Disjoint Set Union)
class UnionFind {
    parent: number[];
    rank: number[];
    components: number;

    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
        this.components = n;
    }

    find(x: number): number {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);  // path compression
        }
        return this.parent[x];
    }

    union(x: number, y: number): boolean {
        let rx = this.find(x);
        let ry = this.find(y);
        if (rx === ry) return false;  // already connected
        // Union by rank
        if (this.rank[rx] < this.rank[ry]) {
            [rx, ry] = [ry, rx];
        }
        this.parent[ry] = rx;
        if (this.rank[rx] === this.rank[ry]) {
            this.rank[rx]++;
        }
        this.components--;
        return true;
    }

    connected(x: number, y: number): boolean {
        return this.find(x) === this.find(y);
    }
}
```

```java
// Dijkstra's Algorithm
// graph: adjacency list {node: [(neighbor, weight), ...]}
public int[] dijkstra(Map<Integer, List<int[]>> graph, int source, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;
    // Min-heap: [distance, node]
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    minHeap.offer(new int[]{0, source});

    while (!minHeap.isEmpty()) {
        int[] top = minHeap.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;  // skip stale entries
        for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
            int v = edge[0], weight = edge[1];
            int newDist = d + weight;
            if (newDist < dist[v]) {
                dist[v] = newDist;
                minHeap.offer(new int[]{newDist, v});
            }
        }
    }

    return dist;
}

// Union-Find (Disjoint Set Union)
class UnionFind {
    int[] parent;
    int[] rank;
    int components;

    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // path compression
        }
        return parent[x];
    }

    public boolean union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false;  // already connected
        // Union by rank
        if (rank[rx] < rank[ry]) {
            int temp = rx; rx = ry; ry = temp;
        }
        parent[ry] = rx;
        if (rank[rx] == rank[ry]) rank[rx]++;
        components--;
        return true;
    }

    public boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}
```

```python
import heapq
from collections import defaultdict

# Dijkstra's Algorithm
def dijkstra(graph, source, n):
    """graph: adjacency list {node: [(neighbor, weight), ...]}"""
    dist = [float('inf')] * n
    dist[source] = 0
    min_heap = [(0, source)]  # (distance, node)

    while min_heap:
        d, u = heapq.heappop(min_heap)
        if d > dist[u]:
            continue  # skip stale entries
        for v, weight in graph[u]:
            new_dist = d + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(min_heap, (new_dist, v))

    return dist

# Union-Find (Disjoint Set Union)
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False  # already connected
        # Union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.components -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

### Classic Example Walkthrough: Network Delay Time (LC 743)

**Problem:** n nodes, weighted directed edges. Send signal from node k. Return the time it takes for all nodes to receive the signal. Return -1 if impossible.

```typescript
function networkDelayTime(times: number[][], n: number, k: number): number {
    const graph: Map<number, [number, number][]> = new Map();
    for (const [u, v, w] of times) {
        if (!graph.has(u)) graph.set(u, []);
        graph.get(u)!.push([v, w]);
    }

    const dist: Map<number, number> = new Map();
    for (let i = 1; i <= n; i++) dist.set(i, Infinity);
    dist.set(k, 0);
    const minHeap: [number, number][] = [[0, k]];

    while (minHeap.length > 0) {
        minHeap.sort((a, b) => a[0] - b[0]);
        const [d, u] = minHeap.shift()!;
        if (d > dist.get(u)!) continue;
        for (const [v, w] of graph.get(u) ?? []) {
            const newDist = d + w;
            if (newDist < dist.get(v)!) {
                dist.set(v, newDist);
                minHeap.push([newDist, v]);
            }
        }
    }

    const maxDist = Math.max(...dist.values());
    return maxDist < Infinity ? maxDist : -1;
}
```

```java
public int networkDelayTime(int[][] times, int n, int k) {
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] t : times) {
        graph.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[]{t[1], t[2]});
    }

    Map<Integer, Integer> dist = new HashMap<>();
    for (int i = 1; i <= n; i++) dist.put(i, Integer.MAX_VALUE);
    dist.put(k, 0);
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    minHeap.offer(new int[]{0, k});

    while (!minHeap.isEmpty()) {
        int[] top = minHeap.poll();
        int d = top[0], u = top[1];
        if (d > dist.get(u)) continue;
        for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
            int v = edge[0], w = edge[1];
            int newDist = d + w;
            if (newDist < dist.get(v)) {
                dist.put(v, newDist);
                minHeap.offer(new int[]{newDist, v});
            }
        }
    }

    int maxDist = Collections.max(dist.values());
    return maxDist < Integer.MAX_VALUE ? maxDist : -1;
}
```

```python
def networkDelayTime(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))

    dist = {i: float('inf') for i in range(1, n + 1)}
    dist[k] = 0
    min_heap = [(0, k)]

    while min_heap:
        d, u = heapq.heappop(min_heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            new_dist = d + w
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(min_heap, (new_dist, v))

    max_dist = max(dist.values())
    return max_dist if max_dist < float('inf') else -1
```

**Step-by-step with times=[[2,1,1],[2,3,1],[3,4,1]], n=4, k=2:**

1. Graph: {2:[(1,1),(3,1)], 3:[(4,1)]}
2. dist = {1:inf, 2:0, 3:inf, 4:inf}. Heap = [(0,2)].
3. Pop (0,2). Process neighbors:
   - Node 1: 0+1=1 < inf. dist[1]=1. Push (1,1).
   - Node 3: 0+1=1 < inf. dist[3]=1. Push (1,3).
   Heap = [(1,1),(1,3)].
4. Pop (1,1). Node 1 has no outgoing edges. Heap = [(1,3)].
5. Pop (1,3). Process neighbors:
   - Node 4: 1+1=2 < inf. dist[4]=2. Push (2,4).
   Heap = [(2,4)].
6. Pop (2,4). Node 4 has no outgoing edges. Heap empty.
7. dist = {1:1, 2:0, 3:1, 4:2}. max = 2. Return 2.

### Variations

- **Cheapest Flights Within K Stops (LC 787)** -- modified Dijkstra or BFS with state (node, stops). Can also use Bellman-Ford with k+1 iterations.
- **Redundant Connection (LC 684)** -- Union-Find to detect the edge that creates a cycle.
- **Number of Connected Components (LC 323)** -- Union-Find or DFS to count components.
- **Min Cost to Connect All Points (LC 1584)** -- Minimum Spanning Tree using Kruskal (Union-Find) or Prim.
- **Swim in Rising Water (LC 778)** -- Dijkstra variant on a grid, minimizing the maximum elevation.

### Edge Cases

- Disconnected graph (some nodes unreachable, return -1 or handle appropriately).
- Self-loops (may or may not affect result depending on weights).
- Negative weights (Dijkstra does not work -- use Bellman-Ford instead).
- Single node (distance is 0).
- Dense graph (many edges, heap operations can slow down).
- Parallel edges (multiple edges between same pair of nodes, keep the minimum or handle both).

### Complexity

**Dijkstra:**
- **Time:** O((V + E) log V) with a binary heap.
- **Space:** O(V + E).

**Union-Find:**
- **Time:** O(alpha(n)) per operation, nearly O(1). Total for m operations: O(m * alpha(n)).
- **Space:** O(V).
