# Dynamic Programming

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
