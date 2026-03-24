# Bit Manipulation

[SR] Tag: bit-manipulation, xor, bitmask, binary

### When to Recognize

- Problem involves **finding duplicates or missing numbers** with O(1) space constraints.
- Keywords: "single number", "appears once", "power of two", "bit count".
- Problem can be modeled with **binary representations** or **bitmasks**.
- Need to perform operations like set/clear/toggle/check individual bits.
- Constraint hints at bitwise solution (e.g., "solve without extra memory").

### Core Idea

Bit manipulation leverages properties of binary operations. The most important trick is
XOR: a ^ a = 0 and a ^ 0 = a, so XORing all elements cancels duplicates. Other useful
operations include AND to check/clear bits, OR to set bits, and shifts to isolate
specific bit positions. Bitmasks can represent subsets of a set efficiently.

### Key Operations Reference

```typescript
// Check if bit at position i is set
(n >> i) & 1

// Set bit at position i
n | (1 << i)

// Clear bit at position i
n & ~(1 << i)

// Toggle bit at position i
n ^ (1 << i)

// Check if power of two
n > 0 && (n & (n - 1)) === 0

// Count set bits (Brian Kernighan)
let count = 0;
while (n) {
    n &= n - 1;
    count++;
}

// Lowest set bit
const lowest = n & (-n);

// Clear lowest set bit
n & (n - 1)
```

```java
// Check if bit at position i is set
(n >> i) & 1

// Set bit at position i
n | (1 << i)

// Clear bit at position i
n & ~(1 << i)

// Toggle bit at position i
n ^ (1 << i)

// Check if power of two
n > 0 && (n & (n - 1)) == 0

// Count set bits (Brian Kernighan)
int count = 0;
while (n != 0) {
    n &= n - 1;
    count++;
}

// Lowest set bit
int lowest = n & (-n);

// Clear lowest set bit
n & (n - 1)
```

```python
# Check if bit at position i is set
(n >> i) & 1

# Set bit at position i
n | (1 << i)

# Clear bit at position i
n & ~(1 << i)

# Toggle bit at position i
n ^ (1 << i)

# Check if power of two
n > 0 and (n & (n - 1)) == 0

# Count set bits (Brian Kernighan)
count = 0
while n:
    n &= n - 1
    count += 1

# Lowest set bit
lowest = n & (-n)

# Clear lowest set bit
n & (n - 1)
```

### Classic Example Walkthrough: Single Number (LC 136)

**Problem:** Every element appears twice except one. Find the single one. Must use O(1) extra space.

```typescript
function singleNumber(nums: number[]): number {
    let result = 0;
    for (const num of nums) {
        result ^= num;
    }
    return result;
}
```

```java
public int singleNumber(int[] nums) {
    int result = 0;
    for (int num : nums) {
        result ^= num;
    }
    return result;
}
```

```python
def singleNumber(nums):
    result = 0
    for num in nums:
        result ^= num
    return result
```

**Step-by-step with nums = [4, 1, 2, 1, 2]:**

```
result = 0
result ^= 4 -> 0 ^ 4 = 4       (binary: 000 ^ 100 = 100)
result ^= 1 -> 4 ^ 1 = 5       (binary: 100 ^ 001 = 101)
result ^= 2 -> 5 ^ 2 = 7       (binary: 101 ^ 010 = 111)
result ^= 1 -> 7 ^ 1 = 6       (binary: 111 ^ 001 = 110)
result ^= 2 -> 6 ^ 2 = 4       (binary: 110 ^ 010 = 100)
```

Result: 4. The duplicate 1s and 2s cancel out, leaving only 4.

**Why it works:** XOR is commutative and associative. So 4^1^2^1^2 = 4^(1^1)^(2^2) = 4^0^0 = 4.

### Variations

- **Number of 1 Bits (LC 191)** -- Brian Kernighan's trick: repeatedly clear lowest set bit, count iterations.
- **Counting Bits (LC 338)** -- dp[i] = dp[i & (i-1)] + 1. Uses the clear-lowest-set-bit trick.
- **Single Number II (LC 137)** -- every element appears three times except one. Count bits modulo 3.
- **Single Number III (LC 260)** -- two elements appear once. XOR all, split by a differing bit.
- **Reverse Bits (LC 190)** -- shift result left and source right, extracting one bit at a time.

### Edge Cases

- Negative numbers (Python handles arbitrary precision, but be aware of two's complement in other languages).
- n = 0 (no bits set).
- n = 1 (single bit).
- Large numbers near integer limits (not an issue in Python but relevant in interviews discussing other languages).
- All bits set (e.g., n = -1 in two's complement).

### Complexity

- **Time:** O(n) for array traversal, O(log n) or O(number of bits) for individual number operations.
- **Space:** O(1) -- bit manipulation avoids extra data structures.
