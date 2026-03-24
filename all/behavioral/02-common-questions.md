# Common Behavioral Questions -- Scripted Answers and Frameworks

---

## The Elevator Pitch

**Question**: "Tell me about yourself."

**Structure**: Present -> Past -> Future. Keep it under 2 minutes. Deliver it like a conversation, not a rehearsed speech.

> I am a Senior Backend Engineer with over seven years of experience, currently working as an SDE2 at Treez Inc., where I have been for the past four years. My focus is on distributed systems, event-driven architecture on AWS, and more recently, integrating AI capabilities into production backend systems.
>
> At Treez, I architected our Retail AI Platform -- an event-driven microservices system that orchestrates multiple AI agents for automating invoice processing and catalog onboarding. I also built our Product Collection Service, which processes over 5,000 events per day with 99.9% reliability using EventBridge and SQS with idempotent consumers and DLQ-based fault tolerance. One project I am particularly proud of is an Event Registry I built during a hackathon that evolved into a shared platform used by 10+ services for standardized event contracts.
>
> Before Treez, I was at Diagnal Technologies where I built serverless backends for three OTT streaming applications handling millions of requests per month. That is where I cut my teeth on AWS serverless patterns and also took on mentoring responsibilities, establishing backend practices for the team.
>
> What excites me about the next step in my career is the opportunity to work on harder distributed systems problems at greater scale, take on more technical leadership, and continue building systems where reliability and architecture quality directly impact the business.

**Customization notes**:
- Adjust the "what excites me" section based on the company you are interviewing with
- If the role emphasizes AI/ML, lean into the AI platform work
- If the role emphasizes scale, lead with the event processing numbers
- If the role emphasizes leadership, emphasize the mentoring and cross-team work

---

## Career Questions

### 1. "Why are you looking for a change?"

**Framework**: Growth trajectory + new challenges + scale. Never negative about current employer.

> I have had a great experience at Treez -- I have grown from building individual services to owning platform architecture, and I have had the opportunity to work on interesting problems like AI integration and event-driven systems. At this point in my career, I am looking for an opportunity to work at a larger scale and tackle more complex distributed systems challenges. I want to be in an environment where I can continue growing toward senior/staff-level impact, and I believe [Company] offers that kind of technical depth and scale.

**Key rules**:
- Never badmouth your current employer or team
- Frame it as "moving toward" something, not "running from" something
- Connect your growth trajectory to what the target company offers

### 2. "Why this company?"

**Template** (fill in before each interview):

> I have been following [Company]'s work on [specific product/technology -- research this beforehand]. What draws me is [specific technical challenge they face that connects to your experience]. Given my background in [event-driven architecture / distributed systems / AI integration], I see a strong alignment between the problems you are solving and the kind of work I find most engaging. I also appreciate [something specific about their engineering culture -- blog posts, open source, tech talks, etc.].

**Preparation checklist**:
- [ ] Read their engineering blog
- [ ] Understand their core product and technical challenges
- [ ] Find a connection between their problems and your experience
- [ ] Identify something genuine you admire about their approach

### 3. "Where do you see yourself in 5 years?"

> In five years, I see myself operating at the Senior or Staff Engineer level, driving architecture decisions for critical systems and having a broader impact beyond just the code I write. I want to be the person teams come to when they are making foundational technical decisions -- choosing between architectural approaches, designing for scale, or navigating complex trade-offs. I also want to continue mentoring engineers, the way I did at Diagnal and Treez. Whether that takes the shape of a Staff IC role or a Tech Lead role depends on the organization, but the common thread is deeper technical influence and helping teams build better systems.

### 4. "What is your biggest strength?"

> My strongest asset is my ability to take ambiguous, complex problems and turn them into well-structured production systems. I think in terms of distributed systems -- event flows, failure modes, consistency boundaries -- which helps me design systems that work reliably at scale. I also have a strong ownership mindset across the full software development lifecycle. At Treez, I did not just build the Retail AI Platform -- I designed the architecture, implemented the core services, defined the event contracts, set up the observability, and drove adoption across teams. I think that end-to-end ownership, combined with distributed systems intuition, is what I bring that is most valuable.

### 5. "What is your biggest weakness?"

> I come from a non-CS background -- my degrees are in Robotics and Mechatronics Engineering. While that has actually been an advantage in many ways because it gave me a different problem-solving perspective, it means that when I encounter complex algorithmic problems -- particularly in areas like graph theory or advanced data structures -- I sometimes need to spend extra time building intuition that CS graduates might have from coursework. I have mitigated this through structured practice and building strong pattern recognition over the years. I also know when to look things up versus when to work through something from first principles, which is a practical skill in itself.

