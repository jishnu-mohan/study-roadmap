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

### Python Code Template

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
