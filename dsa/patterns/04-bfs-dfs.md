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

### Python Code Template

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
- Very deep recursion in DFS (may hit Python recursion limit -- use iterative DFS or increase limit).
- Single node graph.

### Complexity

- **Time:** O(V + E) for graphs, O(rows * cols) for grids.
- **Space:** O(V) for visited set. O(V) worst-case queue/stack. DFS recursion depth can be O(V).
