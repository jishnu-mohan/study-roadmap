# Master Interview Prep Roadmap

**Candidate:** Jishnu Mohan P R
**Target Role:** SDE2 Backend / Full-Stack
**Experience:** 7+ years (Treez Inc., Diagnal Technologies)
**Available Time:** 1-2 hours/day
**Timeline:** 12 weeks

---

## 1. Strengths and Gaps Analysis

| Area | Interview Expectation (SDE2) | Current Level | Gap | What to Focus On |
|------|------------------------------|---------------|-----|------------------|
| AWS / Cloud | Deep knowledge of services, trade-offs, cost optimization | Strong -- daily production use at Treez (Lambda, EventBridge, SQS, S3, CloudFront, etc.) | Minimal | Be ready to articulate trade-offs (e.g., SQS vs SNS vs EventBridge). Review IAM best practices and CloudFormation patterns. |
| Microservices | Design, decompose, communicate between services | Strong -- builds event-driven microservices at Treez | Minimal | Prepare to discuss service boundaries, failure handling, data consistency across services. |
| Event-Driven Architecture | Understand patterns, guarantees, ordering | Strong -- core of current work | Minimal | Be ready to compare event sourcing vs choreography vs orchestration. Discuss idempotency and exactly-once processing. |
| API Design (REST / GraphQL) | Design clean APIs, discuss trade-offs | Strong -- experience with both REST and GraphQL in production | Minimal | Practice designing APIs on a whiteboard. Know REST maturity model, GraphQL N+1 problem, pagination strategies. |
| CI/CD | Understand pipelines, deployment strategies | Strong -- GitHub Actions, Docker, Kubernetes | Minimal | Be ready to discuss blue-green, canary, rollback strategies. |
| System Design (Practical) | Design large-scale systems end-to-end | Strong (practical) -- builds real distributed systems | Small -- needs structured HLD practice | Practice structured HLD format: requirements, estimation, high-level design, deep dives. Time-box practice to 35-45 min. |
| Authentication / Authorization | OAuth, JWT, session management, RBAC | Strong -- works with Cognito, IAM | Minimal | Review OAuth 2.0 flows, JWT vs session trade-offs, RBAC vs ABAC. |
| Databases (PostgreSQL, DynamoDB) | Indexing, query optimization, schema design, internals | Moderate -- uses both in production but needs deeper internals knowledge | Medium | Study B-tree vs hash indexes, query planners, EXPLAIN ANALYZE. For DynamoDB: single-table design, GSI/LSI strategies, partition key design. |
| Distributed Systems Theory | CAP, consistency models, consensus | Moderate -- practical experience but theory gaps | Medium | Study CAP theorem deeply, eventual vs strong consistency, Raft/Paxos at a high level, distributed transactions (2PC, Saga). |
| LLD / OOP Design | Design classes, apply SOLID, design patterns | Moderate -- writes good code but less practice with formal LLD interviews | Medium | Practice 5-7 classic LLD problems (parking lot, elevator, etc.). Review SOLID principles and common design patterns. |
| DSA | Solve medium-hard problems in 30-45 min | Needs Work -- intermediate level, non-CS background | Large | Follow structured pattern-based approach. Master 12 core patterns. Build from easy to medium, target 150+ problems over 12 weeks. |
| Algorithm Complexity Analysis | Analyze time/space for any solution | Needs Work -- can do basics but not rigorous | Medium-Large | Practice Big-O analysis for every problem solved. Learn amortized analysis. Master space complexity for recursive solutions. |
| Competitive-Style Problem Solving | Think on feet, optimize under time pressure | Needs Work -- limited competitive coding experience | Large | Timed practice sessions. Learn to verbalize thought process. Practice "brute force first, then optimize" approach. |

---

## 2. How to Use This Guide

### Reading Order

1. **Start here** -- this roadmap gives you the full picture
2. **DSA track** (start immediately, continue throughout):
   - `dsa/01-data-structures.md` -- foundations
   - `dsa/02-algorithm-patterns.md` -- the 12 patterns that cover most interview problems
   - `dsa/03-practice-problems.md` -- curated problem sets organized by pattern
   - `dsa/04-revision-cheatsheet.md` -- quick reference for review days
