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

```typescript
// Using a Map of arrays
const graph: Map<string, string[]> = new Map([
    ['A', ['B', 'C']],
    ['B', ['A', 'D']],
    ['C', ['A']],
    ['D', ['B']],
]);

// Building from edge list
const graph2 = new Map<string, string[]>();
for (const [u, v] of edges) {
    if (!graph2.has(u)) graph2.set(u, []);
    if (!graph2.has(v)) graph2.set(v, []);
    graph2.get(u)!.push(v);
    graph2.get(v)!.push(u);  // omit for directed graph
}
```

```java
import java.util.*;

// Using a HashMap of lists
Map<String, List<String>> graph = new HashMap<>();
graph.put("A", new ArrayList<>(List.of("B", "C")));
graph.put("B", new ArrayList<>(List.of("A", "D")));
graph.put("C", new ArrayList<>(List.of("A")));
graph.put("D", new ArrayList<>(List.of("B")));

// Building from edge list
Map<String, List<String>> graph2 = new HashMap<>();
for (int[] edge : edges) {
    graph2.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
    graph2.computeIfAbsent(edge[1], k -> new ArrayList<>()).add(edge[0]); // omit for directed graph
}
```

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

```typescript
// n x n matrix where matrix[i][j] = 1 (or weight) if edge exists
const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
for (const [u, v] of edges) {
    matrix[u][v] = 1;
    matrix[v][u] = 1;  // omit for directed
}
```

```java
// n x n matrix where matrix[i][j] = 1 (or weight) if edge exists
int[][] matrix = new int[n][n];
for (int[] edge : edges) {
    matrix[edge[0]][edge[1]] = 1;
    matrix[edge[1]][edge[0]] = 1;  // omit for directed
}
```

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

```typescript
function bfs(graph: Map<string, string[]>, start: string): void {
    const visited = new Set<string>([start]);
    const queue: string[] = [start];
    let front = 0;
    while (front < queue.length) {
        const node = queue[front++];
        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
}
```

```java
import java.util.*;

public void bfs(Map<String, List<String>> graph, String start) {
    Set<String> visited = new HashSet<>();
    visited.add(start);
    ArrayDeque<String> queue = new ArrayDeque<>();
    queue.offer(start);
    while (!queue.isEmpty()) {
        String node = queue.poll();
        for (String neighbor : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.offer(neighbor);
            }
        }
    }
}
```

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

```typescript
function dfs(graph: Map<string, string[]>, node: string, visited: Set<string>): void {
    visited.add(node);
    for (const neighbor of graph.get(node) ?? []) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}
```

```java
public void dfs(Map<String, List<String>> graph, String node, Set<String> visited) {
    visited.add(node);
    for (String neighbor : graph.getOrDefault(node, List.of())) {
        if (!visited.contains(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}
```

```python
def dfs(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```

3. **Grid as graph** -- for island problems, treat each cell as a node with 4 neighbors:

```typescript
function numIslands(grid: string[][]): number {
    if (grid.length === 0) return 0;
    const rows = grid.length;
    const cols = grid[0].length;
    let count = 0;

    function dfs(r: number, c: number): void {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') {
            return;
        }
        grid[r][c] = '0';  // mark visited
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }
    return count;
}
```

```java
public int numIslands(char[][] grid) {
    if (grid.length == 0) return 0;
    int rows = grid.length;
    int cols = grid[0].length;
    int count = 0;

    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1') {
                count++;
                dfs(grid, r, c, rows, cols);
            }
        }
    }
    return count;
}

private void dfs(char[][] grid, int r, int c, int rows, int cols) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == '0') {
        return;
    }
    grid[r][c] = '0';  // mark visited
    dfs(grid, r + 1, c, rows, cols);
    dfs(grid, r - 1, c, rows, cols);
    dfs(grid, r, c + 1, rows, cols);
    dfs(grid, r, c - 1, rows, cols);
}
```

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

```typescript
function topologicalSort(numNodes: number, edges: number[][]): number[] {
    const graph = new Map<number, number[]>();
    const inDegree: number[] = new Array(numNodes).fill(0);
    for (const [u, v] of edges) {
        if (!graph.has(u)) graph.set(u, []);
        graph.get(u)!.push(v);
        inDegree[v]++;
    }

    const queue: number[] = [];
    for (let i = 0; i < numNodes; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }
    let front = 0;
    const order: number[] = [];
    while (front < queue.length) {
        const node = queue[front++];
        order.push(node);
        for (const neighbor of graph.get(node) ?? []) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    if (order.length !== numNodes) {
        return [];  // cycle detected
    }
    return order;
}
```

```java
import java.util.*;

public List<Integer> topologicalSort(int numNodes, int[][] edges) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    int[] inDegree = new int[numNodes];
    for (int[] edge : edges) {
        graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
        inDegree[edge[1]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < numNodes; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }
    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] == 0) {
                queue.offer(neighbor);
            }
        }
    }

    if (order.size() != numNodes) {
        return List.of();  // cycle detected
    }
    return order;
}
```

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

```typescript
function dijkstra(graph: Map<string, [string, number][]>, start: string): Map<string, number> {
    // graph.get(u) = [[v, weight], ...]
    const dist = new Map<string, number>([[start, 0]]);
    // Min-heap: [distance, node]
    const heap = new MinPriorityQueue<[number, string]>({ compare: (a, b) => a[0] - b[0] });
    heap.enqueue([0, start]);
    while (!heap.isEmpty()) {
        const [d, u] = heap.dequeue();
        if (d > (dist.get(u) ?? Infinity)) {
            continue;  // stale entry
        }
        for (const [v, weight] of graph.get(u) ?? []) {
            const newDist = d + weight;
            if (newDist < (dist.get(v) ?? Infinity)) {
                dist.set(v, newDist);
                heap.enqueue([newDist, v]);
            }
        }
    }
    return dist;
}
```

```java
import java.util.*;

public Map<String, Integer> dijkstra(Map<String, List<int[]>> graph, String start) {
    // graph.get(u) = [[v_index, weight], ...]
    Map<String, Integer> dist = new HashMap<>();
    dist.put(start, 0);
    // Min-heap: [distance, node]
    PriorityQueue<Object[]> heap = new PriorityQueue<>((a, b) -> (int) a[0] - (int) b[0]);
    heap.offer(new Object[]{0, start});
    while (!heap.isEmpty()) {
        Object[] entry = heap.poll();
        int d = (int) entry[0];
        String u = (String) entry[1];
        if (d > dist.getOrDefault(u, Integer.MAX_VALUE)) {
            continue;  // stale entry
        }
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            String v = String.valueOf(edge[0]);
            int weight = edge[1];
            int newDist = d + weight;
            if (newDist < dist.getOrDefault(v, Integer.MAX_VALUE)) {
                dist.put(v, newDist);
                heap.offer(new Object[]{newDist, v});
            }
        }
    }
    return dist;
}
```

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
