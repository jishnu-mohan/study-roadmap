# Hash Maps and Hash Sets

**[SR]**

### What It Is

A **hash map** (dictionary in Python, `Map` in JS) stores key-value pairs with average O(1) lookup, insertion, and deletion. It works by computing a hash of the key to determine where to store the value in an internal array of "buckets."

A **hash set** is the same structure but stores only keys (no values). Use it when you need fast membership testing.

### How It Works Internally

**Step-by-step of a lookup/insert:**

1. Compute `hash(key)` -- produces an integer.
2. Compute `index = hash(key) % num_buckets` -- maps the hash to a bucket.
3. Go to that bucket and either find the key (lookup) or store the key-value pair (insert).

**Collision resolution** -- when two different keys map to the same bucket:

**Chaining (separate chaining):**
- Each bucket holds a linked list (or in modern implementations, a balanced tree when the chain gets long).
- On collision, append to the list at that bucket.
- Worst case: all keys hash to same bucket --> O(n) lookup.
- Python `dict` uses a variant of open addressing, but conceptually chaining is easiest to reason about.

**Open addressing (probing):**
- All entries stored directly in the array. On collision, probe for the next open slot.
- Linear probing: check slot+1, slot+2, ... (causes clustering).
- Quadratic probing: check slot+1, slot+4, slot+9, ... (reduces clustering).
- Double hashing: use a second hash function to determine probe step size.
- Python's `dict` uses open addressing with a custom probing sequence.

**Load factor and rehashing:**
- Load factor = `num_entries / num_buckets`.
- When load factor exceeds a threshold (commonly 0.7), the table **rehashes**: allocates a larger array (typically 2x) and re-inserts all entries.
- Rehashing is O(n) but happens infrequently, giving amortized O(1) insertions.

**Python `dict` internals (CPython 3.6+):**
- Maintains insertion order.
- Uses a compact hash table with two arrays: a sparse index table and a dense entries array.
- This is why `dict` in Python 3.7+ guarantees insertion order.

### Operations and Complexity

| Operation | Average | Worst |
|---|---|---|
| Insert | O(1) | O(n) -- rehash or all collisions |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |
| Iteration | O(n) | O(n) |

### When to Use It

- **"Find if X exists"** --> hash set for O(1) lookup.
- **"Count occurrences"** or **"frequency"** --> hash map with value as count.
- **"Group items by some property"** --> hash map with property as key, list as value.
- **"Two Sum" style** --> hash map to store complements.
- **"Find duplicates"** --> hash set.
- **"Subarray sum equals K"** --> hash map storing prefix sums.

**Map vs Set decision:**
- Need to associate keys with values? --> Map.
- Only need to check membership or uniqueness? --> Set.

### Common Interview Patterns

1. **Frequency counting** -- `collections.Counter` in Python or manual counting with a dict.

```typescript
// frequency counting
const freq: Map<number, number> = new Map();
for (const x of arr) {
    freq.set(x, (freq.get(x) ?? 0) + 1);
}
```

```java
// frequency counting
Map<Integer, Integer> freq = new HashMap<>();
for (int x : arr) {
    freq.merge(x, 1, Integer::sum);
}
```

```python
from collections import Counter
freq = Counter(arr)  # {element: count}
```

2. **Two-pass vs one-pass**: Two Sum can be solved in two passes (build map, then check) or one pass (check and build simultaneously). One-pass is cleaner.

3. **Prefix sum + hash map**: For "subarray sum equals K", store prefix sums in a hash map. At each index, check if `current_prefix_sum - K` exists in the map.

```typescript
function subarraySum(nums: number[], k: number): number {
    let count = 0;
    let prefix = 0;
    const seen: Map<number, number> = new Map([[0, 1]]); // prefix_sum -> number of times seen
    for (const num of nums) {
        prefix += num;
        if (seen.has(prefix - k)) {
            count += seen.get(prefix - k)!;
        }
        seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
    }
    return count;
}
```

```java
public int subarraySum(int[] nums, int k) {
    int count = 0;
    int prefix = 0;
    Map<Integer, Integer> seen = new HashMap<>(); // prefix_sum -> number of times seen
    seen.put(0, 1);
    for (int num : nums) {
        prefix += num;
        if (seen.containsKey(prefix - k)) {
            count += seen.get(prefix - k);
        }
        seen.merge(prefix, 1, Integer::sum);
    }
    return count;
}
```

```python
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = {0: 1}  # prefix_sum -> number of times seen
    for num in nums:
        prefix += num
        if prefix - k in seen:
            count += seen[prefix - k]
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

4. **Sliding window + hash map**: Track character frequencies in a window for substring problems.

### Must-Know Problems

**Group Anagrams** (LeetCode 49)
- Approach: Use sorted string as key (or a tuple of character counts). Group all strings with the same key.
- Key insight: two strings are anagrams if and only if their sorted forms are identical.

```typescript
function groupAnagrams(strs: string[]): string[][] {
    const groups: Map<string, string[]> = new Map();
    for (const s of strs) {
        const key = s.split("").sort().join("");
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(s);
    }
    return Array.from(groups.values());
}
```

```java
public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}
```

```python
from collections import defaultdict
def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))
        groups[key].append(s)
    return list(groups.values())
```

**LRU Cache** (LeetCode 146)
- Approach: Combine a hash map (for O(1) key lookup) with a doubly linked list (for O(1) removal and insertion at ends). Python's `OrderedDict` does this natively.
- Key insight: the linked list maintains access order; the map provides fast access to any node.

**Subarray Sum Equals K** (LeetCode 560)
- Approach: Prefix sum with a hash map (shown in the pattern above).
- Key insight: `sum(arr[i:j]) == K` is equivalent to `prefix[j] - prefix[i] == K`.
