# Study Guide -- Learning Order and Spaced Repetition

**Target:** Backend SDE2 | **Time:** 1-2 hrs/day | **Duration:** 12 weeks

---

## How to Use This Guide

Each topic below has a checkbox. Check it off when you've completed the initial study. Then use the spaced repetition schedule to review at the right intervals.

**Daily split:**
- 60 min: DSA problem solving (non-negotiable for first 8 weeks)
- 30-60 min: Topic study (system design, backend, behavioral -- rotated)

**Spaced repetition intervals:** After learning a topic, review on Day 1, Day 3, Day 7, Day 14, Day 30. Log dates in `revision/spaced-repetition-tracker.md`.

---

## Phase 1: DSA Foundations (Weeks 1-2)

Start here. Build your data structure knowledge, then begin pattern recognition.

### Week 1: Core Data Structures (Part 1)

| Order | Topic | File | Time |
|-------|-------|------|------|
| 1 | Arrays and Strings | `dsa/data-structures/01-arrays-and-strings.md` | 45 min |
| 2 | Hash Maps and Sets | `dsa/data-structures/02-hash-maps-and-sets.md` | 45 min |
| 3 | Linked Lists | `dsa/data-structures/03-linked-lists.md` | 30 min |
| 4 | Stacks and Queues | `dsa/data-structures/04-stacks-and-queues.md` | 30 min |
| 5 | Two Pointers pattern | `dsa/patterns/01-two-pointers.md` | 45 min |
| 6 | Sliding Window pattern | `dsa/patterns/02-sliding-window.md` | 45 min |
| 7 | Binary Search pattern | `dsa/patterns/03-binary-search.md` | 45 min |

- [ ] Solve 2-3 easy problems daily from `dsa/practice-problems.md` (Arrays, Two Pointers, Sliding Window sections)
- [ ] Start logging in `revision/spaced-repetition-tracker.md`

### Week 2: Core Data Structures (Part 2) + More Patterns

| Order | Topic | File | Time |
|-------|-------|------|------|
| 8 | Trees | `dsa/data-structures/05-trees.md` | 45 min |
| 9 | Heaps / Priority Queues | `dsa/data-structures/06-heaps.md` | 30 min |
| 10 | Graphs | `dsa/data-structures/07-graphs.md` | 45 min |
| 11 | Tries | `dsa/data-structures/08-tries.md` | 20 min |
| 12 | Union-Find | `dsa/data-structures/09-union-find.md` | 20 min |
| 13 | BFS / DFS pattern | `dsa/patterns/04-bfs-dfs.md` | 45 min |

- [ ] Continue 2-3 easy problems daily (Binary Search, Stack, Linked List sections)
- [ ] Day 1 and Day 3 reviews for Week 1 topics

**Week 2 target:** 25-30 easy problems solved, all 9 data structures reviewed, 4 patterns studied.

---

## Phase 2: DSA Depth + Database Foundations (Weeks 3-4)

### Week 3: Advanced Patterns + PostgreSQL

| Order | Topic | File | Time |
|-------|-------|------|------|
| 14 | Dynamic Programming | `dsa/patterns/05-dynamic-programming.md` | 60 min |
| 15 | Backtracking | `dsa/patterns/06-backtracking.md` | 45 min |
| 16 | Greedy | `dsa/patterns/07-greedy.md` | 30 min |
| 17 | PostgreSQL Deep Dive | `backend/databases/01-postgresql.md` | 60 min |
| 18 | Indexing Strategies | `backend/databases/04-indexing-strategies.md` | 30 min |

- [ ] Ramp to 2 medium problems daily
- [ ] Day 7 reviews for Week 1 topics

### Week 4: Remaining Patterns + DynamoDB

| Order | Topic | File | Time |
|-------|-------|------|------|
| 19 | Intervals | `dsa/patterns/08-intervals.md` | 30 min |
| 20 | Topological Sort | `dsa/patterns/09-topological-sort.md` | 30 min |
| 21 | Monotonic Stack | `dsa/patterns/10-monotonic-stack.md` | 30 min |
| 22 | Bit Manipulation | `dsa/patterns/11-bit-manipulation.md` | 20 min |
| 23 | Graph Algorithms | `dsa/patterns/12-graph-algorithms.md` | 45 min |
| 24 | DynamoDB Deep Dive | `backend/databases/02-dynamodb.md` | 45 min |
| 25 | SQL vs NoSQL | `backend/databases/03-sql-vs-nosql.md` | 20 min |

- [ ] Review the Pattern Decision Tree: `dsa/patterns/00-pattern-decision-tree.md`
- [ ] Day 14 reviews for Week 1 topics

**Week 4 target:** All 12 patterns studied, 50+ problems solved, database fundamentals solid.

---

## Phase 3: System Design Foundations (Weeks 5-6)

