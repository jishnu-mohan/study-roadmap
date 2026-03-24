# Graphs

**[SR]**

### What It Is

A **graph** is a collection of **vertices** (nodes) and **edges** (connections between nodes). Graphs generalize trees -- a tree is a connected acyclic graph.

**Types:**
- **Directed** vs **Undirected**: edges have direction or not.
- **Weighted** vs **Unweighted**: edges have costs or not.
- **Cyclic** vs **Acyclic**: contains cycles or not. A Directed Acyclic Graph (DAG) is particularly important.

### How It Works Internally

**Adjacency List** (most common in interviews):

```python
# Using a dictionary of lists
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D'],
    'C': ['A'],
    'D': ['B']
}

# Using defaultdict for building from edge list
from collections import defaultdict
graph = defaultdict(list)
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)  # omit for directed graph
```

**Adjacency Matrix:**

```python
# n x n matrix where matrix[i][j] = 1 (or weight) if edge exists
matrix = [[0] * n for _ in range(n)]
for u, v in edges:
    matrix[u][v] = 1
    matrix[v][u] = 1  # omit for directed
```

**Trade-offs:**

| Property | Adjacency List | Adjacency Matrix |
|---|---|---|
| Space | O(V + E) | O(V^2) |
| Check if edge exists | O(degree of u) | O(1) |
| Get all neighbors | O(degree of u) | O(V) |
| Add edge | O(1) | O(1) |
| Best for | Sparse graphs (most real-world) | Dense graphs, fast edge lookup |

**Almost always use adjacency list in interviews** unless the graph is dense or you need O(1) edge lookup.

### Operations and Complexity

| Operation | Adjacency List | Adjacency Matrix |
|---|---|---|
| BFS / DFS | O(V + E) | O(V^2) |
| Space | O(V + E) | O(V^2) |
| Check edge (u, v) | O(degree(u)) | O(1) |
| Dijkstra (with min-heap) | O((V + E) log V) | O(V^2) |
| Topological sort | O(V + E) | O(V^2) |

### When to Use It

- **"Connected" / "reachable" / "path exists"** --> BFS or DFS.
- **"Shortest path" (unweighted)** --> BFS.
- **"Shortest path" (weighted, non-negative)** --> Dijkstra.
- **"Detect cycle"** (directed) --> DFS with coloring (white/gray/black) or topological sort.
- **"Detect cycle"** (undirected) --> Union-Find or DFS with parent tracking.
- **"Order of dependencies" / "prerequisites"** --> Topological sort.
- **"Connected components" / "grouping"** --> BFS/DFS or Union-Find.
- **"Grid problems"** (islands, mazes) --> treat grid as an implicit graph.

### Common Interview Patterns

1. **BFS (shortest path in unweighted graph):**

```python
from collections import deque
def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

2. **DFS (connectivity, cycle detection):**

```python
def dfs(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```

3. **Grid as graph** -- for island problems, treat each cell as a node with 4 neighbors:

```python
def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
            return
        grid[r][c] = '0'  # mark visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count
```

4. **Topological sort** (Kahn's algorithm -- BFS-based):

```python
from collections import deque, defaultdict
def topological_sort(num_nodes, edges):
    graph = defaultdict(list)
    in_degree = [0] * num_nodes
    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1

    queue = deque([i for i in range(num_nodes) if in_degree[i] == 0])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != num_nodes:
        return []  # cycle detected
    return order
```

5. **Dijkstra's algorithm** (shortest path in weighted graph with non-negative weights):

```python
import heapq
def dijkstra(graph, start):
    # graph[u] = [(v, weight), ...]
    dist = {start: 0}
    heap = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float('inf')):
            continue  # stale entry
        for v, weight in graph[u]:
            new_dist = d + weight
            if new_dist < dist.get(v, float('inf')):
                dist[v] = new_dist
                heapq.heappush(heap, (new_dist, v))
    return dist
```

### Must-Know Problems

**Number of Islands** (LeetCode 200)
- Approach: DFS/BFS on grid. For each unvisited '1', increment count and flood-fill (mark all connected '1's as visited).
- Key insight: this is connected components on an implicit graph.

**Course Schedule** (LeetCode 207) / **Course Schedule II** (LeetCode 210)
- Approach: Topological sort. Build a directed graph from prerequisites, detect if a valid ordering exists (no cycles).
- Key insight: if topological sort does not include all nodes, there is a cycle (impossible to finish all courses).

**Clone Graph** (LeetCode 133)
- Approach: BFS or DFS with a hash map mapping original node to cloned node. When visiting a neighbor, if not yet cloned, clone it and add to the map.
- Key insight: the hash map serves double duty -- it tracks visited nodes and stores the mapping.
