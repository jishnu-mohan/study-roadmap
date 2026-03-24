# Monotonic Stack

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
