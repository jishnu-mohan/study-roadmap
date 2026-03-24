# Arrays and Strings

**[SR]**

### What It Is

An **array** is a contiguous block of memory that stores elements of the same type sequentially. Each element is accessible in constant time via its index because the memory address can be computed directly: `base_address + index * element_size`.

A **string** in most languages (Python, Java, Go, JS) is an immutable array of characters. Any "modification" creates a new string, which has significant performance implications.

In Python specifically:
- `list` is a dynamic array (like `std::vector` in C++ or `ArrayList` in Java).
- `str` is immutable. Concatenation in a loop is O(n^2) unless you use `"".join()`.

### How It Works Internally

**Static arrays** have fixed size determined at allocation. **Dynamic arrays** (Python `list`, JS `Array`) use the following strategy:

1. Allocate an internal buffer with some capacity (e.g., 8 slots).
2. Track the current `size` (number of elements actually stored).
3. When `size == capacity`, allocate a new buffer of `2 * capacity`, copy all elements over, and free the old buffer.
4. This doubling strategy gives **amortized O(1)** append, because the expensive O(n) copy happens exponentially less often.

**Memory layout matters**: arrays are cache-friendly because elements are contiguous. Linked lists are not. This is why arrays often outperform linked lists in practice even when big-O is the same.

**String immutability trap**:

```python
# BAD -- O(n^2) because each += creates a new string
s = ""
for char in characters:
    s += char

# GOOD -- O(n) total
s = "".join(characters)
```

### Operations and Complexity

| Operation | Average | Worst |
|---|---|---|
| Access by index | O(1) | O(1) |
| Search (unsorted) | O(n) | O(n) |
| Search (sorted) | O(log n) | O(log n) |
| Insert at end (dynamic) | O(1) amortized | O(n) when resizing |
| Insert at position i | O(n) | O(n) |
| Delete at position i | O(n) | O(n) |
| Append | O(1) amortized | O(n) |
| Slice `arr[i:j]` | O(j - i) | O(j - i) |

### When to Use It

Pattern recognition triggers:

- **"Contiguous subarray"** or **"subarray sum"** --> sliding window or prefix sum on an array.
- **"In-place"** --> modify the array without allocating a new one; often uses two pointers.
- **"Sorted array"** --> binary search or two pointers from both ends.
- **"Substring"** --> sliding window with a hash map/set for character tracking.
- **"Rearrange elements"** --> think about swapping (partitioning, Dutch National Flag).

### Common Interview Patterns

1. **Two Pointers** -- one pointer at each end, moving inward. Works on sorted arrays or when you need to compare elements from both sides.

2. **Sliding Window** -- maintain a window `[left, right]` that expands or contracts. Use for subarray/substring problems with constraints.

3. **Prefix Sum** -- precompute cumulative sums so any subarray sum `arr[i:j]` = `prefix[j] - prefix[i]` in O(1).

4. **In-place Manipulation** -- use the array itself as storage. Classic example: move zeroes to end, remove duplicates from sorted array.

5. **String Builder Pattern** -- collect characters in a list, join at the end. Avoids O(n^2) string concatenation.

### Must-Know Problems

**Two Sum** (LeetCode 1)
- Approach: Single pass with a hash map. For each number, check if `target - num` exists in the map. If not, store `num -> index`.
- Key insight: hash map turns the O(n^2) brute force into O(n).

**Container With Most Water** (LeetCode 11)
- Approach: Two pointers at both ends. Compute area, then move the pointer with the shorter height inward.
- Key insight: moving the shorter side is the only way to potentially find a larger area, because width is already decreasing.

**Longest Substring Without Repeating Characters** (LeetCode 3)
- Approach: Sliding window with a hash set (or hash map storing last index of each character). Expand right, and when a duplicate is found, shrink from left.
- Key insight: the window always contains unique characters. When you find a repeat, jump `left` to one past the previous occurrence.
