# Greedy

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
