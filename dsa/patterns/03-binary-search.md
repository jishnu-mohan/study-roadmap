# Binary Search

[SR] Tag: binary-search, sorted, monotonic, search-on-answer

### When to Recognize

- Input is **sorted** or has a **monotonic property**.
- Problem asks for a **specific value** or **boundary** (first/last occurrence).
- "Minimum maximum" or "maximum minimum" phrasing (search on answer space).
- Problem can be rephrased as: "Is there a value x such that f(x) is true?" where f
  transitions from false to true (or vice versa).

### Core Idea

Repeatedly halve the search space by comparing the middle element to the target.
Standard binary search works on sorted arrays. "Search on answer space" applies binary
search to the result domain -- guess an answer, check feasibility, and narrow the range.
The key insight is that binary search works whenever there is a monotonic predicate.

### Code Template

```typescript
// Standard binary search
function binarySearch(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

// Binary search on answer space (find minimum valid answer)
function searchOnAnswer(lo: number, hi: number): number {
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (isFeasible(mid)) {
            hi = mid;        // mid could be the answer, search left
        } else {
            lo = mid + 1;    // mid is too small
        }
    }
    return lo;
}

// Find leftmost (first) occurrence
function findLeft(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length - 1;
    let result = -1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) {
            result = mid;
            right = mid - 1;  // keep searching left
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return result;
}
```

```java
// Standard binary search
public int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

// Binary search on answer space (find minimum valid answer)
public int searchOnAnswer(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (isFeasible(mid)) {
            hi = mid;        // mid could be the answer, search left
        } else {
            lo = mid + 1;    // mid is too small
        }
    }
    return lo;
}

// Find leftmost (first) occurrence
public int findLeft(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    int result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            result = mid;
            right = mid - 1;  // keep searching left
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return result;
}
```

```python
# Standard binary search
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Binary search on answer space (find minimum valid answer)
def search_on_answer(lo, hi):
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if is_feasible(mid):
            hi = mid        # mid could be the answer, search left
        else:
            lo = mid + 1    # mid is too small
    return lo

# Find leftmost (first) occurrence
def find_left(nums, target):
    left, right = 0, len(nums) - 1
    result = -1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            result = mid
            right = mid - 1  # keep searching left
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return result
```

### Classic Example Walkthrough: Search in Rotated Sorted Array (LC 33)

**Problem:** Search for a target in a sorted array that has been rotated at some pivot.

```typescript
function search(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) {
            return mid;
        }

        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        // Right half is sorted
        } else {
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }

    return -1;
}
```

```java
public int search(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            return mid;
        }

        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        // Right half is sorted
        } else {
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }

    return -1;
}
```

```python
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid

        # Left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

**Step-by-step with nums = [4,5,6,7,0,1,2], target = 0:**

1. left=0, right=6, mid=3. nums[3]=7, not target.
   - nums[0]=4 <= nums[3]=7, so left half [4,5,6,7] is sorted.
   - Is 4 <= 0 < 7? No. So target is in right half. left=4.
2. left=4, right=6, mid=5. nums[5]=1, not target.
   - nums[4]=0 <= nums[5]=1, so left half [0,1] is sorted.
   - Is 0 <= 0 < 1? Yes. So target is in left half. right=4.
3. left=4, right=4, mid=4. nums[4]=0 == target. Return 4.

### Variations

- **Koko Eating Bananas (LC 875)** -- search on answer space for minimum eating speed.
- **Find First and Last Position of Element (LC 34)** -- two binary searches for left and right bounds.
- **Search a 2D Matrix (LC 74)** -- treat 2D matrix as a flat sorted array.
- **Find Minimum in Rotated Sorted Array (LC 153)** -- binary search comparing mid to right boundary.
- **Capacity To Ship Packages (LC 1011)** -- search on answer space for minimum capacity.

### Edge Cases

- Single element array.
- Target is at the boundaries (first or last element).
- All elements identical (breaks the rotated array assumption in LC 81).
- Search space has only one valid answer at the boundary of lo or hi.
- Integer overflow when computing mid (use lo + (hi - lo) // 2).

### Complexity

- **Time:** O(log n) per search.
- **Space:** O(1).
