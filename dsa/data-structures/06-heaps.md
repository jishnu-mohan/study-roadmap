# Heaps / Priority Queues

**[SR]**

### What It Is

A **heap** is a complete binary tree that satisfies the **heap property**:
- **Min-heap**: every parent is less than or equal to its children. The root is the minimum.
- **Max-heap**: every parent is greater than or equal to its children. The root is the maximum.

A **priority queue** is the abstract data type; a heap is the most common implementation.

In most languages, a min-heap is the default priority queue implementation.

### How It Works Internally

**Array-based implementation** (the standard approach -- no pointers needed):

For a node at index `i`:
- Parent: `(i - 1) // 2`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

This works because the heap is a **complete** binary tree (all levels filled except possibly the last, which is filled left to right).

**Key operations:**

**Push (insert):**
1. Add the element at the end of the array.
2. "Bubble up" (sift up): compare with parent, swap if heap property is violated, repeat until property holds.
3. Time: O(log n).

**Pop (extract min/max):**
1. Swap the root with the last element.
2. Remove the last element (now contains the old root).
3. "Bubble down" (sift down): compare root with children, swap with the smaller child (min-heap), repeat.
4. Time: O(log n).

**Heapify (build heap from array):**
- Naive: insert elements one by one -- O(n log n).
- Optimal: start from the last non-leaf node and sift down each one -- **O(n)**. This is not obvious but provable: most nodes are near the bottom and sift down a small distance.

```typescript
// Min-heap operations using a custom MinPriorityQueue or a library
// (TypeScript has no built-in heap; shown using a conceptual PriorityQueue)
import { MinPriorityQueue, MaxPriorityQueue } from '@datastructures-js/priority-queue';

const nums: number[] = [3, 1, 4, 1, 5];
const minHeap = new MinPriorityQueue<number>();
for (const n of nums) {
    minHeap.enqueue(n);               // O(log n)
}
minHeap.enqueue(2);                   // O(log n)
const smallest: number = minHeap.dequeue(); // O(log n) -- returns and removes min

// Max-heap
const maxHeap = new MaxPriorityQueue<number>();
for (const n of [3, 1, 4, 1, 5]) {
    maxHeap.enqueue(n);
}
const largest: number = maxHeap.dequeue();

// Top K smallest -- push all, pop K times
const topK: number[] = [];
for (let i = 0; i < 3; i++) {
    topK.push(minHeap.dequeue());     // O(n log k) overall
}
```

```java
import java.util.*;

// Min-heap operations
int[] numsArr = {3, 1, 4, 1, 5};
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
for (int n : numsArr) {
    minHeap.offer(n);                  // O(log n)
}
minHeap.offer(2);                      // O(log n)
int smallest = minHeap.poll();         // O(log n) -- returns and removes min

// Max-heap using reversed comparator
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
for (int n : new int[]{3, 1, 4, 1, 5}) {
    maxHeap.offer(n);
}
int largest = maxHeap.poll();

// Top K smallest -- push all, pop K times
List<Integer> topK = new ArrayList<>();
for (int i = 0; i < 3; i++) {
    topK.add(minHeap.poll());          // O(n log k) overall
}
```

```python
import heapq

# Min-heap operations
nums = [3, 1, 4, 1, 5]
heapq.heapify(nums)          # O(n) -- in-place
heapq.heappush(nums, 2)      # O(log n)
smallest = heapq.heappop(nums)  # O(log n) -- returns and removes min

# Max-heap trick: negate all values
max_heap = [-x for x in [3, 1, 4, 1, 5]]
heapq.heapify(max_heap)
largest = -heapq.heappop(max_heap)

# Top K smallest
top_3 = heapq.nsmallest(3, nums)  # O(n log k)
# Top K largest
top_3 = heapq.nlargest(3, nums)
```

### Operations and Complexity

| Operation | Time |
|---|---|
| Build heap (heapify) | O(n) |
| Push | O(log n) |
| Pop (extract min/max) | O(log n) |
| Peek (get min/max) | O(1) |
| Search | O(n) -- heap is not optimized for search |
| Push + Pop combined | O(log n) |

