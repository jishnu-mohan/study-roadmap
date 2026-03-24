# Design Patterns Quick Reference

## Summary: Design Patterns Quick Reference

| Problem | Primary Pattern | Supporting Patterns |
|---------|----------------|-------------------|
| Parking Lot | Strategy (pricing) | Factory (vehicles), Singleton (lot) |
| LRU Cache | Composite (DLL + HashMap) | -- |
| Rate Limiter | Strategy (algorithm) | Factory (creation) |
| Task Scheduler | Observer (events) | Strategy (retry), Priority Queue |
| Pub-Sub System | Observer (core mechanic) | Iterator (pull consumption) |
| Order State Machine | State (lifecycle) | Observer (transition events) |
| Payment Processing | Strategy (processors) | Factory (processor creation) |