3. **System Design track** (start Week 5):
   - `system-design/01-building-blocks.md` -- components you will use in every design
   - `system-design/02-hld-practice-problems.md` -- 12 classic HLD problems with frameworks
   - `system-design/03-low-level-design.md` -- LLD/OOP design problems
4. **Backend track** (start Week 3, interleave with other tracks):
   - `backend/01-databases-deep-dive.md` -- PostgreSQL and DynamoDB internals
   - `backend/02-apis-and-protocols.md` -- REST, GraphQL, gRPC, WebSockets
   - `backend/03-distributed-systems.md` -- theory and practical patterns
5. **Behavioral track** (start Week 9):
   - `behavioral/01-star-stories.md` -- your stories in STAR format
   - `behavioral/02-common-questions.md` -- question bank with frameworks
6. **Revision**:
   - `revision/spaced-repetition-tracker.md` -- track what you have learned and when to review

### Spaced Repetition System

Spaced repetition is the single most effective technique for retaining what you study. The idea is simple: review material at increasing intervals just before you would forget it.

**Intervals:** After learning a topic, review it on:
- **Day 1** -- next day (quick 15-min review)
- **Day 3** -- reinforce before it fades
- **Day 7** -- one week check
- **Day 14** -- two week consolidation
- **Day 30** -- long-term retention lock-in

After each study session, log the topic in `revision/spaced-repetition-tracker.md` and calculate your review dates.

### Daily Routine

With 1-2 hours available per day, split your time as follows:

- **60 minutes**: DSA problem solving (this is non-negotiable every day for the first 8 weeks)
- **30-60 minutes**: Topic study (system design, backend, behavioral -- rotated by schedule)

### Each Document is Self-Contained

Every document in this guide can be used independently. Each one contains:
- The concepts you need to know
- Practice material
- Key points to remember
- References for deeper study

You do not need to read them in strict order, but the sequence above is optimized for building knowledge incrementally.

---

## 3. 12-Week Study Plan

### Weeks 1-2: DSA Foundations

**Goal:** Build a solid base in data structures and start pattern recognition.

- Review all core data structures in `dsa/01-data-structures.md`
  - Arrays, strings, hash maps, linked lists, stacks, queues, trees, heaps, graphs, tries
  - For each: know the operations, time complexities, and when to use them
- Study the first 6 algorithm patterns in `dsa/02-algorithm-patterns.md`
  - Two Pointers, Sliding Window, Binary Search, BFS, DFS, Hash Map patterns
- Solve 2-3 easy problems daily from `dsa/03-practice-problems.md`
  - Focus on getting the pattern right, not speed
  - Always analyze time and space complexity after solving
- Begin tracking in `revision/spaced-repetition-tracker.md`
  - Log every data structure and pattern as you complete it
  - Start Day 1 reviews immediately

**End of Week 2 target:** 25-30 easy problems solved, all data structures reviewed, 6 patterns studied.

### Weeks 3-4: DSA Depth

**Goal:** Complete all patterns and ramp up problem difficulty.

- Complete remaining 6 algorithm patterns in `dsa/02-algorithm-patterns.md`
  - Dynamic Programming, Backtracking, Greedy, Intervals, Topological Sort, Monotonic Stack
- Ramp up to 2 medium problems daily
  - If stuck for more than 20 minutes, read the approach (not the code), then implement
  - After solving, always look at the most upvoted solution to learn cleaner approaches
- Start `backend/01-databases-deep-dive.md`
  - PostgreSQL internals: indexing, query planning, transactions
  - DynamoDB: single-table design, partition strategies
- First spaced repetition cycle kicks in
  - Day 7 reviews for Week 1 topics
  - Day 3 reviews for Week 3 topics
  - Dedicate Sunday to catching up on reviews

**End of Week 4 target:** All 12 patterns studied, 50+ problems solved (mix of easy and medium), database fundamentals solid.

### Weeks 5-6: System Design Foundations

**Goal:** Build system design vocabulary and start practicing structured designs.

- Study `system-design/01-building-blocks.md`
  - Load balancers, caches, CDNs, message queues, databases, blob storage
  - Understand when to use each and their trade-offs
- Work through first 4 HLD problems in `system-design/02-hld-practice-problems.md`
  - Practice the framework: requirements -> estimation -> high-level design -> deep dive
  - Time yourself: 35-45 minutes per problem
