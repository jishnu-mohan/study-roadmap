# Spaced Repetition Tracker

Track every topic you learn and schedule reviews at optimal intervals to lock knowledge into long-term memory.

---

## 1. How Spaced Repetition Works

Your brain forgets new information rapidly. Research on the **forgetting curve** (Ebbinghaus, 1885) shows that without review, you lose roughly:
- 50% of new information within 1 day
- 70% within 3 days
- 90% within 1 month

Spaced repetition fights this by scheduling reviews at precisely the moments when you are about to forget. Each successful review strengthens the memory and pushes the next forgetting point further out.

**The intervals used in this tracker:**

| Review | When | Purpose |
|--------|------|---------|
| Day 1 | 1 day after learning | Catch immediate decay. Quick review to reinforce. |
| Day 3 | 3 days after learning | Reinforce before the steep part of the forgetting curve. |
| Day 7 | 7 days after learning | One-week check. If you can recall it now, the memory is forming. |
| Day 14 | 14 days after learning | Two-week consolidation. Deeper review to fill any gaps. |
| Day 30 | 30 days after learning | Long-term lock-in. If you pass this review, the knowledge is durable. |

The key insight: you do not need to spend hours re-studying. A focused 15-minute review at the right time is more effective than hours of cramming at the wrong time.

---

## 2. How to Use This Tracker

1. **After completing a topic or pattern**, add it to the appropriate tracking table below.
2. **Fill in the "Date Learned" column** with the date you finished studying it.
3. **Calculate your review dates** by adding 1, 3, 7, 14, and 30 days to the learned date.
4. **Check off each review** as you complete it by replacing `[ ]` with `[x]`.
5. **Each Sunday**, scan the tables below to see which reviews are due in the coming week. Add them to your weekly plan.

**For each review session:**
- Skim the relevant topic section or cheatsheet
- Try to recall the key points from memory before looking at notes
- Solve 1 related problem (easy for Day 1, medium for Day 7+)
- If you cannot recall the material, mark it in the Notes column and schedule an extra review

---

## 3. Quick vs Deep Revision

Not every review needs the same depth. Use these two modes:

### Quick Revision (15 minutes)
**Use for:** Day 1 and Day 3 reviews, topics you feel confident about

- Read the cheatsheet section or your notes for the topic
- Without looking, try to recall: key data structures, time complexities, core patterns
- Mentally walk through 1 problem solution step by step
- If you can recall 80%+ without looking, you are on track

### Deep Revision (30-45 minutes)
**Use for:** Day 7, Day 14, and Day 30 reviews, or any topic where quick revision reveals gaps

- Re-read the full section in the relevant study document
- Solve 1-2 problems without looking at solutions
- If you get stuck, note exactly where you got stuck in the Notes column
- Compare your solution to the optimal one -- understand every difference
- If you failed the review, schedule an additional review in 3 days

---

## 4. DSA Data Structures Tracker

| Topic | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|-------|-------------|--------|--------|--------|---------|---------|-------|
| Arrays and Strings | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Hash Maps | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Linked Lists | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Stacks and Queues | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Trees (Binary / BST) | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Heaps | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Graphs | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Tries | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Union-Find | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 5. Algorithm Patterns Tracker

| Pattern | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|---------|-------------|--------|--------|--------|---------|---------|-------|
| Two Pointers | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Sliding Window | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Binary Search | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| BFS / DFS | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Dynamic Programming | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Backtracking | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Greedy | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Intervals | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Topological Sort | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Monotonic Stack | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Bit Manipulation | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Graph Algorithms | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 6. System Design Tracker

| Topic | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|-------|-------------|--------|--------|--------|---------|---------|-------|
| Load Balancing | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Caching | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Database Scaling | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Message Queues | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Consistent Hashing | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| CAP Theorem | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Microservices | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Event-Driven Architecture | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| CDN | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| API Gateway | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Rate Limiting | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Monitoring | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 7. Backend Concepts Tracker

| Topic | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|-------|-------------|--------|--------|--------|---------|---------|-------|
| PostgreSQL Internals | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| DynamoDB Design | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Indexing Strategies | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Transactions / ACID | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| REST API Design | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| GraphQL | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Authentication / OAuth | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Distributed Transactions | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Consensus | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Circuit Breaker | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Event Sourcing / CQRS | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| Idempotency | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 8. HLD Problems Tracker

| Problem | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|---------|-------------|--------|--------|--------|---------|---------|-------|
| HLD 1: URL Shortener | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 2: Rate Limiter | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 3: Notification System | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 4: Chat System | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 5: News Feed | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 6: Key-Value Store | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 7: Unique ID Generator | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 8: Web Crawler | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 9: Video Streaming (YouTube) | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 10: Google Drive / Dropbox | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 11: Search Autocomplete | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| HLD 12: Distributed Cache | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 9. LLD Problems Tracker

| Problem | Date Learned | Rev D1 | Rev D3 | Rev D7 | Rev D14 | Rev D30 | Notes |
|---------|-------------|--------|--------|--------|---------|---------|-------|
| LLD 1: Parking Lot System | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 2: Elevator System | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 3: Library Management | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 4: Tic-Tac-Toe | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 5: Snake and Ladder | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 6: Splitwise (Expense Sharing) | | [ ] | [ ] | [ ] | [ ] | [ ] | |
| LLD 7: Task Scheduler | | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

## 10. Weekly Revision Checklist Template

Copy this template at the start of each week and fill it in by scanning the tables above.

```
### Week of: [DATE]

**Day 3 Reviews Due:**
- [ ] [Topic name] -- learned on [date]
- [ ] [Topic name] -- learned on [date]

**Day 7 Reviews Due:**
- [ ] [Topic name] -- learned on [date]
- [ ] [Topic name] -- learned on [date]

**Day 14 Reviews Due:**
- [ ] [Topic name] -- learned on [date]

**Day 30 Reviews Due:**
- [ ] [Topic name] -- learned on [date]

**Review Notes:**
- Topics that felt solid:
- Topics that need extra review:
- Extra review sessions scheduled for:
```

---

## Revision Log

Use this section to keep a running log of your weekly reviews. Add an entry each Sunday.

### Template Entry

```
### [DATE] -- Week [N] Review

Reviews completed:
- [x] [Topic] (Day [N] review) -- felt solid / needs more work
- [x] [Topic] (Day [N] review) -- felt solid / needs more work

Gaps identified:
- [Describe any topic where recall was weak]

Action items:
- [What to do about the gaps]
```
