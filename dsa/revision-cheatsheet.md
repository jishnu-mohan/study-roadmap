# DSA Revision Cheatsheet -- Quick Reference

> A compact, rapid-review guide for data structures, algorithms, patterns, and code templates.

---

## 1. Master Complexity Table

| Data Structure | Access | Search | Insert | Delete | Space |
|---|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) | O(n) |
| Dynamic Array | O(1) | O(n) | O(1) amortized* | O(n) | O(n) |
| Singly Linked List | O(n) | O(n) | O(1)** | O(1)** | O(n) |
| Doubly Linked List | O(n) | O(n) | O(1)** | O(1)** | O(n) |
| Stack | O(n) | O(n) | O(1) | O(1) | O(n) |
| Queue | O(n) | O(n) | O(1) | O(1) | O(n) |
| Hash Map | N/A | O(1) avg, O(n) worst | O(1) avg, O(n) worst | O(1) avg, O(n) worst | O(n) |
| Hash Set | N/A | O(1) avg, O(n) worst | O(1) avg, O(n) worst | O(1) avg, O(n) worst | O(n) |
| BST (balanced, avg) | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| BST (worst, degenerate) | O(n) | O(n) | O(n) | O(n) | O(n) |
| Min/Max Heap | O(n)*** | O(n) | O(log n) | O(log n) | O(n) |
| Trie | O(m) | O(m) | O(m) | O(m) | O(ALPHABET * m * n) |
| Graph (Adjacency List) | N/A | O(V + E) | O(1) | O(E) | O(V + E) |
| Graph (Adjacency Matrix) | O(1) | O(V) | O(1) | O(1) | O(V^2) |

`*` Append is O(1) amortized; insert at arbitrary index is O(n).
`**` O(1) if you have a reference to the node; O(n) if you must find it first.
`***` Access to min/max is O(1); access to arbitrary element is O(n).
`m` = length of key/word for Trie operations.

---

## 2. Sorting Algorithms Summary

| Algorithm | Best | Average | Worst | Space | Stable? | When to Use |
|---|---|---|---|---|---|---|
| Quick Sort | O(n log n) | O(n log n) | O(n^2) | O(log n) | No | General purpose; fast in practice with good pivot selection |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | When stability matters; linked lists; external sorting |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No | When O(1) extra space is required; guaranteed O(n log n) |
| Counting Sort | O(n + k) | O(n + k) | O(n + k) | O(k) | Yes | Small integer range k; values are bounded |
| Radix Sort | O(d * (n + k)) | O(d * (n + k)) | O(d * (n + k)) | O(n + k) | Yes | Fixed-length integers or strings; d = number of digits |
| Bucket Sort | O(n + k) | O(n + k) | O(n^2) | O(n + k) | Depends | Uniformly distributed floating point data |

**Language notes:**
- **TypeScript:** `Array.prototype.sort()` uses Timsort in V8 (Chrome/Node.js) -- O(n log n) worst case, stable. Note: the default comparator sorts lexicographically, so always provide an explicit comparator for numbers (e.g., `(a, b) => a - b`).
- **Java:** `Arrays.sort()` uses dual-pivot Quicksort for primitives (not stable) and Timsort for objects (stable) -- both O(n log n) worst case, O(n) space for the Timsort variant.

Timsort is a hybrid of merge sort and insertion sort, O(n) best case on nearly sorted data.

---

## 3. Pattern Recognition Decision Tree

