# Union-Find (Disjoint Set)

**[SR]**

### What It Is

**Union-Find** (also called Disjoint Set Union, DSU) is a data structure that tracks a set of elements partitioned into disjoint (non-overlapping) subsets. It supports two operations efficiently:

- **Find(x)**: determine which set element x belongs to (returns the "representative" or "root" of the set).
- **Union(x, y)**: merge the sets containing x and y.

It answers the question: "Are x and y in the same group?" in nearly O(1) time.

### How It Works Internally

**Core idea**: represent each set as a tree. Each element points to a parent. The root of the tree is the representative of the set.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))  # each element is its own parent
        self.rank = [0] * n           # rank for union by rank

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x == root_y:
            return False  # already in same set
        # Union by rank
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

**Two key optimizations that make it nearly O(1):**

1. **Path compression** (in `find`): When finding the root of x, make every node on the path point directly to the root. This flattens the tree.

2. **Union by rank** (in `union`): Always attach the shorter tree under the taller tree. This prevents the tree from becoming a long chain.

**With both optimizations, the amortized time per operation is O(alpha(n))** where alpha is the inverse Ackermann function -- effectively constant (alpha(n) <= 4 for any practically conceivable input size).

**Without optimizations:**
- Naive union: O(n) per find in worst case (long chain).
- Path compression alone: O(log n) amortized.
- Both together: O(alpha(n)) amortized -- practically O(1).

### Operations and Complexity

| Operation | Without optimizations | With path compression + union by rank |
|---|---|---|
| Find | O(n) | O(alpha(n)) -- nearly O(1) |
| Union | O(n) | O(alpha(n)) -- nearly O(1) |
| Connected | O(n) | O(alpha(n)) -- nearly O(1) |
| Space | O(n) | O(n) |

### When to Use It

- **"Connected components"** in undirected graph --> Union-Find or DFS/BFS.
- **"Are x and y connected?"** with dynamic edge additions --> Union-Find (BFS/DFS would need to re-traverse each time).
- **"Cycle detection in undirected graph"** --> if union returns False (both already in same set), adding that edge creates a cycle.
- **"Group/merge accounts/elements"** --> Union-Find.
- **"Minimum spanning tree"** (Kruskal's algorithm) --> Union-Find to check if adding an edge creates a cycle.

**Union-Find vs BFS/DFS for connected components:**
- If the graph is static (all edges known upfront): BFS/DFS is simpler.
- If edges are added dynamically: Union-Find is better because it handles incremental additions without re-traversal.

### Common Interview Patterns

1. **Connected components count**: Initialize with n components. Each successful union reduces count by 1.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n  # number of connected components

    def union(self, x, y):
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return
        # ... union by rank ...
        self.count -= 1
```

2. **Cycle detection**: If `find(u) == find(v)` before calling `union(u, v)`, the edge (u, v) creates a cycle.

3. **Mapping non-integer keys**: If nodes are strings (like email addresses), use a dictionary instead of an array for parent.

### Must-Know Problems

**Number of Connected Components in an Undirected Graph** (LeetCode 323)
- Approach: Initialize Union-Find with n nodes. Process each edge with union. Return the component count.
- Key insight: this is the textbook Union-Find application. Alternative: BFS/DFS, but Union-Find is more elegant here.

**Redundant Connection** (LeetCode 684)
- Approach: Process edges one by one. For each edge, if both endpoints are already in the same set (find returns same root), this edge is redundant (creates a cycle). Return it.
- Key insight: the first edge that would create a cycle is the answer. Union-Find detects this in O(alpha(n)) per edge.

**Accounts Merge** (LeetCode 721)
- Approach: Map each email to an index. For each account, union all its emails together. After processing all accounts, group emails by their root. Reconstruct accounts.
- Key insight: this is a connected components problem where emails are nodes and "belonging to the same account" creates edges.