### Week 5: Building Blocks (Part 1) + First HLD Problems

| Order | Topic | File | Time |
|-------|-------|------|------|
| 26 | Scalability | `system-design/building-blocks/01-scalability.md` | 15 min |
| 27 | Load Balancing | `system-design/building-blocks/02-load-balancing.md` | 20 min |
| 28 | Caching | `system-design/building-blocks/03-caching.md` | 25 min |
| 29 | CDN | `system-design/building-blocks/04-cdn.md` | 15 min |
| 30 | Database Selection | `system-design/building-blocks/05-database-selection.md` | 15 min |
| 31 | Database Scaling | `system-design/building-blocks/06-database-scaling.md` | 20 min |
| 32 | Message Queues | `system-design/building-blocks/07-message-queues.md` | 20 min |
| 33 | API Gateway & Rate Limiting | `system-design/building-blocks/08-api-gateway-rate-limiting.md` | 15 min |
| 34 | HLD: URL Shortener | `system-design/hld-problems/01-url-shortener.md` | 45 min |
| 35 | HLD: Rate Limiter | `system-design/hld-problems/02-rate-limiter.md` | 45 min |

- [ ] REST API Design | `backend/apis/01-rest-api-design.md` | 45 min
- [ ] Continue 1-2 DSA problems daily

### Week 6: Building Blocks (Part 2) + More HLD

| Order | Topic | File | Time |
|-------|-------|------|------|
| 36 | Consistent Hashing | `system-design/building-blocks/09-consistent-hashing.md` | 20 min |
| 37 | CAP Theorem | `system-design/building-blocks/10-cap-theorem.md` | 20 min |
| 38 | Microservices vs Monolith | `system-design/building-blocks/11-microservices-vs-monolith.md` | 20 min |
| 39 | Event-Driven Architecture | `system-design/building-blocks/12-event-driven-architecture.md` | 20 min |
| 40 | Blob Storage | `system-design/building-blocks/13-blob-storage.md` | 10 min |
| 41 | Search | `system-design/building-blocks/14-search.md` | 15 min |
| 42 | Monitoring & Observability | `system-design/building-blocks/15-monitoring-observability.md` | 15 min |
| 43 | HLD: Chat/Messaging | `system-design/hld-problems/03-chat-messaging.md` | 45 min |
| 44 | HLD: News Feed | `system-design/hld-problems/04-news-feed.md` | 45 min |

- [ ] GraphQL | `backend/apis/02-graphql.md` | 30 min
- [ ] gRPC | `backend/apis/03-grpc.md` | 20 min
- [ ] Day 30 reviews for Week 1 topics

**Week 6 target:** All building blocks mastered, 4 HLD problems practiced, 70+ DSA problems.

---

## Phase 4: System Design + Backend Deep Dive (Weeks 7-8)

### Week 7: HLD Problems + Distributed Systems

| Order | Topic | File | Time |
|-------|-------|------|------|
| 45 | HLD: Notification System | `system-design/hld-problems/05-notification-system.md` | 45 min |
| 46 | HLD: Distributed Cache | `system-design/hld-problems/06-distributed-cache.md` | 45 min |
| 47 | HLD: Task Queue | `system-design/hld-problems/07-task-queue.md` | 45 min |
| 48 | HLD: Product Catalog | `system-design/hld-problems/08-product-catalog.md` | 45 min |
| 49 | Consistency Models | `backend/distributed-systems/01-consistency-models.md` | 30 min |
| 50 | Distributed Transactions | `backend/distributed-systems/02-distributed-transactions.md` | 30 min |
| 51 | Consensus | `backend/distributed-systems/03-consensus.md` | 20 min |

- [ ] WebSockets & SSE | `backend/apis/04-websockets-sse.md` | 20 min
- [ ] Authentication | `backend/apis/05-authentication.md` | 30 min

### Week 8: Remaining HLD + More Distributed Systems + LLD Start

| Order | Topic | File | Time |
|-------|-------|------|------|
| 52 | HLD: Analytics Dashboard | `system-design/hld-problems/09-analytics-dashboard.md` | 45 min |
| 53 | HLD: File Upload | `system-design/hld-problems/10-file-upload.md` | 45 min |
| 54 | HLD: Search Autocomplete | `system-design/hld-problems/11-search-autocomplete.md` | 45 min |
| 55 | HLD: Event-Driven Pipeline | `system-design/hld-problems/12-event-driven-order-pipeline.md` | 45 min |
| 56 | Idempotency | `backend/distributed-systems/04-idempotency.md` | 20 min |
| 57 | Resilience Patterns | `backend/distributed-systems/05-resilience-patterns.md` | 30 min |
| 58 | Distributed Locking | `backend/distributed-systems/06-distributed-locking.md` | 20 min |
| 59 | LLD: Parking Lot | `system-design/lld-problems/01-parking-lot.md` | 45 min |
| 60 | LLD: LRU Cache | `system-design/lld-problems/02-lru-cache.md` | 45 min |

