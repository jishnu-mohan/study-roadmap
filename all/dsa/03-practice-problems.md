# DSA Practice Problems -- Curated LeetCode List (~120 Problems)

> Organized by pattern, ordered Easy -> Medium -> Hard within each group.
> Designed for intermediate-level backend SDE2 interview preparation.
>
> Format: `- [ ] **Problem Name** (LC #number) [Difficulty] -- Key insight: hint`

---

## 1. Arrays and Hashing (10 problems)

- [ ] **Two Sum** (LC #1) [Easy] -- Key insight: Use a hash map to store complements as you iterate once through the array.
- [ ] **Contains Duplicate** (LC #217) [Easy] -- Key insight: A set gives you O(1) lookups; if you ever see something already in the set, return true.
- [ ] **Valid Anagram** (LC #242) [Easy] -- Key insight: Two strings are anagrams if and only if their character frequency counts are identical.
- [ ] **Group Anagrams** (LC #49) [Medium] -- Key insight: Use sorted characters (or a frequency tuple) as the hash map key to group words.
- [ ] **Top K Frequent Elements** (LC #347) [Medium] -- Key insight: Bucket sort by frequency gives O(n) time -- index = frequency, value = list of elements.
- [ ] **Product of Array Except Self** (LC #238) [Medium] -- Key insight: Build prefix products from the left and suffix products from the right in two passes.
- [ ] **Encode and Decode Strings** (LC #271) [Medium] -- Key insight: Prefix each string with its length and a delimiter so you can parse unambiguously.
- [ ] **Valid Sudoku** (LC #36) [Medium] -- Key insight: Use three sets (row, column, box) and check membership as you scan the board.
- [ ] **Subarray Sum Equals K** (LC #560) [Medium] -- Key insight: Track prefix sums in a hash map; the count of prefix_sum - k seen so far gives the answer.
- [ ] **Longest Consecutive Sequence** (LC #128) [Medium] -- Key insight: Put everything in a set; only start counting from numbers that have no left neighbor (n-1 not in set).

---

## 2. Two Pointers (8 problems)

- [ ] **Move Zeroes** (LC #283) [Easy] -- Key insight: Use a write pointer; every non-zero element gets written at the write position, then fill the rest with zeros.
- [ ] **Valid Palindrome** (LC #125) [Easy] -- Key insight: Two pointers from both ends, skip non-alphanumeric characters, compare case-insensitively.
- [ ] **Remove Duplicates from Sorted Array** (LC #26) [Easy] -- Key insight: Slow pointer marks the write position; advance fast pointer and write only when value changes.
- [ ] **Two Sum II - Input Array Is Sorted** (LC #167) [Medium] -- Key insight: Left and right pointers; move left up if sum is too small, right down if too large.
- [ ] **3Sum** (LC #15) [Medium] -- Key insight: Sort the array, fix one element, then use two pointers on the remainder; skip duplicates carefully.
- [ ] **Sort Colors** (LC #75) [Medium] -- Key insight: Dutch National Flag -- three pointers (low, mid, high) partition the array in one pass.
- [ ] **Container With Most Water** (LC #11) [Medium] -- Key insight: Start with widest container; move the shorter wall inward because it is the bottleneck.
- [ ] **Trapping Rain Water** (LC #42) [Hard] -- Key insight: Water at each index = min(max_left, max_right) - height; compute with two pointers tracking running maxes.

---

## 3. Sliding Window (8 problems)

- [ ] **Best Time to Buy and Sell Stock** (LC #121) [Easy] -- Key insight: Track the minimum price seen so far; the answer is the max of (current_price - min_so_far).
- [ ] **Max Consecutive Ones III** (LC #1004) [Medium] -- Key insight: Sliding window that allows at most k zeros; shrink from the left when zeros exceed k.
- [ ] **Longest Substring Without Repeating Characters** (LC #3) [Medium] -- Key insight: Expand window right; when a duplicate is found, shrink from the left past the previous occurrence.
- [ ] **Longest Repeating Character Replacement** (LC #424) [Medium] -- Key insight: Window is valid while (window_length - max_frequency_char) <= k; shrink when it exceeds.
- [ ] **Permutation in String** (LC #567) [Medium] -- Key insight: Fixed-size window equal to s1's length; compare frequency maps (or use a match counter).
- [ ] **Minimum Size Subarray Sum** (LC #209) [Medium] -- Key insight: Expand right to meet the target sum, then shrink left to minimize the window length.
- [ ] **Sliding Window Maximum** (LC #239) [Hard] -- Key insight: Use a monotonic deque that keeps indices of decreasing values; the front is always the window max.
- [ ] **Minimum Window Substring** (LC #76) [Hard] -- Key insight: Expand right until all characters are covered, then shrink left to find the smallest valid window.

---

## 4. Binary Search (8 problems)

- [ ] **Binary Search** (LC #704) [Easy] -- Key insight: Standard template -- be precise about whether you use left <= right or left < right and how you update.
- [ ] **Search a 2D Matrix** (LC #74) [Medium] -- Key insight: Treat the 2D matrix as a flattened sorted array; convert mid index to (row, col).
- [ ] **Find First and Last Position of Element in Sorted Array** (LC #34) [Medium] -- Key insight: Run binary search twice -- once biased left (first occurrence), once biased right (last occurrence).
- [ ] **Koko Eating Bananas** (LC #875) [Medium] -- Key insight: Binary search on the answer (eating speed); check feasibility by computing total hours needed.
- [ ] **Find Minimum in Rotated Sorted Array** (LC #153) [Medium] -- Key insight: Compare mid to right; if mid > right, minimum is in the right half, otherwise the left half.
- [ ] **Search in Rotated Sorted Array** (LC #33) [Medium] -- Key insight: Determine which half is sorted, then check if the target lies in that sorted half.
- [ ] **Time Based Key-Value Store** (LC #981) [Medium] -- Key insight: For each key, store (timestamp, value) pairs in a list; binary search for the largest timestamp <= target.
- [ ] **Median of Two Sorted Arrays** (LC #4) [Hard] -- Key insight: Binary search on the shorter array to find the correct partition where left halves and right halves are balanced.

---

## 5. Stack (8 problems)

- [ ] **Valid Parentheses** (LC #20) [Easy] -- Key insight: Push opening brackets; on a closing bracket, the stack top must be its matching opener.
- [ ] **Min Stack** (LC #155) [Medium] -- Key insight: Store (value, current_min) pairs so you always know the minimum in O(1).
- [ ] **Evaluate Reverse Polish Notation** (LC #150) [Medium] -- Key insight: Push numbers; on an operator, pop two operands, compute, push the result back.
- [ ] **Generate Parentheses** (LC #22) [Medium] -- Key insight: Backtrack with counts of open and close; you can add open if count < n, close if close_count < open_count.
- [ ] **Daily Temperatures** (LC #739) [Medium] -- Key insight: Monotonic decreasing stack of indices; when a warmer day appears, pop and compute differences.
- [ ] **Asteroid Collision** (LC #735) [Medium] -- Key insight: Stack of surviving asteroids; only right-moving vs left-moving causes collisions -- simulate carefully.
- [ ] **Car Fleet** (LC #853) [Medium] -- Key insight: Sort by position descending; compute arrival times; a car that arrives no later than the one ahead joins its fleet.
- [ ] **Largest Rectangle in Histogram** (LC #84) [Hard] -- Key insight: Monotonic increasing stack of indices; when a shorter bar appears, pop and calculate area with that bar as the shortest.

---

## 6. Linked List (8 problems)

- [ ] **Reverse Linked List** (LC #206) [Easy] -- Key insight: Three pointers (prev, curr, next); iteratively reverse each link. The recursive version is also worth knowing.
- [ ] **Merge Two Sorted Lists** (LC #21) [Easy] -- Key insight: Dummy head node simplifies the merge; compare heads and attach the smaller one.
- [ ] **Linked List Cycle** (LC #141) [Easy] -- Key insight: Fast and slow pointers -- if they meet, there is a cycle.
- [ ] **Remove Nth Node From End of List** (LC #19) [Medium] -- Key insight: Two pointers spaced n apart; when the lead hits the end, the follower is at the node before the target.
- [ ] **Add Two Numbers** (LC #2) [Medium] -- Key insight: Process digit by digit with a carry variable; do not forget to handle the final carry.
- [ ] **Reorder List** (LC #143) [Medium] -- Key insight: Find the middle, reverse the second half, then merge the two halves alternately.
- [ ] **Copy List with Random Pointer** (LC #138) [Medium] -- Key insight: Use a hash map from original node to cloned node so you can wire up the random pointers in a second pass.
- [ ] **LRU Cache** (LC #146) [Medium] -- Key insight: Hash map for O(1) access + doubly linked list for O(1) eviction of the least recently used item.

---

## 7. Trees (12 problems)

- [ ] **Invert Binary Tree** (LC #226) [Easy] -- Key insight: Recursively swap left and right children at every node.
- [ ] **Maximum Depth of Binary Tree** (LC #104) [Easy] -- Key insight: Depth = 1 + max(depth(left), depth(right)); base case is 0 for null.
- [ ] **Same Tree** (LC #100) [Easy] -- Key insight: Recursively check that both nodes have the same value and their subtrees are identical.
- [ ] **Subtree of Another Tree** (LC #572) [Easy] -- Key insight: At each node in the main tree, check if the subtree rooted there is the same tree as the target.
- [ ] **Lowest Common Ancestor of a BST** (LC #235) [Medium] -- Key insight: Exploit BST property -- if both values are smaller go left, both larger go right, otherwise you are at the LCA.
- [ ] **Binary Tree Level Order Traversal** (LC #102) [Medium] -- Key insight: BFS with a queue; process all nodes at the current level before moving to the next.
- [ ] **Validate Binary Search Tree** (LC #98) [Medium] -- Key insight: Pass down (min, max) bounds; every node must satisfy min < node.val < max.
- [ ] **Kth Smallest Element in a BST** (LC #230) [Medium] -- Key insight: Inorder traversal of a BST yields sorted order; the kth visited node is the answer.
- [ ] **Construct Binary Tree from Preorder and Inorder Traversal** (LC #105) [Medium] -- Key insight: Preorder's first element is the root; find it in inorder to determine left and right subtree sizes.
- [ ] **Binary Tree Maximum Path Sum** (LC #124) [Hard] -- Key insight: At each node, compute the max gain (node + best child); update a global max that considers the path through the node.
- [ ] **Serialize and Deserialize Binary Tree** (LC #297) [Hard] -- Key insight: Preorder with null markers; serialize recursively, deserialize by consuming tokens from a queue.
- [ ] **Word Search II** (LC #212) [Hard] -- Key insight: Build a trie from the word list, then DFS from each cell matching trie nodes to prune early.

---

## 8. Heap / Priority Queue (6 problems)

- [ ] **Kth Largest Element in a Stream** (LC #703) [Easy] -- Key insight: Maintain a min-heap of size k; the heap top is always the kth largest.
- [ ] **Last Stone Weight** (LC #1046) [Easy] -- Key insight: Max-heap (negate values in Python); repeatedly smash the two heaviest stones.
- [ ] **K Closest Points to Origin** (LC #973) [Medium] -- Key insight: Use a max-heap of size k or quickselect; you do not need to fully sort.
- [ ] **Kth Largest Element in an Array** (LC #215) [Medium] -- Key insight: Quickselect gives O(n) average time; alternatively, a min-heap of size k works in O(n log k).
- [ ] **Task Scheduler** (LC #621) [Medium] -- Key insight: The most frequent task dictates idle slots; fill idle gaps with less frequent tasks greedily.
- [ ] **Merge k Sorted Lists** (LC #23) [Hard] -- Key insight: Push the head of each list into a min-heap; pop the smallest, push its next node.

---

## 9. Graphs (12 problems)

- [ ] **Number of Islands** (LC #200) [Medium] -- Key insight: DFS/BFS from each unvisited land cell; mark visited cells to avoid recounting.
- [ ] **Clone Graph** (LC #133) [Medium] -- Key insight: Hash map from original to clone; BFS or DFS, creating clones and wiring neighbors as you go.
- [ ] **Rotting Oranges** (LC #994) [Medium] -- Key insight: Multi-source BFS starting from all rotten oranges simultaneously; time = number of BFS levels.
- [ ] **Pacific Atlantic Water Flow** (LC #417) [Medium] -- Key insight: BFS/DFS backwards from each ocean; the answer is cells reachable from both oceans.
- [ ] **Course Schedule** (LC #207) [Medium] -- Key insight: Detect a cycle in a directed graph using DFS with three states or Kahn's algorithm.
- [ ] **Course Schedule II** (LC #210) [Medium] -- Key insight: Topological sort via Kahn's BFS; the order you remove zero-in-degree nodes is a valid schedule.
- [ ] **Graph Valid Tree** (LC #261) [Medium] -- Key insight: A valid tree has exactly n-1 edges and is fully connected; check with Union-Find or DFS.
- [ ] **Number of Connected Components in an Undirected Graph** (LC #323) [Medium] -- Key insight: Count connected components with Union-Find or DFS; each new root/unvisited start is a component.
- [ ] **Walls and Gates** (LC #286) [Medium] -- Key insight: Multi-source BFS from all gates simultaneously; each cell gets the shortest distance to any gate.
- [ ] **Redundant Connection** (LC #684) [Medium] -- Key insight: Process edges with Union-Find; the first edge that connects two already-connected nodes is redundant.
- [ ] **Word Ladder** (LC #127) [Hard] -- Key insight: BFS with each word as a node; generate neighbors by changing one character at a time, checking against a word set.
- [ ] **Cheapest Flights Within K Stops** (LC #787) [Medium] -- Key insight: Bellman-Ford with k+1 relaxation rounds, or BFS/Dijkstra with a stop constraint.

---

## 10. Dynamic Programming (15 problems)

- [ ] **Climbing Stairs** (LC #70) [Easy] -- Key insight: dp[i] = dp[i-1] + dp[i-2]; this is just the Fibonacci sequence.
- [ ] **Min Cost Climbing Stairs** (LC #746) [Easy] -- Key insight: dp[i] = cost[i] + min(dp[i-1], dp[i-2]); you can start from step 0 or 1.
- [ ] **House Robber** (LC #198) [Medium] -- Key insight: At each house, choose max(rob this + dp[i-2], skip this = dp[i-1]).
- [ ] **House Robber II** (LC #213) [Medium] -- Key insight: The houses form a circle; run House Robber twice -- once excluding the first house, once excluding the last.
- [ ] **Maximum Product Subarray** (LC #152) [Medium] -- Key insight: Track both max and min products at each position because a negative times a negative can become the new max.
- [ ] **Decode Ways** (LC #91) [Medium] -- Key insight: dp[i] depends on whether s[i] is valid (1-9) and whether s[i-1:i+1] is valid (10-26).
- [ ] **Coin Change** (LC #322) [Medium] -- Key insight: dp[amount] = 1 + min(dp[amount - coin]) for each coin; bottom-up from 0 to target amount.
- [ ] **Word Break** (LC #139) [Medium] -- Key insight: dp[i] is true if there exists a j < i where dp[j] is true and s[j:i] is in the dictionary.
- [ ] **Longest Increasing Subsequence** (LC #300) [Medium] -- Key insight: O(n log n) via patience sorting -- maintain a tails array and binary search for the insertion point.
- [ ] **Unique Paths** (LC #62) [Medium] -- Key insight: dp[r][c] = dp[r-1][c] + dp[r][c-1]; the grid can be reduced to a 1D array.
- [ ] **Longest Palindromic Substring** (LC #5) [Medium] -- Key insight: Expand around each center (and each pair of centers) to find the longest palindrome.
- [ ] **Palindromic Substrings** (LC #647) [Medium] -- Key insight: Same expand-around-center technique as above; count every expansion that remains a palindrome.
- [ ] **Longest Common Subsequence** (LC #1143) [Medium] -- Key insight: 2D DP; if characters match, dp[i][j] = 1 + dp[i-1][j-1]; otherwise take max of skipping either character.
- [ ] **Partition Equal Subset Sum** (LC #416) [Medium] -- Key insight: Reduce to 0/1 knapsack targeting total_sum/2; use a 1D boolean dp array.
- [ ] **Edit Distance** (LC #72) [Medium] -- Key insight: dp[i][j] = min of insert (dp[i][j-1]+1), delete (dp[i-1][j]+1), replace (dp[i-1][j-1] + (0 or 1)).

---

## 11. Backtracking (8 problems)

- [ ] **Subsets** (LC #78) [Medium] -- Key insight: At each index, choose to include or exclude the element; collect the path at every node (not just leaves).
- [ ] **Subsets II** (LC #90) [Medium] -- Key insight: Sort first; skip duplicates at the same recursion level by checking if nums[i] == nums[i-1].
- [ ] **Combination Sum** (LC #39) [Medium] -- Key insight: Allow reuse of elements by not advancing the start index when you include the current candidate.
- [ ] **Combination Sum II** (LC #40) [Medium] -- Key insight: Each element used at most once; sort and skip duplicates at the same level to avoid duplicate combinations.
- [ ] **Permutations** (LC #46) [Medium] -- Key insight: Swap elements or use a visited set; every position needs to try every unused element.
- [ ] **Word Search** (LC #79) [Medium] -- Key insight: DFS from each cell matching the first character; mark cells visited during the current path, unmark on backtrack.
- [ ] **Palindrome Partitioning** (LC #131) [Medium] -- Key insight: At each position, try every substring starting there; if it is a palindrome, recurse on the remainder.
- [ ] **N-Queens** (LC #51) [Hard] -- Key insight: Place queens row by row; track attacked columns and diagonals (row-col and row+col) in sets.

---

## 12. Intervals and Greedy (7 problems)

- [ ] **Meeting Rooms** (LC #252) [Easy] -- Key insight: Sort by start time; if any interval overlaps with the previous one, you cannot attend all meetings.
- [ ] **Merge Intervals** (LC #56) [Medium] -- Key insight: Sort by start time; merge the current interval with the last in the result if they overlap.
- [ ] **Insert Interval** (LC #57) [Medium] -- Key insight: Add all intervals that end before the new one, merge all that overlap, then add the rest.
- [ ] **Non-overlapping Intervals** (LC #435) [Medium] -- Key insight: Sort by end time; greedily keep the interval that ends earliest to maximize room for future intervals.
- [ ] **Meeting Rooms II** (LC #253) [Medium] -- Key insight: Sort events by time (start = +1 room, end = -1 room); the peak concurrent rooms is the answer.
- [ ] **Jump Game** (LC #55) [Medium] -- Key insight: Track the farthest index you can reach; if you ever land on an index beyond that, return false.
- [ ] **Jump Game II** (LC #45) [Medium] -- Key insight: BFS-like approach -- track the farthest reachable in the current "level" to count minimum jumps.

---

## 13. Bit Manipulation (4 problems)

- [ ] **Single Number** (LC #136) [Easy] -- Key insight: XOR all elements; every duplicate cancels out, leaving the unique number.
- [ ] **Number of 1 Bits** (LC #191) [Easy] -- Key insight: n & (n-1) removes the lowest set bit; count how many times you can do this.
- [ ] **Counting Bits** (LC #338) [Easy] -- Key insight: dp[i] = dp[i >> 1] + (i & 1); the answer for i depends on the answer for i/2 plus the last bit.
- [ ] **Missing Number** (LC #268) [Easy] -- Key insight: XOR indices 0..n with all array values; the unpaired number is the missing one (or use sum formula).

---

## 14. Advanced / Mixed (8 problems)

- [ ] **Implement Trie (Prefix Tree)** (LC #208) [Medium] -- Key insight: Each node has a children dict and an is_end flag; insert/search/startsWith follow the character chain.
- [ ] **Design Add and Search Words Data Structure** (LC #211) [Medium] -- Key insight: Trie with DFS for wildcard '.'; on '.', branch into all children at that level.
- [ ] **Accounts Merge** (LC #721) [Medium] -- Key insight: Union-Find on emails; group all emails that share an account, then collect and sort each group.
- [ ] **Network Delay Time** (LC #743) [Medium] -- Key insight: Dijkstra's algorithm from the source; the answer is the max shortest distance across all nodes.
- [ ] **Min Cost to Connect All Points** (LC #1584) [Medium] -- Key insight: Minimum spanning tree -- use Prim's with a heap or Kruskal's with Union-Find.
- [ ] **Swim in Rising Water** (LC #778) [Hard] -- Key insight: Binary search on the answer (water level) + BFS to check connectivity, or use Dijkstra on max elevation along path.
- [ ] **Alien Dictionary** (LC #269) [Hard] -- Key insight: Build a directed graph from character ordering between adjacent words; topological sort gives the alphabet.
- [ ] **Find Median from Data Stream** (LC #295) [Hard] -- Key insight: Two heaps -- max-heap for the lower half, min-heap for the upper half; balance their sizes.

---

## Total Problem Count: 122

---

## Suggested 4-Week Problem Schedule

### Week 1: Foundations (Days 1-7) -- ~30 problems
Build core skills with fundamental patterns.

| Day | Focus | Problems |
|-----|-------|----------|
| 1 | Arrays and Hashing | LC #1, #217, #242, #49, #347 |
| 2 | Arrays and Hashing + Two Pointers | LC #238, #560, #128, #283, #125 |
| 3 | Two Pointers | LC #26, #167, #15, #75, #11 |
| 4 | Sliding Window | LC #121, #1004, #3, #424, #567 |
| 5 | Sliding Window + Binary Search | LC #209, #76, #704, #74, #34 |
| 6 | Binary Search | LC #875, #153, #33, #981 |
| 7 | Review + Retry any missed from Week 1 | Revisit problems you could not solve in < 25 min |

### Week 2: Core Data Structures (Days 8-14) -- ~30 problems
Stacks, linked lists, trees, heaps.

| Day | Focus | Problems |
|-----|-------|----------|
| 8 | Stack | LC #20, #155, #150, #22 |
| 9 | Stack | LC #739, #735, #853, #84 |
| 10 | Linked List | LC #206, #21, #141, #19, #2 |
| 11 | Linked List | LC #143, #138, #146 |
| 12 | Trees (Easy + Medium) | LC #226, #104, #100, #572, #235, #102 |
| 13 | Trees (Medium + Hard) | LC #98, #230, #105, #124 |
| 14 | Trees + Heap | LC #297, #703, #1046, #973, #215 |

### Week 3: Graphs and DP (Days 15-21) -- ~35 problems
The two hardest categories for most candidates.

| Day | Focus | Problems |
|-----|-------|----------|
| 15 | Heap + Graphs | LC #621, #23, #200, #133 |
| 16 | Graphs (BFS/DFS) | LC #994, #417, #207, #210 |
| 17 | Graphs (Union-Find + Advanced) | LC #261, #323, #286, #684 |
| 18 | Graphs + DP intro | LC #127, #787, #70, #746 |
| 19 | Dynamic Programming | LC #198, #213, #152, #91, #322 |
| 20 | Dynamic Programming | LC #139, #300, #62, #5, #647 |
| 21 | Dynamic Programming | LC #1143, #416, #72, #4 |

### Week 4: Backtracking, Greedy, Advanced, and Review (Days 22-28) -- ~27 problems

| Day | Focus | Problems |
|-----|-------|----------|
| 22 | Backtracking | LC #78, #90, #39, #40, #46 |
| 23 | Backtracking | LC #79, #131, #51 |
| 24 | Intervals and Greedy | LC #252, #56, #57, #435, #253, #55, #45 |
| 25 | Bit Manipulation + Trie | LC #136, #191, #338, #268, #208, #211 |
| 26 | Advanced / Mixed | LC #721, #743, #1584, #778, #269, #295 |
| 27 | Full mock: pick 4 random mediums, 1 hard, time yourself | 75 min total |
| 28 | Final review of all flagged problems | Focus on patterns, not memorization |

---

## Revision Priority: 30 Must-Solve-Again Problems

These are the highest-signal problems that cover the most patterns and appear frequently in interviews. After completing the full list, cycle through these on a spaced repetition schedule (re-solve at Day 3, Day 7, Day 14 after first solve).

### Tier 1: Solve Every Week (15 problems)
1. **Two Sum** (LC #1) -- Hashing fundamental
2. **3Sum** (LC #15) -- Two pointers + sorting + dedup
3. **Minimum Window Substring** (LC #76) -- Sliding window mastery
4. **Search in Rotated Sorted Array** (LC #33) -- Binary search variant
5. **Valid Parentheses** (LC #20) -- Stack essential
6. **LRU Cache** (LC #146) -- Design + data structure combo
7. **Binary Tree Level Order Traversal** (LC #102) -- BFS on trees
8. **Validate BST** (LC #98) -- Recursive range checking
9. **Merge k Sorted Lists** (LC #23) -- Heap + linked list combo
10. **Number of Islands** (LC #200) -- Graph traversal basic
11. **Course Schedule II** (LC #210) -- Topological sort
12. **Coin Change** (LC #322) -- Classic DP
13. **Word Break** (LC #139) -- DP with string partitioning
14. **Combination Sum** (LC #39) -- Backtracking template
15. **Merge Intervals** (LC #56) -- Interval pattern essential

### Tier 2: Solve Every Two Weeks (15 problems)
16. **Product of Array Except Self** (LC #238) -- Prefix/suffix technique
17. **Trapping Rain Water** (LC #42) -- Two pointer mastery
18. **Largest Rectangle in Histogram** (LC #84) -- Monotonic stack
19. **Reorder List** (LC #143) -- Linked list technique combo
20. **Lowest Common Ancestor of BST** (LC #235) -- BST property usage
21. **Binary Tree Maximum Path Sum** (LC #124) -- Hard tree recursion
22. **Word Search II** (LC #212) -- Trie + DFS combo
23. **Cheapest Flights Within K Stops** (LC #787) -- Constrained shortest path
24. **Longest Increasing Subsequence** (LC #300) -- DP + binary search
25. **Edit Distance** (LC #72) -- 2D DP classic
26. **N-Queens** (LC #51) -- Backtracking with constraints
27. **Meeting Rooms II** (LC #253) -- Interval scheduling
28. **Alien Dictionary** (LC #269) -- Graph construction + topo sort
29. **Find Median from Data Stream** (LC #295) -- Two-heap design
30. **Median of Two Sorted Arrays** (LC #4) -- Hardest binary search
