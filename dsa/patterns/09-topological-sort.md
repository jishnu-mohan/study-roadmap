# Topological Sort

[SR] Tag: topological-sort, dag, ordering, prerequisites, dependencies

### When to Recognize

- Problem involves **dependencies** or **prerequisites** (do X before Y).
- Input is a **Directed Acyclic Graph (DAG)** or can be modeled as one.
- Keywords: "ordering", "schedule", "course prerequisites", "build order", "alien dictionary".
- Problem asks if a valid ordering exists or to produce one.

### Core Idea

Topological sort produces a linear ordering of vertices such that for every directed
edge u -> v, u comes before v. It only works on DAGs -- if a cycle exists, no valid
ordering is possible. Kahn's algorithm (BFS-based) processes nodes with in-degree 0
first and is often preferred because it naturally detects cycles (if not all nodes are
processed, a cycle exists).

### Python Code Template

```python
from collections import deque, defaultdict

# Kahn's Algorithm (BFS-based topological sort)
def topological_sort_bfs(num_nodes, edges):
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

    if len(order) == num_nodes:
        return order   # valid topological order
    else:
        return []      # cycle detected

# DFS-based topological sort
def topological_sort_dfs(num_nodes, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * num_nodes
    order = []
    has_cycle = False

    def dfs(node):
        nonlocal has_cycle
        if has_cycle:
            return
        color[node] = GRAY
        for neighbor in graph[node]:
            if color[neighbor] == GRAY:
                has_cycle = True
                return
            if color[neighbor] == WHITE:
                dfs(neighbor)
        color[node] = BLACK
        order.append(node)

    for i in range(num_nodes):
        if color[i] == WHITE:
            dfs(i)

    if has_cycle:
        return []
    return order[::-1]  # reverse post-order
```

### Classic Example Walkthrough: Course Schedule II (LC 210)

**Problem:** Given numCourses and prerequisites, return the ordering of courses. Return empty if impossible.

```python
def findOrder(numCourses, prerequisites):
    graph = defaultdict(list)
    in_degree = [0] * numCourses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])
    order = []

    while queue:
        course = queue.popleft()
        order.append(course)
        for next_course in graph[course]:
            in_degree[next_course] -= 1
            if in_degree[next_course] == 0:
                queue.append(next_course)

    return order if len(order) == numCourses else []
```

**Step-by-step with numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]:**

1. Graph: 0->[1,2], 1->[3], 2->[3]. In-degree: [0,1,1,2].
2. Queue starts with nodes having in-degree 0: [0].
3. Process 0: order=[0]. Decrement in-degree of 1 (now 0) and 2 (now 0). Queue=[1,2].
4. Process 1: order=[0,1]. Decrement in-degree of 3 (now 1). Queue=[2].
5. Process 2: order=[0,1,2]. Decrement in-degree of 3 (now 0). Queue=[3].
6. Process 3: order=[0,1,2,3]. Queue empty.
7. len(order)=4 == numCourses, so return [0,1,2,3].

### Variations

- **Course Schedule (LC 207)** -- just detect if valid ordering exists (cycle detection).
- **Alien Dictionary (LC 269)** -- build graph from character ordering in sorted alien words.
- **Minimum Height Trees (LC 310)** -- iterative leaf removal (related to topological thinking).
- **Parallel Courses (LC 1136)** -- topological sort with level tracking for minimum semesters.

### Edge Cases

- No prerequisites (all courses can be taken in any order, all have in-degree 0).
- Cycle in prerequisites (return empty list).
- Self-loop (course depends on itself -- cycle).
- Disconnected graph (multiple independent chains).
- Single course.

### Complexity

- **Time:** O(V + E) where V = number of nodes, E = number of edges.
- **Space:** O(V + E) for the graph and in-degree array.
