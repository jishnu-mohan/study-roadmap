# Linked Lists

**[SR]**

### What It Is

A **linked list** is a linear data structure where each element (node) contains data and a pointer (reference) to the next node. Unlike arrays, elements are not stored contiguously in memory -- each node can be anywhere in the heap.

**Singly linked list**: each node has `val` and `next`.
**Doubly linked list**: each node has `val`, `next`, and `prev`.

### How It Works Internally

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

**Memory layout comparison with arrays:**

| Property | Array | Linked List |
|---|---|---|
| Memory | Contiguous block | Scattered nodes |
| Cache performance | Excellent (spatial locality) | Poor (pointer chasing) |
| Random access | O(1) | O(n) |
| Insert at front | O(n) -- shift everything | O(1) -- change pointer |
| Insert at arbitrary position | O(n) | O(1) if you have the node reference |
| Memory overhead | None (just data) | Extra pointer per node (8 bytes on 64-bit) |

**Why linked lists still matter in interviews:** They test pointer manipulation skills, which proxy for your ability to handle complex state mutations without bugs.

### Operations and Complexity

| Operation | Singly | Doubly |
|---|---|---|
| Access by index | O(n) | O(n) |
| Insert at head | O(1) | O(1) |
| Insert at tail (with tail pointer) | O(1) | O(1) |
| Insert after a given node | O(1) | O(1) |
| Delete a given node | O(n)* | O(1) |
| Search | O(n) | O(n) |

*Singly linked list deletion requires traversal to find the previous node, unless you use the "copy next node's value" trick.

### When to Use It

- **"Rearrange nodes"** (not values) --> linked list pointer manipulation.
- **"Merge sorted lists"** --> linked list merge.
- **"Find cycle"** or **"find intersection"** --> fast/slow pointers.
- **"Reverse"** --> iterative pointer reversal.
- When a problem gives you a linked list, it is testing your pointer skills, not asking you to convert to an array.

### Common Interview Patterns

1. **Sentinel (dummy) node** -- create a dummy head to simplify edge cases (empty list, insert at head, etc.):

```python
def merge_two_lists(l1, l2):
    dummy = ListNode(0)
    current = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            current.next = l1
            l1 = l1.next
        else:
            current.next = l2
            l2 = l2.next
        current = current.next
    current.next = l1 or l2
    return dummy.next
```

2. **Fast/slow pointers (Floyd's algorithm)**:
   - **Find middle**: slow moves 1 step, fast moves 2 steps. When fast reaches end, slow is at middle.
   - **Detect cycle**: if fast and slow ever meet, there is a cycle.
   - **Find cycle start**: after they meet, move one pointer to head and advance both by 1. They meet at the cycle start.

3. **Reverse a linked list** (iterative -- you must be able to write this in your sleep):

```python
def reverse_list(head):
    prev = None
    current = head
    while current:
        next_node = current.next  # save
        current.next = prev       # reverse
        prev = current            # advance
        current = next_node       # advance
    return prev
```

4. **Reverse in groups** -- extension of the above for k-group reversal.

### Must-Know Problems

**Reverse Linked List** (LeetCode 206)
- Approach: Three-pointer iterative (prev, current, next_node) or recursive.
- Key insight: save the next pointer before overwriting it. This is the fundamental linked list operation.

**Merge Two Sorted Lists** (LeetCode 21)
- Approach: Dummy node + compare heads of both lists, attach the smaller one.
- Key insight: the dummy node eliminates all edge cases around "which list starts the result."

**Linked List Cycle** (LeetCode 141) / **Linked List Cycle II** (LeetCode 142)
- Approach: Floyd's tortoise and hare algorithm.
- Key insight for finding cycle start (142): after detection, the distance from head to cycle start equals the distance from meeting point to cycle start. This is a mathematical property, not intuition.