- Continue 1-2 DSA problems daily to maintain rhythm
  - Focus on medium problems in your weaker patterns
- Study `backend/02-apis-and-protocols.md`
  - REST design principles, GraphQL schema design, gRPC basics
  - WebSocket vs SSE vs long polling

**End of Week 6 target:** 4 HLD problems practiced, building blocks mastered, 70+ total DSA problems.

### Weeks 7-8: System Design + Backend Deep Dive

**Goal:** Complete HLD practice and strengthen distributed systems knowledge.

- Complete remaining HLD problems in `system-design/02-hld-practice-problems.md`
  - By now you should be able to structure a design without a template
- Study `backend/03-distributed-systems.md`
  - CAP theorem, consistency models, distributed transactions
  - Saga pattern, circuit breaker, event sourcing, CQRS
- Start `system-design/03-low-level-design.md`
  - Work through first 3-4 LLD problems
  - Focus on SOLID principles and clean class design
- Continue DSA maintenance: 1 medium problem daily

**End of Week 8 target:** All 12 HLD problems practiced, distributed systems theory solid, 90+ total DSA problems.

### Weeks 9-10: Integration + Behavioral

**Goal:** Start combining skills and prepare behavioral stories.

- Mix DSA + System Design in mock practice sessions
  - Simulate real interview conditions: timer, no IDE autocomplete, talk out loud
- Complete remaining LLD problems in `system-design/03-low-level-design.md`
- Study `behavioral/01-star-stories.md`
  - Write out 8-10 STAR stories from your experience at Treez and Diagnal
  - Cover: leadership, conflict, failure, ambiguity, technical challenge, impact
- Study `behavioral/02-common-questions.md`
  - Practice answering out loud (not just in your head)
  - Record yourself if possible -- listen for clarity and conciseness
- Continue 1 DSA problem daily

**End of Week 10 target:** STAR stories polished, LLD complete, 110+ total DSA problems, comfortable with mock format.

### Weeks 11-12: Revision + Polish

**Goal:** Lock in everything and build confidence.

- Full spaced repetition revision pass
  - Use `dsa/04-revision-cheatsheet.md` for quick DSA review
  - Go through every tracked topic in `revision/spaced-repetition-tracker.md`
- Conduct mock interviews (find a partner or use Pramp/Interviewing.io)
  - At least 2 full mock interviews per week
  - 1 DSA + 1 System Design + 1 Behavioral per mock session
- Revisit weak areas identified during mocks
  - Spend extra time on patterns where you get stuck
  - Re-solve problems you previously struggled with
- Review all Day 14 and Day 30 SR-tagged topics

**End of Week 12 target:** 130-150 total DSA problems, all topics reviewed, confident in mock interview performance.

---

## 4. Weekly Schedule Template

### Monday (90 min)
- **DSA Problem Solving (60 min):** 2 problems focused on the week's target pattern
- **Topic Study (30 min):** Read/study from the current week's topic document

### Tuesday (60-90 min)
- **System Design or Backend Study (60-90 min):** Deep study session on system design building blocks, HLD problem practice, or backend concepts

### Wednesday (90 min)
- **DSA Problem Solving (60 min):** 2 problems, try at least 1 medium
- **Topic Study (30 min):** Continue current topic or start a new section

### Thursday (60-90 min)
- **System Design or Backend Study (60-90 min):** Continue where Tuesday left off, or practice a new HLD/LLD problem

### Friday (90 min)
- **DSA Problem Solving (60 min):** 2 problems, review any problems from earlier in the week that you struggled with
- **Topic Study (30 min):** Wrap up the week's topic section

### Saturday (90-120 min)
- **Mock Practice or New HLD/LLD Problem (90-120 min):** Full practice session simulating interview conditions. Alternate between DSA mocks and system design mocks week by week.

### Sunday (60 min)
- **Spaced Repetition Review Day (45 min):** Go through all topics due for review this week (Day 1, 3, 7, 14, or 30 reviews)
- **Light Problems (15 min):** Solve 1 easy problem to keep the habit alive without burning out

---

## 5. Progress Tracking

