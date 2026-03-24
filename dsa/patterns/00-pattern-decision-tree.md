# Pattern Selection Decision Tree

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
