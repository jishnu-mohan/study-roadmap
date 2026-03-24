# Stacks and Queues

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
