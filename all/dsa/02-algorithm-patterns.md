# Algorithm Patterns -- SDE2 Interview Prep

[SR] Spaced Repetition -- review each pattern on day 1, 3, 7, 14, 30.

This guide covers 12 essential algorithm patterns. Each section includes recognition
triggers, a core idea, a reusable Python template, a classic walkthrough, variations,
edge cases, and complexity analysis.

---

## Table of Contents

1. Two Pointers
2. Sliding Window
3. Binary Search
4. BFS / DFS
5. Dynamic Programming
6. Backtracking
7. Greedy
8. Intervals
9. Topological Sort
10. Monotonic Stack
11. Bit Manipulation
12. Graph Algorithms
13. Pattern Selection Decision Tree

---

## 1. Two Pointers

[SR] Tag: two-pointers, sorted-array, pair-finding, cycle-detection

### When to Recognize

- Input array is **sorted** (or can be sorted without penalty).
- Problem asks for **pairs, triplets, or subarrays** satisfying a condition.
- Problem involves **in-place removal** or rearrangement.
- Linked list problems asking about **cycles** or **middle node** (fast-slow variant).

### Core Idea

Place two pointers at strategic positions (start/end, or both at start with different
speeds) and move them toward each other or in the same direction based on a condition.
This eliminates the need for nested loops and reduces O(n^2) brute force to O(n).
The fast-slow variant detects cycles by having one pointer move twice as fast.

### Python Code Template

```python
# Opposite-direction two pointers (sorted array)
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1
        else:
            right -= 1
    return []

# Fast-slow pointers (cycle detection)
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

### Classic Example Walkthrough: 3Sum (LC 15)

**Problem:** Find all unique triplets in the array that sum to zero.

**Approach:** Sort the array. Fix one element, then use two pointers on the rest.

```python
def threeSum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        # Skip duplicate for the fixed element
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                # Skip duplicates for left and right
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result
```

**Step-by-step with nums = [-1, 0, 1, 2, -1, -4]:**

1. Sort: [-4, -1, -1, 0, 1, 2]
2. i=0, nums[i]=-4, left=1, right=5. Sum=-4+(-1)+2=-3 < 0, move left. Sum=-4+(-1)+2=-3... eventually no triplet sums to 0.
3. i=1, nums[i]=-1, left=2, right=5. Sum=-1+(-1)+2=0. Found [-1,-1,2]. Skip duplicates, left=3, right=4. Sum=-1+0+1=0. Found [-1,0,1]. left=4, right=3, exit.
4. i=2, nums[i]=-1, same as nums[1], skip.
5. i=3, nums[i]=0, left=4, right=5. Sum=0+1+2=3 > 0, move right. right=4, left not < right, exit.
6. Result: [[-1,-1,2], [-1,0,1]]

### Variations

- **Container With Most Water (LC 11)** -- two pointers from ends, move the shorter side inward.
- **Remove Duplicates from Sorted Array (LC 26)** -- slow pointer marks write position, fast pointer scans.
- **Sort Colors (LC 75)** -- Dutch National Flag with three pointers (low, mid, high).
- **Trapping Rain Water (LC 42)** -- two pointers tracking left_max and right_max.
- **Linked List Cycle II (LC 142)** -- fast-slow to detect cycle, then find entry point.

### Edge Cases

- Array with all identical elements (heavy duplicate skipping needed).
- Array length less than required (e.g., fewer than 3 elements for 3Sum).
- All negative or all positive numbers (no valid triplet summing to zero).
- Single-node or empty linked list for cycle detection.

### Complexity

- **Time:** O(n) for single-pass two pointers, O(n^2) for 3Sum (sort + nested).
- **Space:** O(1) extra space (ignoring output and sort space).

---

## 2. Sliding Window

[SR] Tag: sliding-window, subarray, substring, contiguous

### When to Recognize

- Problem mentions **subarray** or **substring** (contiguous elements).
- There is a **constraint** to satisfy (max length, sum threshold, character limit).
- Keywords like "longest", "shortest", "maximum sum of subarray of size k".
- The problem has an optimal substructure where expanding/shrinking a window makes sense.

### Core Idea

Maintain a window defined by two pointers (left, right). Expand the window by moving
right to include more elements. When the window violates the constraint, shrink it by
moving left. This converts O(n^2) brute force into O(n) by ensuring each element is
visited at most twice (once by each pointer).

Fixed-size windows move both pointers together; variable-size windows expand right
freely and contract left only when needed.

### Python Code Template

```python
# Variable-size sliding window
def sliding_window(s):
    left = 0
    window = {}  # or any state tracker
    result = 0

    for right in range(len(s)):
        # Expand: add s[right] to window state
        window[s[right]] = window.get(s[right], 0) + 1

        # Shrink: while window is invalid, remove s[left]
        while window_is_invalid(window):
            window[s[left]] -= 1
            if window[s[left]] == 0:
                del window[s[left]]
            left += 1

        # Update result
        result = max(result, right - left + 1)

    return result