```
What does the problem ask for?
|
+-- Input is sorted, or you are searching in a sorted/monotonic space?
|   |
|   +-- Searching for a specific value or boundary?
|   |   --> Binary Search
|   |
|   +-- Comparing elements from both ends?
|       --> Two Pointers (opposite direction)
|
+-- Subarray or substring with some constraint (max length, sum, distinct chars)?
|   |
|   +-- Window size is fixed?
|   |   --> Fixed Sliding Window
|   |
|   +-- Window size varies based on a condition?
|       --> Variable Sliding Window (expand right, shrink left)
|
+-- Need all combinations, permutations, or subsets?
|   --> Backtracking
|       (Prune early with constraints to avoid TLE)
|
+-- Optimization problem (min/max) with overlapping subproblems?
|   |
|   +-- Can you define a recurrence relation?
|   |   --> Dynamic Programming
|   |
|   +-- Does the problem have optimal substructure but no overlapping subproblems?
|       --> Greedy
|
+-- Tree or graph traversal?
|   |
|   +-- Shortest path in unweighted graph?
|   |   --> BFS
|   |
|   +-- Shortest path in weighted graph?
|   |   |
|   |   +-- Non-negative weights?
|   |   |   --> Dijkstra
|   |   |
|   |   +-- Negative weights possible?
|   |       --> Bellman-Ford
|   |
|   +-- Explore all paths, connectivity, or cycle detection?
|   |   --> DFS
|   |
|   +-- Ordering with dependencies (prerequisites)?
|       --> Topological Sort (Kahn's BFS or DFS with finish-time)
|
+-- Next greater / next smaller element?
|   --> Monotonic Stack
|
+-- Top K, Kth largest/smallest, or stream of elements?
|   --> Heap / Priority Queue
|       (Min-heap of size k for kth largest; max-heap of size k for kth smallest)
|
+-- Group items, detect cycles in undirected graph, or connect components?
|   --> Union-Find (Disjoint Set Union)
|
+-- Overlapping intervals, scheduling, or range problems?
|   --> Sort by start or end time + Greedy / Line Sweep
|
+-- String matching or prefix-based lookups?
|   --> Trie (Prefix Tree)
|
+-- Need O(1) access + O(1) insert/delete of most/least recent?
|   --> Hash Map + Doubly Linked List (LRU Cache pattern)
```

---

## 4. Code Templates

### 4.1 Binary Search

```typescript
// Standard binary search -- find exact target
function binarySearch(nums: number[], target: number): number {
    let lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

// bisect_left equivalent -- find the leftmost position where target can be inserted
function bisectLeft(nums: number[], target: number): number {
    let lo = 0, hi = nums.length;
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// Binary search on the answer -- when checking feasibility
function binarySearchOnAnswer(lo: number, hi: number, isFeasible: (mid: number) => boolean): number {
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (isFeasible(mid)) hi = mid;        // try smaller
        else lo = mid + 1;                    // need bigger
    }
    return lo;
}
```

```java
// Standard binary search -- find exact target
public int binarySearch(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

// bisect_left equivalent -- find the leftmost position where target can be inserted
public int bisectLeft(int[] nums, int target) {
    int lo = 0, hi = nums.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// Binary search on the answer -- when checking feasibility
public int binarySearchOnAnswer(int lo, int hi, Predicate<Integer> isFeasible) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (isFeasible.test(mid)) hi = mid;        // try smaller
        else lo = mid + 1;                          // need bigger
    }
    return lo;
}
```

```python
# Standard binary search -- find exact target
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

# bisect_left equivalent -- find the leftmost position where target can be inserted
def bisect_left(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

# Binary search on the answer -- when checking feasibility
def binary_search_on_answer(lo, hi, is_feasible):
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if is_feasible(mid):
            hi = mid        # try smaller
        else:
            lo = mid + 1    # need bigger
    return lo
```

### 4.2 BFS (Graph + Tree Level Order)

```typescript
// BFS on a graph (adjacency list)
function bfsGraph(graph: Map<number, number[]>, start: number): void {
    const visited = new Set<number>([start]);
    const queue: number[] = [start];
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

// BFS level-order traversal on a binary tree
interface TreeNode {
    val: number;
    left: TreeNode | null;
    right: TreeNode | null;
}

function levelOrder(root: TreeNode | null): number[][] {
    if (!root) return [];
    const result: number[][] = [];
    const queue: TreeNode[] = [root];
    let front = 0;
    while (front < queue.length) {
        const levelSize = queue.length - front;
        const level: number[] = [];
        for (let i = 0; i < levelSize; i++) {
            const node = queue[front++];
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        result.push(level);
    }
    return result;
}
```

```java
import java.util.*;

// BFS on a graph (adjacency list)
public void bfsGraph(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    visited.add(start);
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    queue.offer(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.offer(neighbor);
            }
        }
    }
}

// BFS level-order traversal on a binary tree
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    ArrayDeque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

```python
from collections import deque

# BFS on a graph (adjacency list)
def bfs_graph(graph, start):
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

# BFS level-order traversal on a binary tree
def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)
        level = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