- [ ] Rate Limiting (API) | `backend/apis/06-rate-limiting.md` | 20 min

**Week 8 target:** All 12 HLD problems done, distributed systems solid, 90+ DSA problems.

---

## Phase 5: Integration + Behavioral (Weeks 9-10)

### Week 9: LLD + Event Sourcing + Behavioral Stories

| Order | Topic | File | Time |
|-------|-------|------|------|
| 61 | LLD: Rate Limiter | `system-design/lld-problems/03-rate-limiter.md` | 45 min |
| 62 | LLD: Task Scheduler | `system-design/lld-problems/04-task-scheduler.md` | 45 min |
| 63 | LLD: Pub-Sub | `system-design/lld-problems/05-pub-sub.md` | 45 min |
| 64 | LLD: Order State Machine | `system-design/lld-problems/06-order-state-machine.md` | 45 min |
| 65 | Event Sourcing & CQRS | `backend/distributed-systems/07-event-sourcing-cqrs.md` | 30 min |
| 66 | Observability | `backend/distributed-systems/08-observability.md` | 20 min |
| 67 | Common Failure Modes | `backend/distributed-systems/09-failure-modes.md` | 20 min |
| 68 | STAR Stories | `behavioral/star-stories.md` | 60 min |

- [ ] Sharding & Replication | `backend/databases/05-sharding-replication.md` | 20 min
- [ ] DB Interview Questions | `backend/databases/06-interview-questions.md` | 30 min

### Week 10: Behavioral + Mock Practice

| Order | Topic | File | Time |
|-------|-------|------|------|
| 69 | Common Questions | `behavioral/common-questions.md` | 45 min |
| 70 | Complexity Reference | `dsa/data-structures/00-complexity-reference.md` | 15 min |
| 71 | Building Blocks Quick Ref | `system-design/building-blocks/00-quick-reference.md` | 15 min |

- [ ] Practice STAR stories out loud (record yourself)
- [ ] First mock interview (DSA + System Design)
- [ ] Fill in Story #9 (Failure/Learning) in star-stories.md
- [ ] 110+ total DSA problems

---

## Phase 6: Revision + Polish (Weeks 11-12)

### Week 11: Full Revision Pass

- [ ] Review `dsa/revision-cheatsheet.md` -- all code templates and Big-O tables
- [ ] Go through every tracked topic in `revision/spaced-repetition-tracker.md`
- [ ] 2 mock interviews this week (1 DSA, 1 System Design)
- [ ] Re-solve any DSA problems you previously struggled with
- [ ] Review weak patterns using individual pattern files

### Week 12: Final Polish

- [ ] Final SR revision pass -- all Day 14 and Day 30 reviews complete
- [ ] 2 mock interviews this week (include behavioral round)
- [ ] Confidence checks:
  - [ ] Can solve most mediums in 30 min
  - [ ] Can structure an HLD in 40 min
  - [ ] Can tell 8+ STAR stories fluently
  - [ ] Can explain any building block with trade-offs
- [ ] 130-150 total DSA problems

---

## Spaced Repetition Quick Reference

| When you learn something | Review on |
|--------------------------|-----------|
| Day 0 (today) | Day 1, Day 3, Day 7, Day 14, Day 30 |

**Review types:**
- **Quick review (15 min):** Skim the file, recall key points from memory first, then verify. Solve 1 related easy problem mentally.
- **Deep review (30-45 min):** Re-read fully, solve 1-2 problems without looking at solutions, note any gaps.

**When to use which:**
- Day 1, Day 3 reviews: Quick review
- Day 7 review: Deep review (this is the critical retention point)
- Day 14, Day 30 reviews: Quick review (if confident) or Deep review (if shaky)

Track everything in `revision/spaced-repetition-tracker.md`.

---

## Weekly Schedule Template

| Day | Focus | Time |
|-----|-------|------|
| Mon | DSA problems (2) + Topic study | 90 min |
| Tue | System Design or Backend deep study | 60-90 min |
| Wed | DSA problems (2) + Topic study | 90 min |
| Thu | System Design or Backend deep study | 60-90 min |
| Fri | DSA problems (2) + Wrap up week's topic | 90 min |
| Sat | Mock practice OR new HLD/LLD problem | 90-120 min |
| Sun | Spaced repetition reviews + 1 easy problem | 60 min |

---

## Resources

**DSA:** LeetCode, NeetCode.io (NeetCode 150), NeetCode YouTube
**System Design:** "Designing Data-Intensive Applications" (Kleppmann), "System Design Interview" (Alex Xu Vol 1 & 2), Gaurav Sen YouTube
**Mock Interviews:** Pramp (free), Interviewing.io
