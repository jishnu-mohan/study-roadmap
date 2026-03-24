# Data Structures -- Comprehensive Guide for Backend SDE2 Interviews

> Audience: Intermediate programmer (7+ years TS/Node/Python), non-CS background.
> Goal: Deep understanding of internals, pattern recognition, and interview readiness.
> Each section tagged **[SR]** for spaced repetition tracking.

---

## Table of Contents

1. [Arrays and Strings](#1-arrays-and-strings)
2. [Hash Maps and Hash Sets](#2-hash-maps-and-hash-sets)
3. [Linked Lists](#3-linked-lists)
4. [Stacks and Queues](#4-stacks-and-queues)
5. [Trees](#5-trees)
6. [Heaps / Priority Queues](#6-heaps--priority-queues)
7. [Graphs](#7-graphs)
8. [Tries (Prefix Trees)](#8-tries-prefix-trees)
9. [Union-Find (Disjoint Set)](#9-union-find-disjoint-set)
10. [Master Complexity Comparison Table](#master-complexity-comparison-table)

---

## 1. Arrays and Strings

**[SR]**

### What It Is

An **array** is a contiguous block of memory that stores elements of the same type sequentially. Each element is accessible in constant time via its index because the memory address can be computed directly: `base_address + index * element_size`.

A **string** in most languages (Python, Java, Go, JS) is an immutable array of characters. Any "modification" creates a new string, which has significant performance implications.

In Python specifically:
- `list` is a dynamic array (like `std::vector` in C++ or `ArrayList` in Java).
- `str` is immutable. Concatenation in a loop is O(n^2) unless you use `"".join()`.

### How It Works Internally

**Static arrays** have fixed size determined at allocation. **Dynamic arrays** (Python `list`, JS `Array`) use the following strategy:

1. Allocate an internal buffer with some capacity (e.g., 8 slots).
2. Track the current `size` (number of elements actually stored).
3. When `size == capacity`, allocate a new buffer of `2 * capacity`, copy all elements over, and free the old buffer.
4. This doubling strategy gives **amortized O(1)** append, because the expensive O(n) copy happens exponentially less often.

**Memory layout matters**: arrays are cache-friendly because elements are contiguous. Linked lists are not. This is why arrays often outperform linked lists in practice even when big-O is the same.

**String immutability trap**:

```python
# BAD -- O(n^2) because each += creates a new string
s = ""
for char in characters:
    s += char

# GOOD -- O(n) total
s = "".join(characters)
```

### Operations and Complexity

| Operation | Average | Worst |
|---|---|---|
| Access by index | O(1) | O(1) |
| Search (unsorted) | O(n) | O(n) |
| Search (sorted) | O(log n) | O(log n) |
| Insert at end (dynamic) | O(1) amortized | O(n) when resizing |
| Insert at position i | O(n) | O(n) |
| Delete at position i | O(n) | O(n) |
| Append | O(1) amortized | O(n) |
| Slice `arr[i:j]` | O(j - i) | O(j - i) |

### When to Use It

Pattern recognition triggers:

- **"Contiguous subarray"** or **"subarray sum"** --> sliding window or prefix sum on an array.
- **"In-place"** --> modify the array without allocating a new one; often uses two pointers.
- **"Sorted array"** --> binary search or two pointers from both ends.
- **"Substring"** --> sliding window with a hash map/set for character tracking.
- **"Rearrange elements"** --> think about swapping (partitioning, Dutch National Flag).

### Common Interview Patterns

1. **Two Pointers** -- one pointer at each end, moving inward. Works on sorted arrays or when you need to compare elements from both sides.

2. **Sliding Window** -- maintain a window `[left, right]` that expands or contracts. Use for subarray/substring problems with constraints.

3. **Prefix Sum** -- precompute cumulative sums so any subarray sum `arr[i:j]` = `prefix[j] - prefix[i]` in O(1).

4. **In-place Manipulation** -- use the array itself as storage. Classic example: move zeroes to end, remove duplicates from sorted array.

5. **String Builder Pattern** -- collect characters in a list, join at the end. Avoids O(n^2) string concatenation.

### Must-Know Problems

**Two Sum** (LeetCode 1)
- Approach: Single pass with a hash map. For each number, check if `target - num` exists in the map. If not, store `num -> index`.
- Key insight: hash map turns the O(n^2) brute force into O(n).

**Container With Most Water** (LeetCode 11)
- Approach: Two pointers at both ends. Compute area, then move the pointer with the shorter height inward.
- Key insight: moving the shorter side is the only way to potentially find a larger area, because width is already decreasing.

**Longest Substring Without Repeating Characters** (LeetCode 3)
- Approach: Sliding window with a hash set (or hash map storing last index of each character). Expand right, and when a duplicate is found, shrink from left.
- Key insight: the window always contains unique characters. When you find a repeat, jump `left` to one past the previous occurrence.

---

## 2. Hash Maps and Hash Sets

**[SR]**

### What It Is

A **hash map** (dictionary in Python, `Map` in JS) stores key-value pairs with average O(1) lookup, insertion, and deletion. It works by computing a hash of the key to determine where to store the value in an internal array of "buckets."

A **hash set** is the same structure but stores only keys (no values). Use it when you need fast membership testing.

### How It Works Internally

**Step-by-step of a lookup/insert:**

1. Compute `hash(key)` -- produces an integer.
2. Compute `index = hash(key) % num_buckets` -- maps the hash to a bucket.
3. Go to that bucket and either find the key (lookup) or store the key-value pair (insert).

**Collision resolution** -- when two different keys map to the same bucket:

**Chaining (separate chaining):**
- Each bucket holds a linked list (or in modern implementations, a balanced tree when the chain gets long).
- On collision, append to the list at that bucket.
- Worst case: all keys hash to same bucket --> O(n) lookup.
- Python `dict` uses a variant of open addressing, but conceptually chaining is easiest to reason about.

**Open addressing (probing):**
- All entries stored directly in the array. On collision, probe for the next open slot.
- Linear probing: check slot+1, slot+2, ... (causes clustering).
- Quadratic probing: check slot+1, slot+4, slot+9, ... (reduces clustering).
- Double hashing: use a second hash function to determine probe step size.
- Python's `dict` uses open addressing with a custom probing sequence.

**Load factor and rehashing:**
- Load factor = `num_entries / num_buckets`.
- When load factor exceeds a threshold (commonly 0.7), the table **rehashes**: allocates a larger array (typically 2x) and re-inserts all entries.
- Rehashing is O(n) but happens infrequently, giving amortized O(1) insertions.

**Python `dict` internals (CPython 3.6+):**
- Maintains insertion order.
- Uses a compact hash table with two arrays: a sparse index table and a dense entries array.
- This is why `dict` in Python 3.7+ guarantees insertion order.

### Operations and Complexity

| Operation | Average | Worst |
|---|---|---|
| Insert | O(1) | O(n) -- rehash or all collisions |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |
| Iteration | O(n) | O(n) |

### When to Use It

- **"Find if X exists"** --> hash set for O(1) lookup.
- **"Count occurrences"** or **"frequency"** --> hash map with value as count.
- **"Group items by some property"** --> hash map with property as key, list as value.
- **"Two Sum" style** --> hash map to store complements.
- **"Find duplicates"** --> hash set.
- **"Subarray sum equals K"** --> hash map storing prefix sums.

**Map vs Set decision:**
- Need to associate keys with values? --> Map.
- Only need to check membership or uniqueness? --> Set.

### Common Interview Patterns

1. **Frequency counting** -- `collections.Counter` in Python or manual counting with a dict.

```python
from collections import Counter
freq = Counter(arr)  # {element: count}
```

2. **Two-pass vs one-pass**: Two Sum can be solved in two passes (build map, then check) or one pass (check and build simultaneously). One-pass is cleaner.

3. **Prefix sum + hash map**: For "subarray sum equals K", store prefix sums in a hash map. At each index, check if `current_prefix_sum - K` exists in the map.

```python
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = {0: 1}  # prefix_sum -> number of times seen
    for num in nums:
        prefix += num
        if prefix - k in seen:
            count += seen[prefix - k]
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

4. **Sliding window + hash map**: Track character frequencies in a window for substring problems.

### Must-Know Problems

**Group Anagrams** (LeetCode 49)
- Approach: Use sorted string as key (or a tuple of character counts). Group all strings with the same key.
- Key insight: two strings are anagrams if and only if their sorted forms are identical.

```python
from collections import defaultdict
def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))
        groups[key].append(s)
    return list(groups.values())
```

**LRU Cache** (LeetCode 146)
- Approach: Combine a hash map (for O(1) key lookup) with a doubly linked list (for O(1) removal and insertion at ends). Python's `OrderedDict` does this natively.
- Key insight: the linked list maintains access order; the map provides fast access to any node.

**Subarray Sum Equals K** (LeetCode 560)
- Approach: Prefix sum with a hash map (shown in the pattern above).
- Key insight: `sum(arr[i:j]) == K` is equivalent to `prefix[j] - prefix[i] == K`.

---

## 3. Linked Lists

**[SR]**

### What It Is

A **linked list** is a linear data structure where each element (node) contains data and a pointer (reference) to the next node. Unlike arrays, elements are not stored contiguously in memory -- each node can be anywhere in the heap.

**Singly linked list**: each node has `val` and `next`.
**Doubly linked list**: each node has `val`, `next`, and `prev`.

### How It Works Internally

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

**Memory layout comparison with arrays:**

| Property | Array | Linked List |
|---|---|---|
| Memory | Contiguous block | Scattered nodes |
| Cache performance | Excellent (spatial locality) | Poor (pointer chasing) |
| Random access | O(1) | O(n) |
| Insert at front | O(n) -- shift everything | O(1) -- change pointer |
| Insert at arbitrary position | O(n) | O(1) if you have the node reference |
| Memory overhead | None (just data) | Extra pointer per node (8 bytes on 64-bit) |

**Why linked lists still matter in interviews:** They test pointer manipulation skills, which proxy for your ability to handle complex state mutations without bugs.

### Operations and Complexity

| Operation | Singly | Doubly |
|---|---|---|
| Access by index | O(n) | O(n) |
| Insert at head | O(1) | O(1) |
| Insert at tail (with tail pointer) | O(1) | O(1) |
| Insert after a given node | O(1) | O(1) |
| Delete a given node | O(n)* | O(1) |
| Search | O(n) | O(n) |

*Singly linked list deletion requires traversal to find the previous node, unless you use the "copy next node's value" trick.

### When to Use It

- **"Rearrange nodes"** (not values) --> linked list pointer manipulation.
- **"Merge sorted lists"** --> linked list merge.
- **"Find cycle"** or **"find intersection"** --> fast/slow pointers.
- **"Reverse"** --> iterative pointer reversal.
- When a problem gives you a linked list, it is testing your pointer skills, not asking you to convert to an array.

### Common Interview Patterns

1. **Sentinel (dummy) node** -- create a dummy head to simplify edge cases (empty list, insert at head, etc.):

```python
def merge_two_lists(l1, l2):
    dummy = ListNode(0)
    current = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            current.next = l1
            l1 = l1.next
        else:
            current.next = l2
            l2 = l2.next
        current = current.next
    current.next = l1 or l2
    return dummy.next
```

2. **Fast/slow pointers (Floyd's algorithm)**:
   - **Find middle**: slow moves 1 step, fast moves 2 steps. When fast reaches end, slow is at middle.
   - **Detect cycle**: if fast and slow ever meet, there is a cycle.
   - **Find cycle start**: after they meet, move one pointer to head and advance both by 1. They meet at the cycle start.

3. **Reverse a linked list** (iterative -- you must be able to write this in your sleep):

```python
def reverse_list(head):
    prev = None
    current = head
    while current:
        next_node = current.next  # save
        current.next = prev       # reverse
        prev = current            # advance
        current = next_node       # advance
    return prev
```

4. **Reverse in groups** -- extension of the above for k-group reversal.

### Must-Know Problems

**Reverse Linked List** (LeetCode 206)
- Approach: Three-pointer iterative (prev, current, next_node) or recursive.
- Key insight: save the next pointer before overwriting it. This is the fundamental linked list operation.

**Merge Two Sorted Lists** (LeetCode 21)
- Approach: Dummy node + compare heads of both lists, attach the smaller one.
- Key insight: the dummy node eliminates all edge cases around "which list starts the result."

**Linked List Cycle** (LeetCode 141) / **Linked List Cycle II** (LeetCode 142)
- Approach: Floyd's tortoise and hare algorithm.
- Key insight for finding cycle start (142): after detection, the distance from head to cycle start equals the distance from meeting point to cycle start. This is a mathematical property, not intuition.

---

## 4. Stacks and Queues

**[SR]**

### What It Is

**Stack**: Last-In-First-Out (LIFO). Think of a stack of plates -- you add and remove from the top.
**Queue**: First-In-First-Out (FIFO). Think of a line at a store -- first person in line is served first.

Both are abstract data types that can be implemented with arrays or linked lists.

### How It Works Internally

**Array-based stack** (most common, Python `list`):
- `push`: append to end -- O(1) amortized.
- `pop`: remove from end -- O(1).
- `peek`: look at last element -- O(1).

**Array-based queue** (naive):
- `enqueue`: append to end -- O(1).
- `dequeue`: remove from front -- O(n) because you shift everything.
- Fix: use a **circular buffer** or Python's `collections.deque`.

**`collections.deque`** (double-ended queue):
- Implemented as a doubly linked list of fixed-size blocks (not a single linked list).
- O(1) append and pop from both ends.
- This is what you should use for queues in Python.

```python
from collections import deque
q = deque()
q.append(1)      # enqueue at right
q.appendleft(2)  # enqueue at left
q.pop()           # dequeue from right
q.popleft()       # dequeue from left
```

### Operations and Complexity

| Operation | Stack (array) | Queue (deque) |
|---|---|---|
| Push / Enqueue | O(1) amortized | O(1) |
| Pop / Dequeue | O(1) | O(1) |
| Peek / Front | O(1) | O(1) |
| Search | O(n) | O(n) |
| Size | O(1) | O(1) |

### When to Use It

**Stack triggers:**
- **"Matching"** or **"nesting"** (parentheses, tags) --> stack.
- **"Most recent"** or **"undo"** --> stack (natural LIFO).
- **"Next greater/smaller element"** --> monotonic stack.
- **"Evaluate expression"** or **"parse"** --> stack.
- DFS (iterative) uses a stack.

**Queue triggers:**
- **"Process in order"** or **"level by level"** --> queue.
- BFS uses a queue.
- **"Sliding window maximum/minimum"** --> deque (monotonic deque).
- **"First come first served"** or **"scheduling"** --> queue.

### Common Interview Patterns

1. **Matching parentheses** -- push opening brackets, pop on closing brackets, check match:

```python
def is_valid(s):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for char in s:
        if char in pairs.values():
            stack.append(char)
        elif char in pairs:
            if not stack or stack[-1] != pairs[char]:
                return False
            stack.pop()
    return len(stack) == 0
```

2. **Monotonic stack** -- maintains a stack where elements are in increasing (or decreasing) order. Used for "next greater element" type problems:

```python
def daily_temperatures(temperatures):
    n = len(temperatures)
    result = [0] * n
    stack = []  # stores indices
    for i in range(n):
        while stack and temperatures[i] > temperatures[stack[-1]]:
            prev_idx = stack.pop()
            result[prev_idx] = i - prev_idx
        stack.append(i)
    return result
```

The key idea: the stack holds indices of elements waiting for a "resolution" (their next greater element). When a new element resolves some of them, we pop and record the answer.

3. **Queue with two stacks** -- a classic design question:
   - Stack `in_stack` for enqueue (just push).
   - Stack `out_stack` for dequeue (if empty, pour all of `in_stack` into it by popping).
   - Amortized O(1) per operation because each element is moved at most twice.

```python
class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []

    def push(self, x):
        self.in_stack.append(x)

    def pop(self):
        self._move()
        return self.out_stack.pop()

    def peek(self):
        self._move()
        return self.out_stack[-1]

    def _move(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
```

4. **Monotonic deque** for sliding window max/min -- maintain a deque of indices where values are decreasing (for max) or increasing (for min). The front of the deque is always the answer for the current window.

### Must-Know Problems

**Valid Parentheses** (LeetCode 20)
- Approach: Stack-based matching (shown above).
- Key insight: the stack naturally handles nesting depth.

**Daily Temperatures** (LeetCode 739)
- Approach: Monotonic stack storing indices (shown above).
- Key insight: you are looking for the "next greater element" -- the classic monotonic stack application.

**Sliding Window Maximum** (LeetCode 239)
- Approach: Monotonic deque. Maintain a deque of indices with decreasing values. For each new element, remove all smaller elements from the back. Remove the front if it is outside the window.
- Key insight: the deque front is always the maximum of the current window. Elements are added/removed at most once, so total work is O(n).

---

## 5. Trees

**[SR]**

### What It Is

A **tree** is a hierarchical data structure with a root node and subtrees of children. In interviews, "tree" almost always means **binary tree** (each node has at most 2 children).

**Binary Search Tree (BST)**: a binary tree where for every node, all values in the left subtree are less than the node's value, and all values in the right subtree are greater.

**Balanced BSTs** (AVL tree, Red-Black tree): BSTs that automatically maintain height of O(log n) through rotations. You rarely implement these in interviews, but you should know:
- **AVL tree**: strictly balanced (height difference between subtrees is at most 1). Faster lookups but slower insertions (more rotations).
- **Red-Black tree**: relaxed balance (used by Java's `TreeMap`, C++ `std::map`). Fewer rotations on insert/delete.
- Both guarantee O(log n) for search, insert, delete.

### How It Works Internally

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

**BST property implications:**
- **Inorder traversal of a BST produces sorted output.** This is extremely useful.
- Search: compare with current node, go left or right. O(h) where h is height.
- In a balanced BST, h = O(log n). In a skewed BST (degenerate), h = O(n).

**Tree traversals and when to use each:**

| Traversal | Order | Use Case |
|---|---|---|
| Inorder (L, Node, R) | Sorted order for BST | Get elements in sorted order, validate BST |
| Preorder (Node, L, R) | Root first | Serialize a tree, copy a tree |
| Postorder (L, R, Node) | Children first | Delete a tree, compute heights, evaluate expressions |
| Level-order (BFS) | Level by level | Find depth, level-based operations, shortest path in tree |

```python
# Recursive traversals
def inorder(node):
    if not node:
        return []
    return inorder(node.left) + [node.val] + inorder(node.right)

def preorder(node):
    if not node:
        return []
    return [node.val] + preorder(node.left) + preorder(node.right)

def postorder(node):
    if not node:
        return []
    return postorder(node.left) + postorder(node.right) + [node.val]

# Iterative level-order (BFS)
from collections import deque
def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

**Iterative inorder** (important to know -- interviewers sometimes ask for non-recursive):

```python
def inorder_iterative(root):
    result = []
    stack = []
    current = root
    while current or stack:
        while current:
            stack.append(current)
            current = current.left
        current = stack.pop()
        result.append(current.val)
        current = current.right
    return result
```

### Operations and Complexity

| Operation | BST Average | BST Worst (skewed) | Balanced BST |
|---|---|---|---|
| Search | O(log n) | O(n) | O(log n) |
| Insert | O(log n) | O(n) | O(log n) |
| Delete | O(log n) | O(n) | O(log n) |
| Find min/max | O(log n) | O(n) | O(log n) |
| Inorder traversal | O(n) | O(n) | O(n) |

### When to Use It

- **"Hierarchical structure"** --> tree.
- **"Sorted data with fast insert/delete/search"** --> BST.
- **"Level by level"** or **"minimum depth"** --> BFS on tree.
- **"Path from root"** or **"all paths"** --> DFS (usually recursive).
- **"Validate structure"** --> recursive with constraints passed down.
- **"Serialize/deserialize"** --> preorder traversal with markers for null.

### Common Interview Patterns

1. **Recursive DFS with return value**: The function returns information (height, validity, etc.) and the parent combines results from left and right subtrees.

2. **Pass constraints down**: For BST validation, pass `(min_val, max_val)` range down to each node.

3. **Level-order BFS**: Use a queue, process one level at a time using `for _ in range(len(queue))`.

4. **Lowest Common Ancestor**: For a general binary tree, if a node finds target in left subtree and target in right subtree, that node is the LCA.

5. **Path problems**: Maintain a running sum/path and backtrack.

### Must-Know Problems

**Maximum Depth of Binary Tree** (LeetCode 104)
- Approach: Recursive -- `max(depth(left), depth(right)) + 1`. Base case: null node returns 0.
- Key insight: this is the simplest tree recursion. If you cannot write this, you are not ready for tree problems.

**Validate Binary Search Tree** (LeetCode 98)
- Approach: Recursive with min/max bounds. Each node must be within `(low, high)`. Go left: update `high = node.val`. Go right: update `low = node.val`.
- Alternative: inorder traversal should produce strictly increasing values.
- Key insight: it is NOT enough to just check `left.val < node.val < right.val` -- you must check against the entire valid range.

```python
def is_valid_bst(root, low=float('-inf'), high=float('inf')):
    if not root:
        return True
    if root.val <= low or root.val >= high:
        return False
    return (is_valid_bst(root.left, low, root.val) and
            is_valid_bst(root.right, root.val, high))
```

**Lowest Common Ancestor** (LeetCode 236)
- Approach: Recursive. If current node is p or q, return it. Recurse left and right. If both return non-null, current node is the LCA. If only one returns non-null, propagate it up.
- For BST variant (LeetCode 235): use BST property to decide direction. If both p and q are less than node, go left. If both greater, go right. Otherwise, current node is the LCA.

---

## 6. Heaps / Priority Queues

**[SR]**

### What It Is

A **heap** is a complete binary tree that satisfies the **heap property**:
- **Min-heap**: every parent is less than or equal to its children. The root is the minimum.
- **Max-heap**: every parent is greater than or equal to its children. The root is the maximum.

A **priority queue** is the abstract data type; a heap is the most common implementation.

Python's `heapq` module implements a **min-heap**.

### How It Works Internally

**Array-based implementation** (the standard approach -- no pointers needed):

For a node at index `i`:
- Parent: `(i - 1) // 2`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

This works because the heap is a **complete** binary tree (all levels filled except possibly the last, which is filled left to right).

**Key operations:**

**Push (insert):**
1. Add the element at the end of the array.
2. "Bubble up" (sift up): compare with parent, swap if heap property is violated, repeat until property holds.
3. Time: O(log n).

**Pop (extract min/max):**
1. Swap the root with the last element.
2. Remove the last element (now contains the old root).
3. "Bubble down" (sift down): compare root with children, swap with the smaller child (min-heap), repeat.
4. Time: O(log n).

**Heapify (build heap from array):**
- Naive: insert elements one by one -- O(n log n).
- Optimal: start from the last non-leaf node and sift down each one -- **O(n)**. This is not obvious but provable: most nodes are near the bottom and sift down a small distance.

```python
import heapq

# Min-heap operations
nums = [3, 1, 4, 1, 5]
heapq.heapify(nums)          # O(n) -- in-place
heapq.heappush(nums, 2)      # O(log n)
smallest = heapq.heappop(nums)  # O(log n) -- returns and removes min

# Max-heap trick: negate all values
max_heap = [-x for x in [3, 1, 4, 1, 5]]
heapq.heapify(max_heap)
largest = -heapq.heappop(max_heap)

# Top K smallest
top_3 = heapq.nsmallest(3, nums)  # O(n log k)
# Top K largest
top_3 = heapq.nlargest(3, nums)
```

### Operations and Complexity

| Operation | Time |
|---|---|
| Build heap (heapify) | O(n) |
| Push | O(log n) |
| Pop (extract min/max) | O(log n) |
| Peek (get min/max) | O(1) |
| Search | O(n) -- heap is not optimized for search |
| Push + Pop combined | O(log n) -- `heapq.heappushpop` |

### When to Use It

- **"Kth largest/smallest"** --> heap of size K.
- **"Top K"** or **"K most frequent"** --> heap.
- **"Merge K sorted"** anything --> min-heap of size K.
- **"Median"** from a stream --> two heaps (max-heap for lower half, min-heap for upper half).
- **"Scheduling"** or **"minimize cost"** with greedy choices --> priority queue.
- **"Continuously get the min/max"** while adding elements --> heap.

**Key decision -- min-heap of size K for "Kth largest":**
- Maintain a min-heap of size K. The root is always the Kth largest.
- For each new element, if it is larger than the root, pop the root and push the new element.
- Final root = Kth largest. Time: O(n log k).

### Common Interview Patterns

1. **Top-K pattern**: Use a heap of size K to avoid sorting the entire array.

2. **Two-heap pattern** (for medians): Max-heap for the smaller half, min-heap for the larger half. Balance their sizes so that the median is always at one of the roots.

3. **Merge K sorted lists**: Push the head of each list into a min-heap. Pop the smallest, then push its next node. Repeat.

4. **Greedy with heap**: Many greedy algorithms use a heap to efficiently get the next best choice (Huffman coding, task scheduling).

### Must-Know Problems

**Kth Largest Element in an Array** (LeetCode 215)
- Approach 1: Min-heap of size K -- O(n log k).
- Approach 2: Quickselect -- O(n) average, O(n^2) worst.
- Key insight: a min-heap of size K naturally filters to keep the K largest, with the Kth largest at the root.

**Merge K Sorted Lists** (LeetCode 23)
- Approach: Min-heap storing (value, list_index, node). Pop smallest, push its next.
- Time: O(n log k) where n is total elements, k is number of lists.
- Key insight: the heap always has at most K elements, so each operation is O(log k).

```python
import heapq
def merge_k_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst.val, i, lst))
    dummy = ListNode(0)
    current = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        current.next = node
        current = current.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

**Top K Frequent Elements** (LeetCode 347)
- Approach 1: Count frequencies with a hash map, then use a min-heap of size K.
- Approach 2: Bucket sort -- create buckets indexed by frequency, iterate from highest frequency.
- Key insight: the bucket sort approach is O(n) and avoids the heap entirely.

---

## 7. Graphs

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

---

## 8. Tries (Prefix Trees)

**[SR]**

### What It Is

A **trie** (pronounced "try") is a tree-like data structure used for efficient storage and retrieval of strings. Each node represents a character, and paths from root to nodes represent prefixes.

Unlike a hash map of strings (which gives O(L) lookup where L is string length), a trie also supports **prefix queries** efficiently -- "give me all words starting with 'pre'" -- which a hash map cannot do without scanning all keys.

### How It Works Internally

```python
class TrieNode:
    def __init__(self):
        self.children = {}  # char -> TrieNode
        self.is_end = False  # marks end of a complete word

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word):
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find_node(prefix) is not None

    def _find_node(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node
```

**How it looks in memory** (inserting "cat", "car", "card"):

```
root
 |
 c
 |
 a
/ \
t   r
    |
    d

"cat"  -> c-a-t (end)
"car"  -> c-a-r (end)
"card" -> c-a-r-d (end)
```

Shared prefixes share nodes. This is the trie's main advantage.

**Space optimization -- compressed trie (Patricia trie / radix tree):**
- Merge chains of single-child nodes into one node with a multi-character label.
- Example: instead of c -> a -> r -> d, store "card" in fewer nodes.
- You will not be asked to implement this in interviews, but mentioning it shows depth.

### Operations and Complexity

| Operation | Time | Space |
|---|---|---|
| Insert word of length L | O(L) | O(L) worst case (new path) |
| Search word of length L | O(L) | - |
| Search prefix of length L | O(L) | - |
| Delete word of length L | O(L) | - |
| Total space for N words, avg length L | - | O(N * L) worst case, but shared prefixes reduce this |

### When to Use It

- **"Prefix matching"** or **"starts with"** --> trie.
- **"Autocomplete"** or **"type-ahead"** --> trie.
- **"Word search on a board"** where you explore multiple words simultaneously --> trie (much faster than checking each word individually).
- **"Longest common prefix"** --> trie.
- **"Dictionary of words"** with prefix operations --> trie beats hash set.

**When NOT to use a trie:** If you only need exact match lookup and do not care about prefixes, a hash set is simpler and often faster.

### Common Interview Patterns

1. **Basic trie operations**: Insert, search, starts_with (the Implement Trie problem itself).

2. **Word Search II** (Backtracking + Trie): Insert all target words into a trie. Do DFS on the grid, and as you explore, walk down the trie simultaneously. This prunes the search space massively because you stop exploring a path as soon as no word in the trie matches the prefix.

3. **Autocomplete system**: Trie with frequency counts at end nodes. For a given prefix, find the node, then DFS from there to collect all words and sort by frequency.

### Must-Know Problems

**Implement Trie (Prefix Tree)** (LeetCode 208)
- Approach: Direct implementation as shown above.
- Key insight: the children dictionary at each node maps characters to child nodes. The `is_end` flag distinguishes complete words from mere prefixes.

**Word Search II** (LeetCode 212)
- Approach: Build a trie from the word list. Backtrack on the grid while traversing the trie. When you reach an `is_end` node, you found a word.
- Key insight: without the trie, you would do a separate backtracking search for each word. With the trie, you search for all words simultaneously, sharing computation on common prefixes.
- Optimization: after finding a word, remove its `is_end` flag to avoid duplicates. Prune trie branches with no remaining words.

**Design Add and Search Words** (LeetCode 211)
- Approach: Trie with modified search that handles '.' wildcard by recursively trying all children at that position.
- Key insight: the '.' wildcard turns a single search path into a branching search, but the trie structure still limits the branches to only existing characters.

---

## 9. Union-Find (Disjoint Set)

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

---

## Master Complexity Comparison Table

| Data Structure | Access | Search | Insert | Delete | Space | Notes |
|---|---|---|---|---|---|---|
| **Array** | O(1) | O(n) | O(n)* | O(n) | O(n) | *O(1) amortized at end |
| **Sorted Array** | O(1) | O(log n) | O(n) | O(n) | O(n) | Binary search for lookup |
| **Hash Map / Set** | - | O(1) avg | O(1) avg | O(1) avg | O(n) | O(n) worst case for all ops |
| **Singly Linked List** | O(n) | O(n) | O(1)** | O(n) | O(n) | **O(1) at head or after known node |
| **Doubly Linked List** | O(n) | O(n) | O(1)** | O(1)** | O(n) | **Given reference to node |
| **Stack** | O(n) | O(n) | O(1) | O(1) | O(n) | Push/Pop from top only |
| **Queue** | O(n) | O(n) | O(1) | O(1) | O(n) | Enqueue/Dequeue from ends |
| **BST (balanced)** | O(log n) | O(log n) | O(log n) | O(log n) | O(n) | AVL, Red-Black |
| **BST (unbalanced)** | O(n) | O(n) | O(n) | O(n) | O(n) | Worst case: degenerate |
| **Min/Max Heap** | O(1)*** | O(n) | O(log n) | O(log n) | O(n) | ***O(1) for min/max only |
| **Trie** | - | O(L) | O(L) | O(L) | O(N*L) | L = word length |
| **Union-Find** | - | O(a(n)) | O(a(n)) | - | O(n) | a(n) = inverse Ackermann |

### Heap Operations Detail

| Operation | Time |
|---|---|
| Build heap | O(n) |
| Push | O(log n) |
| Pop (min/max) | O(log n) |
| Peek (min/max) | O(1) |

### Graph Operations Detail

| Operation | Adjacency List | Adjacency Matrix |
|---|---|---|
| Add vertex | O(1) | O(V^2) -- resize matrix |
| Add edge | O(1) | O(1) |
| Remove edge | O(E) | O(1) |
| Query edge | O(V) | O(1) |
| BFS / DFS | O(V + E) | O(V^2) |
| Space | O(V + E) | O(V^2) |
| Dijkstra | O((V+E) log V) | O(V^2) |
| Topological Sort | O(V + E) | O(V^2) |

---

## Quick Reference: "When I See X, I Think Y"

| Problem Signal | Data Structure / Technique |
|---|---|
| "Top K" / "Kth largest" | Heap |
| "Frequency" / "count occurrences" | Hash Map |
| "Unique" / "duplicates" | Hash Set |
| "Prefix" / "starts with" / "autocomplete" | Trie |
| "Connected" / "group" / "merge" | Union-Find |
| "Shortest path" (unweighted) | BFS |
| "Shortest path" (weighted) | Dijkstra |
| "Prerequisites" / "ordering" / "dependencies" | Topological Sort |
| "Matching brackets" / "nesting" | Stack |
| "Next greater/smaller" | Monotonic Stack |
| "Sliding window max/min" | Monotonic Deque |
| "Sorted order + fast insert/delete" | Balanced BST / TreeMap |
| "Subarray sum = K" | Prefix Sum + Hash Map |
| "Cycle in linked list" | Fast/Slow Pointers |
| "Merge sorted lists" | Heap or Two Pointers |
| "Level-order traversal" | BFS with Queue |
| "All paths / permutations" | DFS / Backtracking |
| "In-place rearrangement" | Two Pointers / Swapping |
| "Stream of data" / "running median" | Two Heaps |
