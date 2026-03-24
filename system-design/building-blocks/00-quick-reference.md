# Quick Reference Table

## Quick Reference Table

| Building Block | When to Mention in Interview | Key AWS Service |
|---------------|---------------------------|----------------|
| Scalability | "Handle millions of users", traffic spikes | Auto Scaling, Lambda |
| Load Balancing | Always (draw it in every diagram) | ALB, NLB |
| Caching | Read-heavy workloads, reduce DB load | ElastiCache (Redis) |
| CDN | Static assets, global users, streaming | CloudFront |
| Database Selection | Data model discussion, justify your DB choice | RDS (PostgreSQL), DynamoDB |
| Database Scaling | DB bottleneck, high read/write volume | RDS Read Replicas, DynamoDB |
| Message Queues | Async processing, decoupling, fault tolerance | SQS, SNS, EventBridge |
| API Gateway + Rate Limiting | API entry point, abuse protection | API Gateway |
| Consistent Hashing | Distributed cache, data partitioning | DynamoDB (internal) |
| CAP Theorem / PACELC | Consistency vs availability discussion | DynamoDB (tunable) |
| Microservices vs Monolith | Architecture decision, team structure | Lambda, ECS, EKS |
| Event-Driven Architecture | Workflows, decoupled services, audit trails | EventBridge, SQS, Step Functions |
| Blob/Object Storage | File uploads, images, videos, backups | S3 |
| Search | Full-text search, autocomplete, product search | OpenSearch |
| Monitoring + Observability | "How to monitor?", debugging, alerting | CloudWatch, X-Ray |