**Why this works**:
- It is genuine and verifiable (non-CS background is on the resume)
- It is not disqualifying -- most backend engineering work does not require competitive programming skills
- The mitigation is specific and shows self-awareness
- It implicitly highlights a strength (diverse perspective, self-driven learning)

---

## Collaboration Questions

### 6. "Describe a conflict with a teammate"

**Framework**: Acknowledge the disagreement -> Understand their perspective -> Find common ground -> Reach resolution

> When I was rolling out the Event Registry at Treez, not everyone was on board with the approach. One senior engineer on another team felt that enforcing schema validation would slow down their iteration speed -- they preferred a more flexible, schema-less approach where consumers would handle whatever they received. Instead of pushing my approach, I set up a meeting to understand their specific concerns. It turned out their team was in a rapid prototyping phase and they were worried about the overhead of registering schemas for events that might change frequently. I proposed a compromise: we added a "draft" event status in the registry that had relaxed validation rules, with the expectation that events would be promoted to "stable" before going to production. This addressed their concern about iteration speed while maintaining the long-term goal of schema standardization. They became one of the most active users of the registry.

**Key principles**:
- Never frame it as "I was right and they were wrong"
- Show genuine curiosity about the other person's perspective
- The resolution should be a better outcome than either original position

### 7. "Tell me about a time you disagreed with your manager"

**Framework**: Present data -> Propose alternative -> Respect the final decision

> When making a technical decision, I focus on presenting my reasoning with data rather than just opinions. If I disagree with the direction, I will prepare a short comparison of approaches -- what are the trade-offs, what are the risks, what does each option optimize for. I present this clearly and advocate for my position. But once a decision is made, I commit fully. I have found that managers appreciate engineers who push back thoughtfully because it means they can trust that when you agree, you genuinely agree. The key is disagreeing about the approach, not undermining the decision.

**If pressed for a specific example**: Connect to a technical decision where you proposed an alternative architecture or technology choice, presented the trade-offs, and either changed the outcome or committed to the chosen direction.

### 8. "How do you handle code review feedback you disagree with?"

**Framework**: Understand intent -> Discuss trade-offs -> Defer to conventions

> First, I try to understand the intent behind the feedback rather than reacting to the specific suggestion. Often, the reviewer is pointing at a real concern even if their proposed fix is different from what I would choose. If I genuinely disagree, I will leave a reply explaining my reasoning -- "I considered that approach, but chose X because of Y trade-off." This usually starts a productive discussion. If it comes down to a stylistic or preference difference, I defer to the team's established conventions. Code review is about the team's code quality, not about being right. I also apply this when I am the reviewer -- I distinguish between "this is a bug" (blocking), "this could be improved" (suggestion), and "I would have done it differently" (not worth commenting on).

### 9. "How do you prioritize when everything is urgent?"

**Framework**: Impact vs effort -> Communicate -> Negotiate

> When everything feels urgent, I step back and evaluate on two axes: impact and reversibility. High-impact, hard-to-reverse decisions get attention first. Then I look at dependencies -- is something blocking other people? That gets prioritized even if the individual task is small. Once I have a rough ordering, I communicate it explicitly to stakeholders: "Here is what I plan to tackle first and why. If you disagree with this ordering, let us discuss." I find that making the prioritization visible forces the conversation about what is actually urgent versus what feels urgent. In practice, this usually reveals that only one or two things are truly time-sensitive, and the rest can be sequenced over the next few days.

---

## Technical Decision Questions

### 10. "Tell me about a controversial technical decision"

**Framework**: Context -> Options -> Decision rationale -> Outcome

> When designing the Retail AI Platform at Treez, I chose an event-driven, asynchronous architecture over a synchronous microservices approach. This was controversial because the team was more familiar with synchronous REST-based communication, and event-driven systems have a steeper debugging and operational learning curve. The options were: (1) synchronous orchestration with REST calls between services, which would be simpler to build and debug but would create tight coupling and cascade failures; or (2) asynchronous event-driven orchestration, which would be more complex initially but would give us decoupling, independent scalability, and better fault isolation. I advocated for the event-driven approach because the AI agent operations were inherently long-running and unpredictable in latency -- synchronous calls would have meant long timeouts and brittle retry logic. I mitigated the complexity concern by investing in observability (structured event logging, distributed tracing) and by building the Event Registry to make event contracts discoverable. The outcome validated the decision: we could iterate on individual agents independently, failures were isolated, and the system handled unpredictable AI latencies without cascading issues.

### 11. "How do you handle speed vs quality trade-offs?"

**Framework**: Context-dependent, but always with a quality baseline

