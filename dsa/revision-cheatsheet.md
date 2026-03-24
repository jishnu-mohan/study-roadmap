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

**Python note:** `list.sort()` and `sorted()` use Timsort -- O(n log n) worst case, O(n) best case (nearly sorted data), stable, O(n) space. Timsort is a hybrid of merge sort and insertion sort.

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

- [ ] Empty input (empty array, empty string, null/None tree root)
- [ ] Single element (array of length 1, single character string, tree with one node)
- [ ] Two elements (often reveals off-by-one errors)
- [ ] All same elements / all duplicates
- [ ] Negative numbers (especially in product, sum, and DP problems)
- [ ] Zero in the input (division, multiplication edge cases)
- [ ] Integer overflow (Python handles this natively, but be aware for Java/C++)
- [ ] Already sorted input
- [ ] Reverse sorted input
- [ ] Null/None nodes in trees (left-only or right-only children)
- [ ] Disconnected graph (not all nodes are reachable)
- [ ] Graph with cycles (especially in DFS -- need visited tracking)
- [ ] Self-loops and parallel edges in graphs
- [ ] Very large input (will O(n^2) TLE? do you need O(n log n) or O(n)?)
- [ ] Result does not exist (no valid answer -- what should you return?)
- [ ] Duplicate entries in input that should produce distinct output

---

## 6. Math and Number Theory Quick Reference

### GCD (Greatest Common Divisor) -- Euclidean Algorithm
```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

# Python built-in:
from math import gcd
```

### LCM (Least Common Multiple)
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
# Division requires modular inverse: a / b mod m = a * pow(b, m-2, m) mod m  (when m is prime)
```

### Power of 2 Check
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
| Count set bits | `bin(n).count('1')` | Or use Brian Kernighan's algorithm |

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
Number of bits:       floor(log2(n)) + 1  or  n.bit_length()
```

---

## Quick Recall: Python Standard Library for Interviews

```python
from collections import defaultdict, Counter, deque, OrderedDict
from heapq import heappush, heappop, heapify       # min-heap only; negate for max-heap
from bisect import bisect_left, bisect_right, insort
from functools import lru_cache                     # memoization for top-down DP
from itertools import combinations, permutations, product
from math import gcd, lcm, inf, ceil, floor, log2
import string   # string.ascii_lowercase, string.digits
```