### 4.3 DFS (Recursive + Iterative)

```typescript
// DFS recursive on a graph
function dfsRecursive(graph: Map<number, number[]>, node: number, visited: Set<number>): void {
    visited.add(node);
    for (const neighbor of graph.get(node) ?? []) {
        if (!visited.has(neighbor)) {
            dfsRecursive(graph, neighbor, visited);
        }
    }
}

// DFS iterative on a graph
function dfsIterative(graph: Map<number, number[]>, start: number): void {
    const visited = new Set<number>();
    const stack: number[] = [start];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (visited.has(node)) continue;
        visited.add(node);
        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                stack.push(neighbor);
            }
        }
    }
}
```

```java
// DFS recursive on a graph
public void dfsRecursive(Map<Integer, List<Integer>> graph, int node, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : graph.getOrDefault(node, List.of())) {
        if (!visited.contains(neighbor)) {
            dfsRecursive(graph, neighbor, visited);
        }
    }
}

// DFS iterative on a graph
public void dfsIterative(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    ArrayDeque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited.contains(node)) continue;
        visited.add(node);
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                stack.push(neighbor);
            }
        }
    }
}
```

```python
# DFS recursive on a graph
def dfs_recursive(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs_recursive(graph, neighbor, visited)

# DFS iterative on a graph
def dfs_iterative(graph, start):
    visited = set()
    stack = [start]
    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                stack.append(neighbor)
```

### 4.4 Sliding Window (Variable Size)

```typescript
function slidingWindow(arr: number[]): number {
    let left = 0;
    const windowState = new Map<number, number>();    // or a counter, sum, etc.
    let result = 0;

    for (let right = 0; right < arr.length; right++) {
        // Expand: add arr[right] to window state
        // ...

        // Shrink: while the window is invalid
        while (windowIsInvalid(windowState)) {
            // Remove arr[left] from window state
            // ...
            left++;
        }

        // Update result with current valid window
        result = Math.max(result, right - left + 1);
    }

    return result;
}
```

```java
public int slidingWindow(int[] arr) {
    int left = 0;
    Map<Integer, Integer> windowState = new HashMap<>();    // or a counter, sum, etc.
    int result = 0;

    for (int right = 0; right < arr.length; right++) {
        // Expand: add arr[right] to window state
        // ...

        // Shrink: while the window is invalid
        while (windowIsInvalid(windowState)) {
            // Remove arr[left] from window state
            // ...
            left++;
        }

        // Update result with current valid window
        result = Math.max(result, right - left + 1);
    }

    return result;
}
```

```python
def sliding_window(arr):
    left = 0
    window_state = {}    # or a counter, sum, etc.
    result = 0

    for right in range(len(arr)):
        # Expand: add arr[right] to window state
        # ...

        # Shrink: while the window is invalid
        while window_is_invalid(window_state):
            # Remove arr[left] from window state
            # ...
            left += 1

        # Update result with current valid window
        result = max(result, right - left + 1)

    return result
```

### 4.5 Two Pointers

```typescript
// Opposite direction (e.g., two sum in sorted array, palindrome check)
function twoPointersOpposite(arr: number[], target: number): number[] | null {
    let left = 0, right = arr.length - 1;
    while (left < right) {
        const current = arr[left] + arr[right];
        if (current === target) return [left, right];
        else if (current < target) left++;
        else right--;
    }
    return null;
}

// Same direction (e.g., remove duplicates, partition)
function twoPointersSame(arr: number[]): number {
    let slow = 0;
    for (let fast = 0; fast < arr.length; fast++) {
        if (someCondition(arr[fast])) {
            arr[slow] = arr[fast];
            slow++;
        }
    }
    return slow;
}
```

```java
// Opposite direction (e.g., two sum in sorted array, palindrome check)
public int[] twoPointersOpposite(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int current = arr[left] + arr[right];
        if (current == target) return new int[]{left, right};
        else if (current < target) left++;
        else right--;
    }
    return new int[]{};
}

// Same direction (e.g., remove duplicates, partition)
public int twoPointersSame(int[] arr) {
    int slow = 0;
    for (int fast = 0; fast < arr.length; fast++) {
        if (someCondition(arr[fast])) {
            arr[slow] = arr[fast];
            slow++;
        }
    }
    return slow;
}
```