> It depends on what we are building and where we are in the product lifecycle. For a prototype or proof-of-concept, I will move fast and accept technical shortcuts -- but I am explicit about what the shortcuts are and document them as tech debt. For production systems, especially ones handling money or customer data, I have a quality baseline that is non-negotiable: error handling, logging, basic tests for critical paths, and deployment safety (feature flags or staged rollouts). Within those boundaries, I can move faster or slower depending on the urgency. The key is being intentional about the trade-off rather than accidentally shipping low-quality code because you were in a hurry. I have found that investing in a good project scaffold and reusable patterns actually eliminates most of the speed-quality tension -- the "fast" path and the "quality" path converge when you have good foundations.

### 12. "Build vs buy?"

**Framework**: Maintenance burden -> Team expertise -> Differentiation value -> Timeline

> I evaluate build-vs-buy on four dimensions. First, maintenance burden -- building means you own it forever, including bugs, upgrades, and on-call. Second, team expertise -- do we have the skills to build and maintain this well, or would we be reinventing something poorly? Third, differentiation -- is this core to our competitive advantage, or is it commodity infrastructure? Fourth, timeline -- do we need this yesterday, or can we invest in a custom solution? For example, at Treez, I chose AWS Cognito for authentication rather than building a custom auth system. Auth is commodity infrastructure, Cognito had the enterprise features we needed (SSO, SAML), and building our own would have been a significant maintenance burden for a small team. But for the Event Registry, I built it custom because no off-the-shelf solution fit our specific event-driven architecture and team workflows -- it was a differentiator for our engineering velocity.

---

## Questions to Ask the Interviewer

### About the Role
- What does a typical week look like for someone in this position?
- What is the biggest technical challenge the team is currently facing?
- How is success measured for this role in the first 6 months?
- What does the on-call rotation look like, and how is operational burden distributed?

### About Engineering Culture
- How does the code review process work? What is the typical turnaround time?
- What is the deployment frequency? Do you practice continuous deployment?
- How are architectural decisions made? Is there an RFC or design doc process?
- What does the testing strategy look like -- unit, integration, end-to-end?

### About Growth
- What does the career progression from SDE2 to Senior look like here?
- Are there opportunities for technical leadership -- like owning architecture for a domain?
- How does the company support engineers who want to grow into Staff-level roles?
- Is there a culture of internal mobility if I want to explore different problem domains?

### About the Product
- What is the biggest technical scaling challenge on the roadmap?
- What are the team's top priorities for the next quarter?
- How does engineering input shape the product roadmap?
- What is the ratio of new feature development to maintenance and tech debt work?

### Red Flag Detectors
These are questions that reveal potential problems. Ask them casually, not aggressively.

- How long has the team been in its current form? (High turnover signal if the answer is "we recently rebuilt the team")
- What happened to the previous person in this role? (Promotion is great, burnout or departure is a yellow flag)
- How often do priorities shift? (Constant priority changes signal organizational dysfunction)
- What is the biggest thing the team would change about how it operates? (Self-awareness signal -- if they say "nothing," that is a red flag)

---

## Interview Tips -- Quick Reference

**Structure**: Use STAR format for every behavioral answer. Situation, Task, Action, Result. Do not ramble.

**Be specific**: Use numbers whenever possible.
- "5,000+ events per day" not "a lot of events"
- "99.9% reliability" not "very reliable"
- "10+ services" not "many services"
- "millions of requests per month" not "high traffic"

**"I" vs "We"**: Use "I" for your specific contributions and decisions. Use "we" for team context and outcomes. Interviewers are evaluating YOU, not your team.

**Time management**: Keep answers to 2-3 minutes. If you are going over 3 minutes, you are rambling. Practice with a timer.

**The thinking pause**: "That is a great question -- let me think about the best example for that." This is completely acceptable and shows thoughtfulness. Silence is better than filler.

**Energy and enthusiasm**: Show genuine interest in the problem you are describing. If you sound bored by your own accomplishments, the interviewer will be too. This does not mean being artificially excited -- it means engaging with the substance of what you built and why it mattered.

**Follow-up readiness**: For every story, have a second, shorter example ready. Interviewers sometimes ask "Can you give me another example?" and having one ready signals depth of experience.

**Handling "I do not know"**: If you genuinely do not have an experience that matches the question, say so honestly: "I have not faced that exact situation, but the closest experience I have is..." This is far better than fabricating a story.

**Closing strong**: When the interviewer asks "Do you have any questions for me?", always have at least 3 prepared. Asking no questions signals disinterest. Ask questions that show you have thought about the role, not generic questions you could ask at any company.
