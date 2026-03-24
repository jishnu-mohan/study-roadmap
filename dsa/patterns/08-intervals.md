# Intervals

[SR] Tag: intervals, ranges, scheduling, merge, overlap

### When to Recognize

- Input is a list of **intervals** [start, end] or **ranges**.
- Problem asks about **overlaps, merges, gaps, or coverage**.
- Scheduling problems: "meeting rooms", "minimum rooms", "free time".
- Keywords: "merge", "insert", "intersect", "overlap", "conflicting".

### Core Idea

Sort intervals by start time (or end time, depending on the problem). Then iterate
through, using the relationship between the current interval and the previous one
(or a running state) to merge, count overlaps, or detect gaps. Many interval problems
reduce to a sweep-line approach or a sort-and-compare pattern.

### Code Template

```typescript
function intervalTemplate(intervals: number[][]): number[][] {
    intervals.sort((a, b) => a[0] - b[0]);  // sort by start
    const result: number[][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const last = result[result.length - 1];

        if (current[0] <= last[1]) {
            // Overlap: merge or handle
            last[1] = Math.max(last[1], current[1]);
        } else {
            // No overlap: add to result
            result.push(current);
        }
    }

    return result;
}
```

```java
public int[][] intervalTemplate(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);  // sort by start
    List<int[]> result = new ArrayList<>();
    result.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] current = intervals[i];
        int[] last = result.get(result.size() - 1);

        if (current[0] <= last[1]) {
            // Overlap: merge or handle
            last[1] = Math.max(last[1], current[1]);
        } else {
            // No overlap: add to result
            result.add(current);
        }
    }

    return result.toArray(new int[result.size()][]);
}
```

```python
def interval_template(intervals):
    intervals.sort(key=lambda x: x[0])  # sort by start
    result = [intervals[0]]

    for i in range(1, len(intervals)):
        current = intervals[i]
        last = result[-1]

        if current[0] <= last[1]:
            # Overlap: merge or handle
            last[1] = max(last[1], current[1])
        else:
            # No overlap: add to result
            result.append(current)

    return result
```

### Classic Example Walkthrough: Merge Intervals (LC 56)

**Problem:** Merge all overlapping intervals.

```typescript
function merge(intervals: number[][]): number[][] {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged: number[][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] <= merged[merged.length - 1][1]) {
            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], intervals[i][1]);
        } else {
            merged.push(intervals[i]);
        }
    }

    return merged;
}
```

```java
public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> merged = new ArrayList<>();
    merged.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] <= merged.get(merged.size() - 1)[1]) {
            merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], intervals[i][1]);
        } else {
            merged.add(intervals[i]);
        }
    }

    return merged.toArray(new int[merged.size()][]);
}
```

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for i in range(1, len(intervals)):
        if intervals[i][0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], intervals[i][1])
        else:
            merged.append(intervals[i])

    return merged
```

**Step-by-step with intervals = [[1,3],[2,6],[8,10],[15,18]]:**

1. Sort (already sorted): [[1,3],[2,6],[8,10],[15,18]]
2. merged = [[1,3]]
3. [2,6]: 2 <= 3 (overlap). Merge: merged[-1] = [1, max(3,6)] = [1,6]. merged = [[1,6]]
4. [8,10]: 8 > 6 (no overlap). Append. merged = [[1,6],[8,10]]
5. [15,18]: 15 > 10 (no overlap). Append. merged = [[1,6],[8,10],[15,18]]
6. Result: [[1,6],[8,10],[15,18]]

### Variations

- **Insert Interval (LC 57)** -- find position, merge with overlapping, reconstruct.
- **Meeting Rooms II (LC 253)** -- min heaps or sweep line to track concurrent meetings.
- **Non-overlapping Intervals (LC 435)** -- sort by end, greedily remove overlapping.
- **Interval List Intersections (LC 986)** -- two pointers through two sorted interval lists.
- **Employee Free Time (LC 759)** -- merge all employee schedules, find gaps.

### Edge Cases

- Single interval (return as-is).
- All intervals overlap (merge into one).
- No intervals overlap (return sorted list).
- Intervals with identical start or end times.
- Intervals where start == end (zero-length intervals).
- Unsorted input (always sort first).

### Complexity

- **Time:** O(n log n) for sorting, O(n) for the merge pass.
- **Space:** O(n) for the result (O(1) extra if merging in-place).
