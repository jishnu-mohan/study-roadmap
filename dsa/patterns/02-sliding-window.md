# Sliding Window

[SR] Tag: sliding-window, subarray, substring, contiguous

### When to Recognize

- Problem mentions **subarray** or **substring** (contiguous elements).
- There is a **constraint** to satisfy (max length, sum threshold, character limit).
- Keywords like "longest", "shortest", "maximum sum of subarray of size k".
- The problem has an optimal substructure where expanding/shrinking a window makes sense.

### Core Idea

Maintain a window defined by two pointers (left, right). Expand the window by moving
right to include more elements. When the window violates the constraint, shrink it by
moving left. This converts O(n^2) brute force into O(n) by ensuring each element is
visited at most twice (once by each pointer).

Fixed-size windows move both pointers together; variable-size windows expand right
freely and contract left only when needed.

### Python Code Template

```python
# Variable-size sliding window
def sliding_window(s):
    left = 0
    window = {}  # or any state tracker
    result = 0

    for right in range(len(s)):
        # Expand: add s[right] to window state
        window[s[right]] = window.get(s[right], 0) + 1

        # Shrink: while window is invalid, remove s[left]
        while window_is_invalid(window):
            window[s[left]] -= 1
            if window[s[left]] == 0:
                del window[s[left]]
            left += 1

        # Update result
        result = max(result, right - left + 1)

    return result

# Fixed-size sliding window
def fixed_window(nums, k):
    window_sum = sum(nums[:k])
    result = window_sum
    for right in range(k, len(nums)):
        window_sum += nums[right] - nums[right - k]
        result = max(result, window_sum)
    return result
```

### Classic Example Walkthrough: Longest Substring Without Repeating Characters (LC 3)

**Problem:** Find the length of the longest substring without repeating characters.

```python
def lengthOfLongestSubstring(s):
    char_index = {}  # char -> its latest index
    left = 0
    result = 0

    for right in range(len(s)):
        if s[right] in char_index and char_index[s[right]] >= left:
            left = char_index[s[right]] + 1
        char_index[s[right]] = right
        result = max(result, right - left + 1)

    return result
```

**Step-by-step with s = "abcabcbb":**

1. right=0, char='a', char_index={'a':0}, window="a", result=1
2. right=1, char='b', char_index={'a':0,'b':1}, window="ab", result=2
3. right=2, char='c', char_index={'a':0,'b':1,'c':2}, window="abc", result=3
4. right=3, char='a', 'a' seen at index 0 >= left(0), so left=1. char_index={'a':3,'b':1,'c':2}, window="bca", result=3
5. right=4, char='b', 'b' seen at index 1 >= left(1), so left=2. window="cab", result=3
6. right=5, char='c', 'c' seen at index 2 >= left(2), so left=3. window="abc", result=3
7. right=6, char='b', 'b' seen at index 4 >= left(3), so left=5. window="cb", result=3
8. right=7, char='b', 'b' seen at index 6 >= left(5), so left=7. window="b", result=3
9. Final result: 3

### Variations

- **Minimum Window Substring (LC 76)** -- variable window, shrink when all target chars are covered, track minimum length.
- **Max Consecutive Ones III (LC 1004)** -- variable window, allow at most k flips (zeros in window <= k).
- **Longest Repeating Character Replacement (LC 424)** -- window where (length - max_freq_char_count) <= k.
- **Permutation in String (LC 567)** -- fixed-size window matching character frequency.
- **Fruit Into Baskets (LC 904)** -- longest subarray with at most 2 distinct elements.

### Edge Cases

- Empty string or single character.
- All characters identical (window = entire string).
- All characters unique (window = entire string).
- k=0 in problems allowing k modifications (window cannot expand past violations).

### Complexity

- **Time:** O(n) -- each element is added and removed from the window at most once.
- **Space:** O(min(n, alphabet_size)) for the hash map / frequency counter.
