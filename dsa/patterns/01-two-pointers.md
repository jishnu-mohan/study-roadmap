# Two Pointers

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