```python
# Opposite direction (e.g., two sum in sorted array, palindrome check)
def two_pointers_opposite(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        current = arr[left] + arr[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1

# Same direction (e.g., remove duplicates, partition)
def two_pointers_same(arr):
    slow = 0
    for fast in range(len(arr)):
        if some_condition(arr[fast]):
            arr[slow] = arr[fast]
            slow += 1
    return slow
```

### 4.6 Backtracking (Subsets / Permutations)

```typescript
// Subsets pattern
function subsets(nums: number[]): number[][] {
    const result: number[][] = [];
    function backtrack(start: number, path: number[]): void {
        result.push([...path]);          // collect at every node
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);
            backtrack(i + 1, path);      // i + 1 to avoid reuse
            path.pop();
        }
    }
    backtrack(0, []);
    return result;
}

// Permutations pattern
function permutations(nums: number[]): number[][] {
    const result: number[][] = [];
    function backtrack(path: number[], used: boolean[]): void {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.push(nums[i]);
            backtrack(path, used);
            path.pop();
            used[i] = false;
        }
    }
    backtrack([], new Array(nums.length).fill(false));
    return result;
}
```

```java
// Subsets pattern
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrackSubsets(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrackSubsets(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
    result.add(new ArrayList<>(path));          // collect at every node
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        backtrackSubsets(nums, i + 1, path, result);      // i + 1 to avoid reuse
        path.remove(path.size() - 1);
    }
}

// Permutations pattern
public List<List<Integer>> permutations(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrackPermutations(nums, new ArrayList<>(), new boolean[nums.length], result);
    return result;
}

private void backtrackPermutations(int[] nums, List<Integer> path, boolean[] used, List<List<Integer>> result) {
    if (path.size() == nums.length) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrackPermutations(nums, path, used, result);
        path.remove(path.size() - 1);
        used[i] = false;
    }
}
```

```python
# Subsets pattern
def subsets(nums):
    result = []
    def backtrack(start, path):
        result.append(path[:])          # collect at every node
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)      # i + 1 to avoid reuse
            path.pop()
    backtrack(0, [])
    return result

# Permutations pattern
def permutations(nums):
    result = []
    def backtrack(path, used):
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack(path, used)
            path.pop()
            used[i] = False
    backtrack([], [False] * len(nums))
    return result
```

### 4.7 Topological Sort (Kahn's BFS)

```typescript
function topologicalSort(numNodes: number, edges: [number, number][]): number[] {
    const graph = new Map<number, number[]>();
    const inDegree = new Array(numNodes).fill(0);

    for (const [u, v] of edges) {
        if (!graph.has(u)) graph.set(u, []);
        graph.get(u)!.push(v);
        inDegree[v]++;
    }

    const queue: number[] = [];
    let front = 0;
    for (let i = 0; i < numNodes; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }
    const order: number[] = [];

    while (front < queue.length) {
        const node = queue[front++];
        order.push(node);
        for (const neighbor of graph.get(node) ?? []) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }

    if (order.length !== numNodes) return [];       // cycle detected
    return order;
}
```

```java
public int[] topologicalSort(int numNodes, int[][] edges) {
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
            if (inDegree[neighbor] == 0) queue.offer(neighbor);
        }
    }

    if (order.size() != numNodes) return new int[]{};       // cycle detected
    return order.stream().mapToInt(Integer::intValue).toArray();
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
        return []       # cycle detected
    return order
```

### 4.8 Union-Find (Disjoint Set Union)

