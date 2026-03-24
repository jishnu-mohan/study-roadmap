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

### Code Template

```typescript
// Kahn's Algorithm (BFS-based topological sort)
function topologicalSortBfs(numNodes: number, edges: number[][]): number[] {
    const graph: Map<number, number[]> = new Map();
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
    const order: number[] = [];

    while (queue.length > 0) {
        const node = queue.shift()!;
        order.push(node);
        for (const neighbor of graph.get(node) ?? []) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    if (order.length === numNodes) {
        return order;   // valid topological order
    } else {
        return [];      // cycle detected
    }
}

// DFS-based topological sort
function topologicalSortDfs(numNodes: number, edges: number[][]): number[] {
    const graph: Map<number, number[]> = new Map();
    for (const [u, v] of edges) {
        if (!graph.has(u)) graph.set(u, []);
        graph.get(u)!.push(v);
    }

    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color: number[] = new Array(numNodes).fill(WHITE);
    const order: number[] = [];
    let hasCycle = false;

    function dfs(node: number): void {
        if (hasCycle) return;
        color[node] = GRAY;
        for (const neighbor of graph.get(node) ?? []) {
            if (color[neighbor] === GRAY) {
                hasCycle = true;
                return;
            }
            if (color[neighbor] === WHITE) {
                dfs(neighbor);
            }
        }
        color[node] = BLACK;
        order.push(node);
    }

    for (let i = 0; i < numNodes; i++) {
        if (color[i] === WHITE) {
            dfs(i);
        }
    }

    if (hasCycle) return [];
    return order.reverse();  // reverse post-order
}
```

```java
// Kahn's Algorithm (BFS-based topological sort)
public List<Integer> topologicalSortBfs(int numNodes, int[][] edges) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    int[] inDegree = new int[numNodes];

    for (int[] edge : edges) {
        graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
        inDegree[edge[1]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < numNodes; i++) {
        if (inDegree[i] == 0) queue.add(i);
    }
    List<Integer> order = new ArrayList<>();

    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] == 0) {
                queue.add(neighbor);
            }
        }
    }

    if (order.size() == numNodes) {
        return order;   // valid topological order
    } else {
        return new ArrayList<>();  // cycle detected
    }
}

// DFS-based topological sort
public List<Integer> topologicalSortDfs(int numNodes, int[][] edges) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int[] edge : edges) {
        graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
    }

    int WHITE = 0, GRAY = 1, BLACK = 2;
    int[] color = new int[numNodes];
    List<Integer> order = new ArrayList<>();
    boolean[] hasCycle = {false};

    // DFS helper
    // Uses hasCycle array for mutability in nested scope
    java.util.function.IntConsumer[] dfs = new java.util.function.IntConsumer[1];
    dfs[0] = (int node) -> {
        if (hasCycle[0]) return;
        color[node] = GRAY;
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (color[neighbor] == GRAY) {
                hasCycle[0] = true;
                return;
            }
            if (color[neighbor] == WHITE) {
                dfs[0].accept(neighbor);
            }
        }
        color[node] = BLACK;
        order.add(node);
    };

    for (int i = 0; i < numNodes; i++) {
        if (color[i] == WHITE) {
            dfs[0].accept(i);
        }
    }

    if (hasCycle[0]) return new ArrayList<>();
    Collections.reverse(order);  // reverse post-order
    return order;
}
```

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

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
    const graph: Map<number, number[]> = new Map();
    const inDegree: number[] = new Array(numCourses).fill(0);

    for (const [course, prereq] of prerequisites) {
        if (!graph.has(prereq)) graph.set(prereq, []);
        graph.get(prereq)!.push(course);
        inDegree[course]++;
    }

    const queue: number[] = [];
    for (let i = 0; i < numCourses; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }
    const order: number[] = [];

    while (queue.length > 0) {
        const course = queue.shift()!;
        order.push(course);
        for (const nextCourse of graph.get(course) ?? []) {
            inDegree[nextCourse]--;
            if (inDegree[nextCourse] === 0) {
                queue.push(nextCourse);
            }
        }
    }

    return order.length === numCourses ? order : [];
}
```

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    int[] inDegree = new int[numCourses];

    for (int[] pair : prerequisites) {
        graph.computeIfAbsent(pair[1], k -> new ArrayList<>()).add(pair[0]);
        inDegree[pair[0]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.add(i);
    }
    List<Integer> order = new ArrayList<>();

    while (!queue.isEmpty()) {
        int course = queue.poll();
        order.add(course);
        for (int nextCourse : graph.getOrDefault(course, Collections.emptyList())) {
            inDegree[nextCourse]--;
            if (inDegree[nextCourse] == 0) {
                queue.add(nextCourse);
            }
        }
    }

    return order.size() == numCourses ? order.stream().mapToInt(i -> i).toArray() : new int[0];
}
```

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