### Week 1
- [ ] Reviewed arrays, strings, hash maps
- [ ] Reviewed linked lists, stacks, queues
- [ ] Studied Two Pointers pattern
- [ ] Studied Sliding Window pattern
- [ ] Studied Binary Search pattern
- [ ] Solved 12-15 easy problems
- [ ] Started spaced repetition tracker

### Week 2
- [ ] Reviewed trees, heaps, graphs, tries
- [ ] Studied BFS pattern
- [ ] Studied DFS pattern
- [ ] Studied Hash Map patterns
- [ ] Solved 12-15 easy problems (25-30 total)
- [ ] Completed Day 1 and Day 3 reviews for Week 1 topics

### Week 3
- [ ] Studied Dynamic Programming pattern
- [ ] Studied Backtracking pattern
- [ ] Studied Greedy pattern
- [ ] Started solving medium problems (2/day target)
- [ ] Started databases deep dive (PostgreSQL)
- [ ] Day 7 reviews for Week 1 topics

### Week 4
- [ ] Studied Intervals pattern
- [ ] Studied Topological Sort pattern
- [ ] Studied Monotonic Stack pattern
- [ ] 50+ total problems solved
- [ ] Completed databases deep dive (DynamoDB)
- [ ] Day 14 reviews for Week 1 topics

### Week 5
- [ ] Studied all system design building blocks
- [ ] Completed HLD problem 1
- [ ] Completed HLD problem 2
- [ ] Started APIs and protocols study
- [ ] Maintaining 1-2 DSA problems daily

### Week 6
- [ ] Completed HLD problem 3
- [ ] Completed HLD problem 4
- [ ] Completed APIs and protocols study
- [ ] 70+ total DSA problems
- [ ] Day 30 reviews for Week 1 topics

### Week 7
- [ ] Completed HLD problems 5-8
- [ ] Started distributed systems study
- [ ] Started first 2 LLD problems
- [ ] Maintaining DSA rhythm

### Week 8
- [ ] Completed HLD problems 9-12
- [ ] Completed distributed systems study
- [ ] Completed LLD problems 3-4
- [ ] 90+ total DSA problems

### Week 9
- [ ] First mock interview completed
- [ ] Completed LLD problems 5-7
- [ ] Wrote all STAR stories
- [ ] Started behavioral question practice

### Week 10
- [ ] Second mock interview completed
- [ ] Behavioral stories polished
- [ ] 110+ total DSA problems
- [ ] All LLD problems complete

### Week 11
- [ ] Full SR revision pass started
- [ ] 2 mock interviews this week
- [ ] Weak areas identified and being addressed
- [ ] Cheatsheet review complete

### Week 12
- [ ] Final SR revision pass complete
- [ ] 2 mock interviews this week
- [ ] 130-150 total DSA problems
- [ ] Confidence check: can solve most mediums in 30 min
- [ ] Confidence check: can structure an HLD in 40 min
- [ ] Confidence check: can tell 8+ STAR stories fluently

---

## 6. Resources

### DSA

- **LeetCode** (https://leetcode.com) -- primary problem source
- **NeetCode.io** (https://neetcode.io) -- NeetCode 150 roadmap is the best curated list for interview prep. Follow this as your primary problem set.
- **NeetCode YouTube** (https://youtube.com/@NeetCode) -- excellent video explanations for every pattern and problem

### System Design

- **"Designing Data-Intensive Applications"** by Martin Kleppmann -- the single best book for understanding distributed systems and data infrastructure. Read chapters relevant to your study week.
- **"System Design Interview"** by Alex Xu (Volume 1 and Volume 2) -- step-by-step walkthroughs of classic HLD problems. Great for learning the structured approach.
- **Grokking the System Design Interview** (educative.io) -- interactive course with good diagrams and frameworks
- **Tech Dummies Narendra L** (YouTube) -- detailed system design walkthroughs
- **Gaurav Sen** (YouTube) -- concise system design concept explanations

### Mock Interviews

- **Pramp** (https://pramp.com) -- free peer-to-peer mock interviews
- **Interviewing.io** (https://interviewing.io) -- anonymous mock interviews with engineers from top companies

### General

- **Blind 75 / NeetCode 150** -- the canonical problem lists. NeetCode 150 is the expanded and improved version.
- **GitHub Actions docs** -- for CI/CD review if needed
- **AWS Well-Architected Framework** -- review for cloud architecture discussions