```typescript
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
            this.parent[x] = this.find(this.parent[x]);     // path compression
        }
        return this.parent[x];
    }

    union(x: number, y: number): boolean {
        let px = this.find(x), py = this.find(y);
        if (px === py) return false;        // already connected
        // union by rank
        if (this.rank[px] < this.rank[py]) [px, py] = [py, px];
        this.parent[py] = px;
        if (this.rank[px] === this.rank[py]) this.rank[px]++;
        this.components--;
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
    private int components;

    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);     // path compression
        }
        return parent[x];
    }

    public boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;        // already connected
        // union by rank
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        components--;
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
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])     # path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False        # already connected
        # union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        self.components -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

### 4.9 Dijkstra's Algorithm

```typescript
// graph: Map of {node: [[neighbor, weight], ...]}
function dijkstra(graph: Map<number, [number, number][]>, start: number, n: number): number[] {
    const dist = new Array(n).fill(Infinity);
    dist[start] = 0;
    // Priority queue as sorted array (use a proper min-heap library for production)
    // Elements: [distance, node]
    const heap: [number, number][] = [[0, start]];

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0]);
        const [d, u] = heap.shift()!;
        if (d > dist[u]) continue;        // stale entry
        for (const [v, w] of graph.get(u) ?? []) {
            const newDist = d + w;
            if (newDist < dist[v]) {
                dist[v] = newDist;
                heap.push([newDist, v]);
            }
        }
    }

    return dist;
}
```

```java
// graph: Map of {node: List of [neighbor, weight]}
public int[] dijkstra(Map<Integer, List<int[]>> graph, int start, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[start] = 0;
    // PriorityQueue: [distance, node]
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    heap.offer(new int[]{0, start});

    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;        // stale entry
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            int v = edge[0], w = edge[1];
            int newDist = d + w;
            if (newDist < dist[v]) {
                dist[v] = newDist;
                heap.offer(new int[]{newDist, v});
            }
        }
    }

    return dist;
}
```

```python
import heapq
from collections import defaultdict

def dijkstra(graph, start, n):
    """graph: dict of {node: [(neighbor, weight), ...]}"""
    dist = [float('inf')] * n
    dist[start] = 0
    heap = [(0, start)]     # (distance, node)

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue        # stale entry
        for v, w in graph[u]:
            new_dist = d + w
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(heap, (new_dist, v))

    return dist
```

### 4.10 Monotonic Stack

```typescript
// Next Greater Element pattern
function nextGreater(nums: number[]): number[] {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack: number[] = [];              // stack of indices, values are monotonically decreasing

    for (let i = 0; i < n; i++) {
        while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
            const idx = stack.pop()!;
            result[idx] = nums[i];
        }
        stack.push(i);
    }

    return result;
}
```

```java
// Next Greater Element pattern
public int[] nextGreater(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    ArrayDeque<Integer> stack = new ArrayDeque<>();   // stack of indices, values are monotonically decreasing

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && nums[i] > nums[stack.peek()]) {
            int idx = stack.pop();
            result[idx] = nums[i];
        }
        stack.push(i);
    }

    return result;
}
```

```python
# Next Greater Element pattern
def next_greater(nums):
    n = len(nums)
    result = [-1] * n
    stack = []              # stack of indices, values are monotonically decreasing

    for i in range(n):
        while stack and nums[i] > nums[stack[-1]]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result
```

### 4.11 Dynamic Programming Templates

```typescript
// 1D DP (e.g., climbing stairs, house robber)
function dp1D(n: number): number {
    const dp = new Array(n + 1).fill(0);
    dp[0] = baseCase0;
    dp[1] = baseCase1;
    for (let i = 2; i <= n; i++) {
        dp[i] = recurrence(dp[i - 1], dp[i - 2]);
    }
    return dp[n];
}

