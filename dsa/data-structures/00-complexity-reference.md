# Complexity Reference

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