# Fixed-size sliding window
def fixed_window(nums, k):
    window_sum = sum(nums[:k])
    result = window_sum
    for right in range(k, len(nums)):
        window_sum += nums[right] - nums[right - k]
        result = max(result, window_sum)
    return result
```

### Classic Example Walkthrough: Longest Substring Without Repeating Characters (LC 3)

**Problem:** Find the length of the longest substring without repeating characters.

```python
def lengthOfLongestSubstring(s):
    char_index = {}  # char -> its latest index
    left = 0
    result = 0

    for right in range(len(s)):
        if s[right] in char_index and char_index[s[right]] >= left:
            left = char_index[s[right]] + 1
        char_index[s[right]] = right
        result = max(result, right - left + 1)

    return result
```

**Step-by-step with s = "abcabcbb":**

1. right=0, char='a', char_index={'a':0}, window="a", result=1
2. right=1, char='b', char_index={'a':0,'b':1}, window="ab", result=2
3. right=2, char='c', char_index={'a':0,'b':1,'c':2}, window="abc", result=3
4. right=3, char='a', 'a' seen at index 0 >= left(0), so left=1. char_index={'a':3,'b':1,'c':2}, window="bca", result=3
5. right=4, char='b', 'b' seen at index 1 >= left(1), so left=2. window="cab", result=3
6. right=5, char='c', 'c' seen at index 2 >= left(2), so left=3. window="abc", result=3
7. right=6, char='b', 'b' seen at index 4 >= left(3), so left=5. window="cb", result=3
8. right=7, char='b', 'b' seen at index 6 >= left(5), so left=7. window="b", result=3
9. Final result: 3

### Variations

- **Minimum Window Substring (LC 76)** -- variable window, shrink when all target chars are covered, track minimum length.
- **Max Consecutive Ones III (LC 1004)** -- variable window, allow at most k flips (zeros in window <= k).
- **Longest Repeating Character Replacement (LC 424)** -- window where (length - max_freq_char_count) <= k.
- **Permutation in String (LC 567)** -- fixed-size window matching character frequency.
- **Fruit Into Baskets (LC 904)** -- longest subarray with at most 2 distinct elements.

### Edge Cases

- Empty string or single character.
- All characters identical (window = entire string).
- All characters unique (window = entire string).
- k=0 in problems allowing k modifications (window cannot expand past violations).

### Complexity

- **Time:** O(n) -- each element is added and removed from the window at most once.
- **Space:** O(min(n, alphabet_size)) for the hash map / frequency counter.

---

## 3. Binary Search

[SR] Tag: binary-search, sorted, monotonic, search-on-answer

### When to Recognize

- Input is **sorted** or has a **monotonic property**.
- Problem asks for a **specific value** or **boundary** (first/last occurrence).
- "Minimum maximum" or "maximum minimum" phrasing (search on answer space).
- Problem can be rephrased as: "Is there a value x such that f(x) is true?" where f
  transitions from false to true (or vice versa).

### Core Idea

Repeatedly halve the search space by comparing the middle element to the target.
Standard binary search works on sorted arrays. "Search on answer space" applies binary
search to the result domain -- guess an answer, check feasibility, and narrow the range.
The key insight is that binary search works whenever there is a monotonic predicate.

### Python Code Template

```python
# Standard binary search
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Binary search on answer space (find minimum valid answer)
def search_on_answer(lo, hi):
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if is_feasible(mid):
            hi = mid        # mid could be the answer, search left
        else:
            lo = mid + 1    # mid is too small
    return lo

# Find leftmost (first) occurrence
def find_left(nums, target):
    left, right = 0, len(nums) - 1
    result = -1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            result = mid
            right = mid - 1  # keep searching left
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return result
```

### Classic Example Walkthrough: Search in Rotated Sorted Array (LC 33)

**Problem:** Search for a target in a sorted array that has been rotated at some pivot.

```python
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid

        # Left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

**Step-by-step with nums = [4,5,6,7,0,1,2], target = 0:**

1. left=0, right=6, mid=3. nums[3]=7, not target.
   - nums[0]=4 <= nums[3]=7, so left half [4,5,6,7] is sorted.
   - Is 4 <= 0 < 7? No. So target is in right half. left=4.
2. left=4, right=6, mid=5. nums[5]=1, not target.
   - nums[4]=0 <= nums[5]=1, so left half [0,1] is sorted.
   - Is 0 <= 0 < 1? Yes. So target is in left half. right=4.
3. left=4, right=4, mid=4. nums[4]=0 == target. Return 4.

### Variations

- **Koko Eating Bananas (LC 875)** -- search on answer space for minimum eating speed.
- **Find First and Last Position of Element (LC 34)** -- two binary searches for left and right bounds.
- **Search a 2D Matrix (LC 74)** -- treat 2D matrix as a flat sorted array.
- **Find Minimum in Rotated Sorted Array (LC 153)** -- binary search comparing mid to right boundary.
- **Capacity To Ship Packages (LC 1011)** -- search on answer space for minimum capacity.

### Edge Cases