// Space-optimized 1D DP (when only previous 1-2 states matter)
function dp1DOptimized(n: number): number {
    let prev2 = baseCase0, prev1 = baseCase1;
    for (let i = 2; i <= n; i++) {
        const curr = recurrence(prev1, prev2);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}

// 2D DP (e.g., LCS, edit distance, grid paths)
function dp2D(text1: string, text2: string): number {
    const m = text1.length, n = text2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[m][n];
}
```

```java
// 1D DP (e.g., climbing stairs, house robber)
public int dp1D(int n) {
    int[] dp = new int[n + 1];
    dp[0] = baseCase0;
    dp[1] = baseCase1;
    for (int i = 2; i <= n; i++) {
        dp[i] = recurrence(dp[i - 1], dp[i - 2]);
    }
    return dp[n];
}

// Space-optimized 1D DP (when only previous 1-2 states matter)
public int dp1DOptimized(int n) {
    int prev2 = baseCase0, prev1 = baseCase1;
    for (int i = 2; i <= n; i++) {
        int curr = recurrence(prev1, prev2);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}

// 2D DP (e.g., LCS, edit distance, grid paths)
public int dp2D(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[m][n];
}
```

```python
# 1D DP (e.g., climbing stairs, house robber)
def dp_1d(n):
    dp = [0] * (n + 1)
    dp[0] = base_case_0
    dp[1] = base_case_1
    for i in range(2, n + 1):
        dp[i] = recurrence(dp[i-1], dp[i-2])
    return dp[n]

# Space-optimized 1D DP (when only previous 1-2 states matter)
def dp_1d_optimized(n):
    prev2, prev1 = base_case_0, base_case_1
    for i in range(2, n + 1):
        curr = recurrence(prev1, prev2)
        prev2, prev1 = prev1, curr
    return prev1

# 2D DP (e.g., LCS, edit distance, grid paths)
def dp_2d(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    return dp[m][n]
```

### 4.12 Trie Implementation

```typescript
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEnd: boolean = false;
}

class Trie {
    root: TrieNode = new TrieNode();

    insert(word: string): void {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) {
                node.children.set(ch, new TrieNode());
            }
            node = node.children.get(ch)!;
        }
        node.isEnd = true;
    }

    search(word: string): boolean {
        const node = this._find(word);
        return node !== null && node.isEnd;
    }

    startsWith(prefix: string): boolean {
        return this._find(prefix) !== null;
    }

    private _find(prefix: string): TrieNode | null {
        let node: TrieNode = this.root;
        for (const ch of prefix) {
            if (!node.children.has(ch)) return null;
            node = node.children.get(ch)!;
        }
        return node;
    }
}
```

```java
class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean isEnd = false;
}

