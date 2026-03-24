# Union-Find (Disjoint Set)

**[SR]**

### What It Is

**Union-Find** (also called Disjoint Set Union, DSU) is a data structure that tracks a set of elements partitioned into disjoint (non-overlapping) subsets. It supports two operations efficiently:

- **Find(x)**: determine which set element x belongs to (returns the "representative" or "root" of the set).
- **Union(x, y)**: merge the sets containing x and y.

It answers the question: "Are x and y in the same group?" in nearly O(1) time.

### How It Works Internally

**Core idea**: represent each set as a tree. Each element points to a parent. The root of the tree is the representative of the set.

```typescript
class UnionFind {
    private parent: number[];
    private rank: number[];

    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);  // each element is its own parent
        this.rank = new Array(n).fill(0);                      // rank for union by rank
    }

    find(x: number): number {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);  // path compression
        }
        return this.parent[x];
    }

    union(x: number, y: number): boolean {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) {
            return false;  // already in same set
        }
        // Union by rank
        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }
        return true;
    }

    connected(x: number, y: number): boolean {
        return this.find(x) === this.find(y);
    }
}
```

```java
class UnionFind {
    private int[] parent;
    private int[] rank;

    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];  // rank for union by rank
        for (int i = 0; i < n; i++) {
            parent[i] = i;  // each element is its own parent
        }
    }

    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // path compression
        }
        return parent[x];
    }

    public boolean union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) {
            return false;  // already in same set
        }
        // Union by rank
        if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;
        }
        return true;
    }

    public boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}
```

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

```typescript
class UnionFindWithCount {
    private parent: number[];
    private rank: number[];
    count: number;  // number of connected components

    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
        this.count = n;
    }

    // find() with path compression (same as above)

    union(x: number, y: number): void {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) {
            return;
        }
        // ... union by rank ...
        this.count--;
    }
}
```

```java
class UnionFindWithCount {
    private int[] parent;
    private int[] rank;
    int count;  // number of connected components

    public UnionFindWithCount(int n) {
        parent = new int[n];
        rank = new int[n];
        count = n;
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
    }

    // find() with path compression (same as above)

    public void union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) {
            return;
        }
        // ... union by rank ...
        count--;
    }
}
```

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
