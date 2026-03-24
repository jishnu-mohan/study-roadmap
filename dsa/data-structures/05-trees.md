# Trees

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