### When to Use It

- **"Kth largest/smallest"** --> heap of size K.
- **"Top K"** or **"K most frequent"** --> heap.
- **"Merge K sorted"** anything --> min-heap of size K.
- **"Median"** from a stream --> two heaps (max-heap for lower half, min-heap for upper half).
- **"Scheduling"** or **"minimize cost"** with greedy choices --> priority queue.
- **"Continuously get the min/max"** while adding elements --> heap.

**Key decision -- min-heap of size K for "Kth largest":**
- Maintain a min-heap of size K. The root is always the Kth largest.
- For each new element, if it is larger than the root, pop the root and push the new element.
- Final root = Kth largest. Time: O(n log k).

### Common Interview Patterns

1. **Top-K pattern**: Use a heap of size K to avoid sorting the entire array.

2. **Two-heap pattern** (for medians): Max-heap for the smaller half, min-heap for the larger half. Balance their sizes so that the median is always at one of the roots.

3. **Merge K sorted lists**: Push the head of each list into a min-heap. Pop the smallest, then push its next node. Repeat.

4. **Greedy with heap**: Many greedy algorithms use a heap to efficiently get the next best choice (Huffman coding, task scheduling).

### Must-Know Problems

**Kth Largest Element in an Array** (LeetCode 215)
- Approach 1: Min-heap of size K -- O(n log k).
- Approach 2: Quickselect -- O(n) average, O(n^2) worst.
- Key insight: a min-heap of size K naturally filters to keep the K largest, with the Kth largest at the root.

**Merge K Sorted Lists** (LeetCode 23)
- Approach: Min-heap storing (value, list_index, node). Pop smallest, push its next.
- Time: O(n log k) where n is total elements, k is number of lists.
- Key insight: the heap always has at most K elements, so each operation is O(log k).

```typescript
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
    // Min-heap entries: [value, listIndex, node]
    const heap = new MinPriorityQueue<[number, number, ListNode]>({
        compare: (a, b) => a[0] - b[0],
    });
    for (let i = 0; i < lists.length; i++) {
        if (lists[i] !== null) {
            heap.enqueue([lists[i]!.val, i, lists[i]!]);
        }
    }
    const dummy = new ListNode(0);
    let current = dummy;
    while (!heap.isEmpty()) {
        const [val, i, node] = heap.dequeue();
        current.next = node;
        current = current.next;
        if (node.next !== null) {
            heap.enqueue([node.next.val, i, node.next]);
        }
    }
    return dummy.next;
}
```

```java
import java.util.*;

public ListNode mergeKLists(ListNode[] lists) {
    // Min-heap entries: [value, listIndex, node]
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    // Store nodes separately since PriorityQueue needs comparable entries
    Map<Integer, ListNode> nodeMap = new HashMap<>();
    int id = 0;
    for (int i = 0; i < lists.length; i++) {
        if (lists[i] != null) {
            heap.offer(new int[]{lists[i].val, id});
            nodeMap.put(id++, lists[i]);
        }
    }
    ListNode dummy = new ListNode(0);
    ListNode current = dummy;
    while (!heap.isEmpty()) {
        int[] entry = heap.poll();
        ListNode node = nodeMap.remove(entry[1]);
        current.next = node;
        current = current.next;
        if (node.next != null) {
            heap.offer(new int[]{node.next.val, id});
            nodeMap.put(id++, node.next);
        }
    }
    return dummy.next;
}
```

```python
import heapq
def merge_k_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst.val, i, lst))
    dummy = ListNode(0)
    current = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        current.next = node
        current = current.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

**Top K Frequent Elements** (LeetCode 347)
- Approach 1: Count frequencies with a hash map, then use a min-heap of size K.
- Approach 2: Bucket sort -- create buckets indexed by frequency, iterate from highest frequency.
- Key insight: the bucket sort approach is O(n) and avoids the heap entirely.