- Single element array.
- Target is at the boundaries (first or last element).
- All elements identical (breaks the rotated array assumption in LC 81).
- Search space has only one valid answer at the boundary of lo or hi.
- Integer overflow when computing mid (use lo + (hi - lo) // 2).

### Complexity

- **Time:** O(log n) per search.
- **Space:** O(1).

---

## 4. BFS / DFS

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

---

## 5. Dynamic Programming

[SR] Tag: dp, memoization, tabulation, optimal-substructure, overlapping-subproblems

### When to Recognize

- Problem asks for **optimum** (min/max), **count of ways**, or **true/false feasibility**.
- The problem has **overlapping subproblems** (same subproblem solved multiple times in recursion).
- Problem has **optimal substructure** (optimal solution built from optimal sub-solutions).
- Keywords: "minimum cost", "maximum profit", "number of ways", "can you achieve".
- Brute force would be exponential, and you see repeated states in the recursion tree.

### Core Idea

Break the problem into smaller subproblems, solve each once, and store the result.
Top-down (memoization) adds caching to recursive solutions -- often easier to write.
Bottom-up (tabulation) fills a table iteratively -- often more space-efficient and avoids
recursion overhead. The critical step is defining the **state** (what changes between
subproblems) and the **transition** (how states relate to each other).

### Python Code Template

```python
# Top-down (memoization)
from functools import lru_cache

def solve_top_down(params):
    @lru_cache(maxsize=None)
    def dp(state):
        # Base case
        if base_condition(state):
            return base_value

        # Transition: try all choices, pick optimal
        result = initial_value  # float('inf') for min, 0 for count, etc.
        for choice in get_choices(state):
            result = combine(result, dp(next_state(state, choice)))
        return result

    return dp(initial_state)

# Bottom-up (tabulation)
def solve_bottom_up(params):
    n = len(params)
    dp = [initial_value] * (n + 1)
    dp[0] = base_value  # base case

    for i in range(1, n + 1):
        for choice in get_choices(i):
            dp[i] = combine(dp[i], dp[prev_state(i, choice)])

    return dp[n]
```

### Classic Example Walkthrough: Coin Change (LC 322)

**Problem:** Find the fewest number of coins to make up a given amount. Return -1 if impossible.

```python
# Bottom-up approach
def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # 0 coins needed for amount 0

    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a and dp[a - coin] != float('inf'):
                dp[a] = min(dp[a], dp[a - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1
```

**Step-by-step with coins = [1, 3, 4], amount = 6:**

```
dp[0] = 0
dp[1] = min(inf, dp[0]+1) = 1             (use coin 1)
dp[2] = min(inf, dp[1]+1) = 2             (use coin 1)
dp[3] = min(dp[2]+1, dp[0]+1) = 1         (use coin 3)
dp[4] = min(dp[3]+1, dp[1]+1, dp[0]+1) = 1 (use coin 4)
dp[5] = min(dp[4]+1, dp[2]+1, dp[1]+1) = 2 (use coin 4 + coin 1, or coin 3 + ...)
dp[6] = min(dp[5]+1, dp[3]+1, dp[2]+1) = 2 (use coin 3 + coin 3)
```

Result: 2 (coins 3 + 3).

### DP Subcategories

**0/1 Knapsack:** Each item used at most once. State: dp[i][w] = best value using first i items with capacity w.

**Unbounded Knapsack:** Items can be reused (like Coin Change). State: dp[w] = best value with capacity w.

**LCS (Longest Common Subsequence):** Two sequences. State: dp[i][j] = LCS length of first i chars and first j chars.

**LIS (Longest Increasing Subsequence):** Single sequence. State: dp[i] = length of LIS ending at index i. O(n log n) with patience sorting.

**Grid Paths:** State: dp[r][c] = result for reaching cell (r, c). Transition from dp[r-1][c] and dp[r][c-1].

### Variations

- **House Robber (LC 198)** -- dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Cannot rob adjacent houses.
- **Edit Distance (LC 72)** -- dp[i][j] = min edits to convert word1[:i] to word2[:j]. Three operations: insert, delete, replace.
- **Word Break (LC 139)** -- dp[i] = can s[:i] be segmented into dictionary words.
- **Longest Increasing Subsequence (LC 300)** -- dp[i] = LIS ending at index i.
- **Unique Paths (LC 62)** -- dp[r][c] = dp[r-1][c] + dp[r][c-1].

### Edge Cases

- Amount or target is 0 (base case, usually trivially solvable).
- Empty input (no items/coins/characters).
- Single element input.
- All values identical.
- Very large input requiring space optimization (rolling array, 2-variable trick for 1D).

### Complexity

- **Time:** O(n * capacity) for knapsack, O(n * m) for LCS, O(n * amount) for coin change.
- **Space:** O(n * capacity) naive, often reducible to O(capacity) with rolling array.

---

## 6. Backtracking

[SR] Tag: backtracking, exhaustive-search, pruning, combinations, permutations

### When to Recognize

- Problem asks to generate **all combinations, permutations, or subsets**.
- Problem asks for **all valid configurations** (e.g., N-Queens, Sudoku).
- Keywords: "all possible", "generate all", "find all", "list every".
- The solution space is a tree of choices, and you need to explore branches selectively.

### Core Idea

Build candidates incrementally. At each step, make a choice, explore further (recurse),
then undo the choice (backtrack). Pruning eliminates branches early when they cannot
lead to a valid solution, dramatically reducing the search space. The template follows
the choose-explore-unchoose pattern.

### Python Code Template

```python
def backtrack(result, current, choices, start):
    # Base case: valid solution found
    if is_complete(current):
        result.append(current[:])  # append a copy
        return

    for i in range(start, len(choices)):
        # Pruning: skip invalid choices
        if not is_valid(choices[i], current):
            continue

        # Choose
        current.append(choices[i])

        # Explore (i+1 for combinations, i for reuse, 0 for permutations)
        backtrack(result, current, choices, i + 1)

        # Unchoose (backtrack)
        current.pop()

# Usage
result = []
backtrack(result, [], choices, 0)
return result
```

### Classic Example Walkthrough: Subsets (LC 78)

**Problem:** Given a set of distinct integers, return all possible subsets.

```python
def subsets(nums):
    result = []

    def backtrack(start, current):
        result.append(current[:])  # every state is a valid subset

        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()

    backtrack(0, [])
    return result
```

**Step-by-step with nums = [1, 2, 3]:**

```
backtrack(0, [])
  add [] to result
  i=0: choose 1 -> backtrack(1, [1])
    add [1] to result
    i=1: choose 2 -> backtrack(2, [1,2])
      add [1,2] to result
      i=2: choose 3 -> backtrack(3, [1,2,3])
        add [1,2,3] to result
        no more choices, return
      pop 3
    pop 2
    i=2: choose 3 -> backtrack(3, [1,3])
      add [1,3] to result
      no more choices, return
    pop 3
  pop 1
  i=1: choose 2 -> backtrack(2, [2])
    add [2] to result
    i=2: choose 3 -> backtrack(3, [2,3])
      add [2,3] to result
    pop 3
  pop 2
  i=2: choose 3 -> backtrack(3, [3])
    add [3] to result
  pop 3

Result: [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

### Variations

- **Permutations (LC 46)** -- no start index, use a visited set or swap elements.
- **N-Queens (LC 51)** -- place queens row by row, prune using column/diagonal sets.
- **Combination Sum (LC 39)** -- allow reuse of elements (recurse with i instead of i+1).
- **Subsets II (LC 90)** -- duplicates present; sort and skip nums[i] == nums[i-1] when i > start.
- **Palindrome Partitioning (LC 131)** -- partition string, prune if substring is not palindrome.

### Edge Cases

- Empty input (return [[]] for subsets, [] for permutations of nothing).
- Input with duplicates (must sort and skip to avoid duplicate results).
- Single element input.
- Large input where pruning is critical for performance.

### Complexity

- **Time:** O(2^n) for subsets, O(n!) for permutations, varies with pruning.
- **Space:** O(n) recursion depth. O(2^n * n) or O(n! * n) for storing all results.

---

## 7. Greedy

[SR] Tag: greedy, local-optimal, sorting, intervals, scheduling

### When to Recognize

- Making a **locally optimal choice** at each step yields the global optimum.
- Problem involves **scheduling, ordering, or selection** with a clear priority.
- Sorting the input by some criterion leads to a natural processing order.
- The problem has a **greedy choice property** (you can prove local optimal leads to global).
- Often paired with sorting or priority queues.

### Core Idea

At each step, make the choice that looks best right now without worrying about future
consequences. Unlike DP, greedy does not revisit or reconsider decisions. The challenge
is proving that the greedy choice is correct (exchange argument or by contradiction).
If you suspect greedy but cannot prove correctness, consider DP instead.

### Python Code Template

```python
# General greedy pattern
def greedy_solve(items):
    items.sort(key=lambda x: some_criterion(x))  # sort by greedy priority
    result = initial_value

    for item in items:
        if can_include(item, result):
            result = update(result, item)

    return result
```

### Classic Example Walkthrough: Jump Game II (LC 45)

**Problem:** Minimum number of jumps to reach the last index. Each element is the max jump length.

```python
def jump(nums):
    jumps = 0
    current_end = 0    # farthest index reachable with current number of jumps
    farthest = 0       # farthest index reachable overall

    for i in range(len(nums) - 1):  # don't process the last index
        farthest = max(farthest, i + nums[i])

        if i == current_end:
            # Must make a jump
            jumps += 1
            current_end = farthest

            if current_end >= len(nums) - 1:
                break

    return jumps
```

**Step-by-step with nums = [2, 3, 1, 1, 4]:**

1. jumps=0, current_end=0, farthest=0
2. i=0: farthest = max(0, 0+2) = 2. i == current_end(0), so jumps=1, current_end=2.
3. i=1: farthest = max(2, 1+3) = 4. i != current_end(2), continue.
4. i=2: farthest = max(4, 2+1) = 4. i == current_end(2), so jumps=2, current_end=4. 4 >= 4 (last index), break.
5. Result: 2 jumps (index 0 -> 1 -> 4).

### Variations

- **Merge Intervals (LC 56)** -- sort by start, merge overlapping.
- **Task Scheduler (LC 621)** -- greedy: schedule most frequent tasks first with cooldown.
- **Non-overlapping Intervals (LC 435)** -- sort by end time, greedily keep non-overlapping.
- **Gas Station (LC 134)** -- greedy: if total gas >= total cost, start from the point where running sum is lowest.
- **Assign Cookies (LC 455)** -- sort both children and cookies, greedily match smallest sufficient cookie.

### Edge Cases

- Single element array (already at destination).
- Uniform values (e.g., all 1s -- every step is forced).
- Large jumps that overshoot the array.
- Situations where greedy fails and DP is needed (be wary of greedy assumptions).

### Complexity

- **Time:** O(n) for single-pass greedy, O(n log n) if sorting is required.
- **Space:** O(1) for most greedy approaches, O(n) if auxiliary storage is needed.

---

## 8. Intervals

[SR] Tag: intervals, ranges, scheduling, merge, overlap

### When to Recognize

- Input is a list of **intervals** [start, end] or **ranges**.
- Problem asks about **overlaps, merges, gaps, or coverage**.
- Scheduling problems: "meeting rooms", "minimum rooms", "free time".
- Keywords: "merge", "insert", "intersect", "overlap", "conflicting".

### Core Idea

Sort intervals by start time (or end time, depending on the problem). Then iterate
through, using the relationship between the current interval and the previous one
(or a running state) to merge, count overlaps, or detect gaps. Many interval problems
reduce to a sweep-line approach or a sort-and-compare pattern.

### Python Code Template

```python
def interval_template(intervals):
    intervals.sort(key=lambda x: x[0])  # sort by start
    result = [intervals[0]]

    for i in range(1, len(intervals)):
        current = intervals[i]
        last = result[-1]

        if current[0] <= last[1]:
            # Overlap: merge or handle
            last[1] = max(last[1], current[1])
        else:
            # No overlap: add to result
            result.append(current)

    return result
```

### Classic Example Walkthrough: Merge Intervals (LC 56)

**Problem:** Merge all overlapping intervals.

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for i in range(1, len(intervals)):
        if intervals[i][0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], intervals[i][1])
        else:
            merged.append(intervals[i])

    return merged
```

**Step-by-step with intervals = [[1,3],[2,6],[8,10],[15,18]]:**

1. Sort (already sorted): [[1,3],[2,6],[8,10],[15,18]]
2. merged = [[1,3]]
3. [2,6]: 2 <= 3 (overlap). Merge: merged[-1] = [1, max(3,6)] = [1,6]. merged = [[1,6]]
4. [8,10]: 8 > 6 (no overlap). Append. merged = [[1,6],[8,10]]
5. [15,18]: 15 > 10 (no overlap). Append. merged = [[1,6],[8,10],[15,18]]
6. Result: [[1,6],[8,10],[15,18]]

### Variations

- **Insert Interval (LC 57)** -- find position, merge with overlapping, reconstruct.
- **Meeting Rooms II (LC 253)** -- min heaps or sweep line to track concurrent meetings.
- **Non-overlapping Intervals (LC 435)** -- sort by end, greedily remove overlapping.
- **Interval List Intersections (LC 986)** -- two pointers through two sorted interval lists.
- **Employee Free Time (LC 759)** -- merge all employee schedules, find gaps.

### Edge Cases

- Single interval (return as-is).
- All intervals overlap (merge into one).
- No intervals overlap (return sorted list).
- Intervals with identical start or end times.
- Intervals where start == end (zero-length intervals).
- Unsorted input (always sort first).

### Complexity

- **Time:** O(n log n) for sorting, O(n) for the merge pass.
- **Space:** O(n) for the result (O(1) extra if merging in-place).

---

## 9. Topological Sort

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

---

## 10. Monotonic Stack

[SR] Tag: monotonic-stack, next-greater, next-smaller, histogram

### When to Recognize

- Problem asks for the **next greater element** or **next smaller element** for each position.
- Problem involves **spans** (how far back a condition holds).
- Histogram or bar-chart problems.
- Keywords: "next warmer day", "stock span", "largest rectangle".
- Need to efficiently find the nearest element satisfying a comparison in one direction.

### Core Idea

Maintain a stack where elements are in monotonically increasing or decreasing order.
When a new element violates the monotonic property, pop elements from the stack -- these
popped elements have found their "answer" (the new element). This ensures each element
is pushed and popped at most once, giving O(n) total time instead of O(n^2) brute force.

### Python Code Template

```python
# Next greater element pattern (monotonically decreasing stack)
def next_greater(nums):
    n = len(nums)
    result = [-1] * n
    stack = []  # stores indices

    for i in range(n):
        while stack and nums[i] > nums[stack[-1]]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result

# Next smaller element pattern (monotonically increasing stack)
def next_smaller(nums):
    n = len(nums)
    result = [-1] * n
    stack = []

    for i in range(n):
        while stack and nums[i] < nums[stack[-1]]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result
```

### Classic Example Walkthrough: Daily Temperatures (LC 739)

**Problem:** Given daily temperatures, return how many days you have to wait for a warmer temperature. If no future day is warmer, put 0.

```python
def dailyTemperatures(temperatures):
    n = len(temperatures)
    result = [0] * n
    stack = []  # stack of indices, temperatures in decreasing order

    for i in range(n):
        while stack and temperatures[i] > temperatures[stack[-1]]:
            prev_idx = stack.pop()
            result[prev_idx] = i - prev_idx
        stack.append(i)

    return result
```

**Step-by-step with temperatures = [73, 74, 75, 71, 69, 72, 76, 73]:**

1. i=0, temp=73. Stack empty, push 0. Stack=[0].
2. i=1, temp=74. 74>73, pop 0: result[0]=1-0=1. Stack empty. Push 1. Stack=[1].
3. i=2, temp=75. 75>74, pop 1: result[1]=2-1=1. Stack empty. Push 2. Stack=[2].
4. i=3, temp=71. 71<75, no pop. Push 3. Stack=[2,3].
5. i=4, temp=69. 69<71, no pop. Push 4. Stack=[2,3,4].
6. i=5, temp=72. 72>69, pop 4: result[4]=5-4=1. 72>71, pop 3: result[3]=5-3=2. 72<75, stop. Push 5. Stack=[2,5].
7. i=6, temp=76. 76>72, pop 5: result[5]=6-5=1. 76>75, pop 2: result[2]=6-2=4. Stack empty. Push 6. Stack=[6].
8. i=7, temp=73. 73<76, no pop. Push 7. Stack=[6,7].
9. Remaining in stack (indices 6,7) keep result[6]=0, result[7]=0.
10. Result: [1, 1, 4, 2, 1, 1, 0, 0]

### Variations

- **Largest Rectangle in Histogram (LC 84)** -- monotonic increasing stack; when popping, compute area with popped bar as smallest.
- **Trapping Rain Water (LC 42)** -- monotonic decreasing stack; when popping, compute trapped water between boundaries.
- **Next Greater Element I (LC 496)** -- build next-greater map for one array, look up for another.
- **Online Stock Span (LC 901)** -- monotonic decreasing stack tracking consecutive days with price <= today.
- **Sum of Subarray Minimums (LC 907)** -- monotonic increasing stack to find range where each element is the minimum.

### Edge Cases

- All elements in increasing order (stack never pops until the end).
- All elements in decreasing order (stack pops one at a time).
- All elements equal (no greater/smaller exists depending on strict comparison).
- Single element.
- Circular array variant (iterate twice through the array with modular indexing).

### Complexity

- **Time:** O(n) -- each element is pushed and popped at most once.
- **Space:** O(n) for the stack.

---

## 11. Bit Manipulation

[SR] Tag: bit-manipulation, xor, bitmask, binary

### When to Recognize

- Problem involves **finding duplicates or missing numbers** with O(1) space constraints.
- Keywords: "single number", "appears once", "power of two", "bit count".
- Problem can be modeled with **binary representations** or **bitmasks**.
- Need to perform operations like set/clear/toggle/check individual bits.
- Constraint hints at bitwise solution (e.g., "solve without extra memory").

### Core Idea

Bit manipulation leverages properties of binary operations. The most important trick is
XOR: a ^ a = 0 and a ^ 0 = a, so XORing all elements cancels duplicates. Other useful
operations include AND to check/clear bits, OR to set bits, and shifts to isolate
specific bit positions. Bitmasks can represent subsets of a set efficiently.

### Key Operations Reference

```python
# Check if bit at position i is set
(n >> i) & 1

# Set bit at position i
n | (1 << i)

# Clear bit at position i
n & ~(1 << i)

# Toggle bit at position i
n ^ (1 << i)

# Check if power of two
n > 0 and (n & (n - 1)) == 0

# Count set bits (Brian Kernighan)
count = 0
while n:
    n &= n - 1
    count += 1

# Lowest set bit
lowest = n & (-n)

# Clear lowest set bit
n & (n - 1)
```

### Classic Example Walkthrough: Single Number (LC 136)

**Problem:** Every element appears twice except one. Find the single one. Must use O(1) extra space.

```python
def singleNumber(nums):
    result = 0
    for num in nums:
        result ^= num
    return result
```

**Step-by-step with nums = [4, 1, 2, 1, 2]:**

```
result = 0
result ^= 4 -> 0 ^ 4 = 4       (binary: 000 ^ 100 = 100)
result ^= 1 -> 4 ^ 1 = 5       (binary: 100 ^ 001 = 101)
result ^= 2 -> 5 ^ 2 = 7       (binary: 101 ^ 010 = 111)
result ^= 1 -> 7 ^ 1 = 6       (binary: 111 ^ 001 = 110)
result ^= 2 -> 6 ^ 2 = 4       (binary: 110 ^ 010 = 100)
```

Result: 4. The duplicate 1s and 2s cancel out, leaving only 4.

**Why it works:** XOR is commutative and associative. So 4^1^2^1^2 = 4^(1^1)^(2^2) = 4^0^0 = 4.

### Variations

- **Number of 1 Bits (LC 191)** -- Brian Kernighan's trick: repeatedly clear lowest set bit, count iterations.
- **Counting Bits (LC 338)** -- dp[i] = dp[i & (i-1)] + 1. Uses the clear-lowest-set-bit trick.
- **Single Number II (LC 137)** -- every element appears three times except one. Count bits modulo 3.
- **Single Number III (LC 260)** -- two elements appear once. XOR all, split by a differing bit.
- **Reverse Bits (LC 190)** -- shift result left and source right, extracting one bit at a time.

### Edge Cases

- Negative numbers (Python handles arbitrary precision, but be aware of two's complement in other languages).
- n = 0 (no bits set).
- n = 1 (single bit).
- Large numbers near integer limits (not an issue in Python but relevant in interviews discussing other languages).
- All bits set (e.g., n = -1 in two's complement).

### Complexity

- **Time:** O(n) for array traversal, O(log n) or O(number of bits) for individual number operations.
- **Space:** O(1) -- bit manipulation avoids extra data structures.

---

## 12. Graph Algorithms

[SR] Tag: graph, dijkstra, union-find, shortest-path, weighted-graph

### When to Recognize

- Problem involves **weighted graphs** and asks for **shortest/cheapest path**.
- Problem involves **connectivity**, "are nodes connected?", or **component counting**.
- Keywords: "network delay", "cheapest flight", "minimum cost to connect", "redundant connection".
- Need efficient union/find operations across dynamic connectivity queries.

### Core Idea

Dijkstra finds shortest paths in graphs with non-negative weights using a min-heap,
greedily extending the shortest known path. Union-Find (Disjoint Set Union) efficiently
tracks connected components with near-O(1) amortized operations using path compression
and union by rank. BFS gives shortest path in unweighted graphs. Choose the algorithm
based on edge weights and the specific query type.

### Python Code Template

```python
import heapq
from collections import defaultdict

# Dijkstra's Algorithm
def dijkstra(graph, source, n):
    """graph: adjacency list {node: [(neighbor, weight), ...]}"""
    dist = [float('inf')] * n
    dist[source] = 0
    min_heap = [(0, source)]  # (distance, node)

    while min_heap:
        d, u = heapq.heappop(min_heap)
        if d > dist[u]:
            continue  # skip stale entries
        for v, weight in graph[u]:
            new_dist = d + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(min_heap, (new_dist, v))

    return dist

# Union-Find (Disjoint Set Union)
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False  # already connected
        # Union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.components -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

### Classic Example Walkthrough: Network Delay Time (LC 743)

**Problem:** n nodes, weighted directed edges. Send signal from node k. Return the time it takes for all nodes to receive the signal. Return -1 if impossible.

```python
def networkDelayTime(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))

    dist = {i: float('inf') for i in range(1, n + 1)}
    dist[k] = 0
    min_heap = [(0, k)]

    while min_heap:
        d, u = heapq.heappop(min_heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            new_dist = d + w
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(min_heap, (new_dist, v))

    max_dist = max(dist.values())
    return max_dist if max_dist < float('inf') else -1
```

**Step-by-step with times=[[2,1,1],[2,3,1],[3,4,1]], n=4, k=2:**

1. Graph: {2:[(1,1),(3,1)], 3:[(4,1)]}
2. dist = {1:inf, 2:0, 3:inf, 4:inf}. Heap = [(0,2)].
3. Pop (0,2). Process neighbors:
   - Node 1: 0+1=1 < inf. dist[1]=1. Push (1,1).
   - Node 3: 0+1=1 < inf. dist[3]=1. Push (1,3).
   Heap = [(1,1),(1,3)].
4. Pop (1,1). Node 1 has no outgoing edges. Heap = [(1,3)].
5. Pop (1,3). Process neighbors:
   - Node 4: 1+1=2 < inf. dist[4]=2. Push (2,4).
   Heap = [(2,4)].
6. Pop (2,4). Node 4 has no outgoing edges. Heap empty.
7. dist = {1:1, 2:0, 3:1, 4:2}. max = 2. Return 2.

### Variations

- **Cheapest Flights Within K Stops (LC 787)** -- modified Dijkstra or BFS with state (node, stops). Can also use Bellman-Ford with k+1 iterations.
- **Redundant Connection (LC 684)** -- Union-Find to detect the edge that creates a cycle.
- **Number of Connected Components (LC 323)** -- Union-Find or DFS to count components.
- **Min Cost to Connect All Points (LC 1584)** -- Minimum Spanning Tree using Kruskal (Union-Find) or Prim.
- **Swim in Rising Water (LC 778)** -- Dijkstra variant on a grid, minimizing the maximum elevation.

### Edge Cases

- Disconnected graph (some nodes unreachable, return -1 or handle appropriately).
- Self-loops (may or may not affect result depending on weights).
- Negative weights (Dijkstra does not work -- use Bellman-Ford instead).
- Single node (distance is 0).
- Dense graph (many edges, heap operations can slow down).
- Parallel edges (multiple edges between same pair of nodes, keep the minimum or handle both).

### Complexity

**Dijkstra:**
- **Time:** O((V + E) log V) with a binary heap.
- **Space:** O(V + E).

**Union-Find:**
- **Time:** O(alpha(n)) per operation, nearly O(1). Total for m operations: O(m * alpha(n)).
- **Space:** O(V).

---

## Pattern Selection Decision Tree

Use this text-based flowchart to identify which pattern to apply. Start at the top
and follow the questions.

```
START: What does the input look like?
|
+---> Is the input a GRAPH or TREE?
|     |
|     +---> Is there a shortest path / minimum cost question?
|     |     |
|     |     +---> Are edges weighted?
|     |     |     |
|     |     |     +---> YES: Use DIJKSTRA (Pattern 12)
|     |     |     +---> NO:  Use BFS (Pattern 4)
|     |     |
|     |     +---> Are there constraints on path length (e.g., K stops)?
|     |           +---> YES: Modified BFS/Dijkstra with state (Pattern 12)
|     |
|     +---> Is there a dependency/ordering requirement?
|     |     +---> YES: Use TOPOLOGICAL SORT (Pattern 9)
|     |
|     +---> Is it about connectivity / components?
|     |     +---> YES: Use UNION-FIND (Pattern 12) or DFS (Pattern 4)
|     |
|     +---> Is it a grid / matrix traversal?
|     |     +---> Counting regions/islands? Use DFS/BFS (Pattern 4)
|     |     +---> Shortest path in grid? Use BFS (Pattern 4)
|     |
|     +---> Otherwise: Use DFS/BFS (Pattern 4)
|
+---> Is the input an ARRAY or STRING?
|     |
|     +---> Is it SORTED (or can sorting help)?
|     |     |
|     |     +---> Looking for a specific element or boundary?
|     |     |     +---> YES: Use BINARY SEARCH (Pattern 3)
|     |     |
|     |     +---> Finding pairs/triplets with a sum condition?
|     |           +---> YES: Use TWO POINTERS (Pattern 1)
|     |
|     +---> Is the problem about a CONTIGUOUS subarray/substring?
|     |     +---> YES: Use SLIDING WINDOW (Pattern 2)
|     |
|     +---> Is the problem about INTERVALS / RANGES?
|     |     +---> YES: Use INTERVALS pattern (Pattern 8)
|     |
|     +---> Is the problem asking for next greater/smaller element?
|     |     +---> YES: Use MONOTONIC STACK (Pattern 10)
|     |
|     +---> Does the problem have a "min/max" or "search on answer" flavor?
|           +---> Can you define a feasibility check on the answer?
|                 +---> YES: Use BINARY SEARCH on answer space (Pattern 3)
|
+---> Does the problem ask to GENERATE ALL combinations/permutations/subsets?
|     +---> YES: Use BACKTRACKING (Pattern 6)
|
+---> Does the problem ask for OPTIMAL value (min cost, max profit, count of ways)?
|     |
|     +---> Can a local greedy choice provably lead to global optimum?
|     |     +---> YES: Use GREEDY (Pattern 7)
|     |
|     +---> Are there overlapping subproblems?
|           +---> YES: Use DYNAMIC PROGRAMMING (Pattern 5)
|                 |
|                 +---> 0/1 choices? -> Knapsack DP
|                 +---> Two sequences? -> LCS-style DP
|                 +---> Grid traversal? -> Grid DP
|                 +---> Single sequence, optimal? -> LIS-style DP
|
+---> Does the problem involve BIT-LEVEL operations or O(1) space tricks?
      +---> YES: Use BIT MANIPULATION (Pattern 11)
```

### Quick Reference Table

| Pattern           | Key Signal                                    | Time Complexity       |
|-------------------|-----------------------------------------------|-----------------------|
| Two Pointers      | Sorted array, pair/triplet finding             | O(n) to O(n^2)       |
| Sliding Window    | Contiguous subarray/substring with constraint  | O(n)                 |
| Binary Search     | Sorted input, monotonic condition              | O(log n)             |
| BFS/DFS           | Tree/graph traversal, grid regions             | O(V + E)             |
| Dynamic Prog.     | Optimal value, overlapping subproblems         | O(n * state_size)    |
| Backtracking      | Generate all valid configurations              | O(2^n) or O(n!)      |
| Greedy            | Local optimal equals global optimal            | O(n) to O(n log n)   |
| Intervals         | Range overlaps, merges, scheduling             | O(n log n)           |
| Topological Sort  | Dependency ordering in DAG                     | O(V + E)             |
| Monotonic Stack   | Next greater/smaller element                   | O(n)                 |
| Bit Manipulation  | XOR tricks, bitmasks, O(1) space               | O(n) or O(bits)      |
| Graph Algorithms  | Weighted shortest path, connectivity           | O((V+E) log V)       |

---

**Study approach:** Master patterns 1-6 first (they cover roughly 80% of interview problems).
Then add patterns 7-12 as you encounter them in practice. For each pattern, solve at
least 3-5 problems before moving on to build muscle memory.
