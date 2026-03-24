# BFS / DFS

[SR] Tag: bfs, dfs, tree, graph, traversal, connected-components

### When to Recognize

- Problem involves a **tree** or **graph** (explicit or implicit like a grid).
- Keywords: "shortest path" (BFS), "all paths", "connected components", "flood fill".
- Grid problems asking about regions, islands, or reachability.
- Level-order traversal or finding the nearest/shortest anything (BFS).
- Problems asking to explore all possibilities in a tree/graph structure.

### Core Idea

BFS explores nodes level by level using a queue, guaranteeing the shortest path in
unweighted graphs. DFS explores as deep as possible before backtracking, using recursion
or an explicit stack. Choose BFS when shortest path or level-order matters; choose DFS
when you need to explore all paths or the problem has a recursive structure.

### Code Template

```typescript
// BFS template (graph/grid)
function bfs(graph: Map<number, number[]>, start: number): number {
    const queue: number[] = [start];
    const visited: Set<number> = new Set([start]);
    let level = 0;

    while (queue.length > 0) {
        const size = queue.length;
        for (let i = 0; i < size; i++) {  // process current level
            const node = queue.shift()!;
            for (const neighbor of graph.get(node) ?? []) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        level++;
    }

    return level;  // or whatever result you need
}

// DFS recursive template
function dfs(graph: Map<number, number[]>, node: number, visited: Set<number>): void {
    visited.add(node);
    for (const neighbor of graph.get(node) ?? []) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}

// DFS iterative template
function dfsIterative(graph: Map<number, number[]>, start: number): void {
    const stack: number[] = [start];
    const visited: Set<number> = new Set([start]);

    while (stack.length > 0) {
        const node = stack.pop()!;
        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                stack.push(neighbor);
            }
        }
    }
}
```

```java
// BFS template (graph/grid)
public int bfs(Map<Integer, List<Integer>> graph, int start) {
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    Set<Integer> visited = new HashSet<>();
    queue.add(start);
    visited.add(start);
    int level = 0;

    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {  // process current level
            int node = queue.poll();
            for (int neighbor : graph.getOrDefault(node, List.of())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
        level++;
    }

    return level;  // or whatever result you need
}

// DFS recursive template
public void dfs(Map<Integer, List<Integer>> graph, int node, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : graph.getOrDefault(node, List.of())) {
        if (!visited.contains(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}

// DFS iterative template
public void dfsIterative(Map<Integer, List<Integer>> graph, int start) {
    ArrayDeque<Integer> stack = new ArrayDeque<>();
    Set<Integer> visited = new HashSet<>();
    stack.push(start);
    visited.add(start);

    while (!stack.isEmpty()) {
        int node = stack.pop();
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                stack.push(neighbor);
            }
        }
    }
}
```

```python
from collections import deque

# BFS template (graph/grid)
def bfs(graph, start):
    queue = deque([start])
    visited = {start}
    level = 0

    while queue:
        for _ in range(len(queue)):  # process current level
            node = queue.popleft()
            for neighbor in graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        level += 1

    return level  # or whatever result you need

# DFS recursive template
def dfs(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)

# DFS iterative template
def dfs_iterative(graph, start):
    stack = [start]
    visited = {start}

    while stack:
        node = stack.pop()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                stack.append(neighbor)
```

### Classic Example Walkthrough: Number of Islands (LC 200)

**Problem:** Given a 2D grid of '1' (land) and '0' (water), count the number of islands.

```typescript
function numIslands(grid: string[][]): number {
    if (grid.length === 0) {
        return 0;
    }

    const rows = grid.length;
    const cols = grid[0].length;
    let count = 0;

    function dfs(r: number, c: number): void {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') {
            return;
        }
        grid[r][c] = '0';  // mark visited by sinking
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
    if (grid.length == 0) {
        return 0;
    }

    int rows = grid.length, cols = grid[0].length;
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
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') {
        return;
    }
    grid[r][c] = '0';  // mark visited by sinking
    dfs(grid, r + 1, c, rows, cols);
    dfs(grid, r - 1, c, rows, cols);
    dfs(grid, r, c + 1, rows, cols);
    dfs(grid, r, c - 1, rows, cols);
}
```

```python
def numIslands(grid):
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # mark visited by sinking
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

**Step-by-step with grid:**
```
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```

1. (0,0) is '1'. Increment count=1. DFS sinks all connected land: (0,0)->(1,0)->(1,1)->(0,1). These all become '0'.
2. Scan continues. (0,1) through (1,1) are now '0'. Skip.
3. (2,2) is '1'. Increment count=2. DFS sinks (2,2). No connected land.
4. (3,3) is '1'. Increment count=3. DFS sinks (3,3)->(3,4).
5. Final count: 3 islands.

### Variations

- **Word Ladder (LC 127)** -- BFS from start word, each level transforms one character, find shortest transformation.
- **Pacific Atlantic Water Flow (LC 417)** -- DFS/BFS from ocean edges inward, find intersection.
- **Clone Graph (LC 133)** -- BFS/DFS with a visited map from original to clone.
- **Binary Tree Level Order Traversal (LC 102)** -- BFS collecting nodes per level.
- **Surrounded Regions (LC 130)** -- DFS from border 'O's, then flip remaining.

### Edge Cases

- Empty grid or graph with no edges.
- Grid with all land or all water.
- Disconnected graph (multiple components).
- Very deep recursion in DFS (may hit stack/recursion limits -- use iterative DFS or increase limit).
- Single node graph.

### Complexity

- **Time:** O(V + E) for graphs, O(rows * cols) for grids.
- **Space:** O(V) for visited set. O(V) worst-case queue/stack. DFS recursion depth can be O(V).
