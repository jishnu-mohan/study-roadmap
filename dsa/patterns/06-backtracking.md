# Backtracking

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