class Trie {
    TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node.children.putIfAbsent(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    public boolean search(String word) {
        TrieNode node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private TrieNode find(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            if (!node.children.containsKey(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }
}
```

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def _find(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
```

---

## 5. Common Edge Cases Checklist

Use this before submitting any solution. Walk through each applicable case mentally.

- [ ] Empty input (empty array, empty string, null tree root)
- [ ] Single element (array of length 1, single character string, tree with one node)
- [ ] Two elements (often reveals off-by-one errors)
- [ ] All same elements / all duplicates
- [ ] Negative numbers (especially in product, sum, and DP problems)
- [ ] Zero in the input (division, multiplication edge cases)
- [ ] Integer overflow (TypeScript uses 64-bit floats so precision is lost beyond 2^53; Java int/long can overflow -- use `long` or `BigInteger` as needed)
- [ ] Already sorted input
- [ ] Reverse sorted input
- [ ] Null nodes in trees (left-only or right-only children)
- [ ] Disconnected graph (not all nodes are reachable)
- [ ] Graph with cycles (especially in DFS -- need visited tracking)
- [ ] Self-loops and parallel edges in graphs
- [ ] Very large input (will O(n^2) TLE? do you need O(n log n) or O(n)?)
- [ ] Result does not exist (no valid answer -- what should you return?)
- [ ] Duplicate entries in input that should produce distinct output

---

## 6. Math and Number Theory Quick Reference

### GCD (Greatest Common Divisor) -- Euclidean Algorithm
```typescript
function gcd(a: number, b: number): number {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}
// No built-in GCD in TypeScript/JavaScript -- use the function above
```

```java
public int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
// Or use the built-in: BigInteger.valueOf(a).gcd(BigInteger.valueOf(b)).intValue()
```

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

# Python built-in:
from math import gcd
```

### LCM (Least Common Multiple)
```typescript
function lcm(a: number, b: number): number {
    return Math.floor(a * b / gcd(a, b));
}
```

```java
public int lcm(int a, int b) {
    return a / gcd(a, b) * b;    // divide first to avoid overflow
}
```

```python
def lcm(a, b):
    return a * b // gcd(a, b)

# Python 3.9+:
from math import lcm
```

### Modular Arithmetic
```
(a + b) % m = ((a % m) + (b % m)) % m
(a * b) % m = ((a % m) * (b % m)) % m
(a - b) % m = ((a % m) - (b % m) + m) % m
# Division requires modular inverse: a / b mod m = a * b^(m-2) mod m  (when m is prime, by Fermat's little theorem)
# Compute b^(m-2) mod m via fast exponentiation (TS: write your own modPow; Java: BigInteger.modPow)
```

### Power of 2 Check
```typescript
function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}
```

```java
public boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
```

```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0
```

### Bit Manipulation Cheat Sheet

| Operation | Code | Example |
|---|---|---|
| Set bit at position i | `n \| (1 << i)` | Set bit 2: `5 \| 4 = 7` (101 -> 111) |
| Clear bit at position i | `n & ~(1 << i)` | Clear bit 1: `7 & ~2 = 5` (111 -> 101) |
| Toggle bit at position i | `n ^ (1 << i)` | Toggle bit 0: `6 ^ 1 = 7` (110 -> 111) |
| Check bit at position i | `(n >> i) & 1` | Check bit 1 of 6: `(6 >> 1) & 1 = 1` |
| Clear lowest set bit | `n & (n - 1)` | `12 & 11 = 8` (1100 -> 1000) |
| Isolate lowest set bit | `n & (-n)` | `12 & -12 = 4` (isolates 100) |
| Count set bits | TS: Brian Kernighan's loop; Java: `Integer.bitCount(n)` | Or use Brian Kernighan's algorithm (clear lowest set bit in a loop) |

### XOR Properties
```
a ^ a = 0           (cancellation)
a ^ 0 = a           (identity)
a ^ b = b ^ a       (commutative)
(a ^ b) ^ c = a ^ (b ^ c)   (associative)
```

### Useful Math Formulas
```
Sum of 1..n:          n * (n + 1) // 2
Sum of squares 1..n:  n * (n + 1) * (2n + 1) // 6
Number of bits:       floor(log2(n)) + 1  (TS: Math.floor(Math.log2(n)) + 1; Java: Integer.SIZE - Integer.numberOfLeadingZeros(n))
```

---

## Quick Recall: Standard Library for Interviews

### TypeScript / JavaScript

```typescript
// No direct equivalents to Python's rich standard library -- know these patterns:
// Map<K, V>              -- hash map (like dict / defaultdict)
// Set<T>                 -- hash set
// Array                  -- dynamic array, use as stack (push/pop) or queue (shift, but O(n))
// For a proper queue, use an index-based approach or a linked-list-based implementation
// Math.max, Math.min, Math.floor, Math.ceil, Math.log2, Math.abs
// Infinity, -Infinity    -- equivalent to float('inf')
// JSON.parse / JSON.stringify  -- serialization
// String.prototype: .split(), .includes(), .indexOf(), .slice(), .charCodeAt()
// Array.prototype: .sort((a,b) => a-b), .map(), .filter(), .reduce(), .flat()
// Note: no built-in heap or sorted set -- implement or use a library (e.g., mnemonist)
```

### Java

```java
import java.util.*;

// HashMap<K, V>          -- hash map (map.getOrDefault, map.computeIfAbsent)
// HashSet<T>             -- hash set
// ArrayList<T>           -- dynamic array
// ArrayDeque<T>          -- double-ended queue; use as stack (push/pop) or queue (offer/poll)
// PriorityQueue<T>       -- min-heap by default; use Comparator.reverseOrder() for max-heap
// TreeMap<K, V>          -- sorted map (red-black tree); .floorKey(), .ceilingKey()
// TreeSet<T>             -- sorted set; .floor(), .ceiling(), .higher(), .lower()
// Collections.sort()     -- stable sort (Timsort for objects)
// Arrays.sort()          -- dual-pivot quicksort for primitives, Timsort for objects
// Arrays.fill(), Arrays.copyOf(), Arrays.binarySearch()
// Math.max, Math.min, Math.abs, Math.ceil, Math.floor, Math.log
// Integer.MAX_VALUE, Integer.MIN_VALUE, Long.MAX_VALUE
// Integer.bitCount(n), Integer.numberOfLeadingZeros(n)
// String: .charAt(), .substring(), .toCharArray(), .indexOf(), .split()
// StringBuilder          -- mutable string for efficient concatenation
```

### Python

```python
from collections import defaultdict, Counter, deque, OrderedDict
from heapq import heappush, heappop, heapify       # min-heap only; negate for max-heap
from bisect import bisect_left, bisect_right, insort
from functools import lru_cache                     # memoization for top-down DP
from itertools import combinations, permutations, product
from math import gcd, lcm, inf, ceil, floor, log2
import string   # string.ascii_lowercase, string.digits
```
