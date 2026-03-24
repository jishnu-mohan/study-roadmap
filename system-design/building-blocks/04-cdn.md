# CDN (Content Delivery Network)

## 4. CDN (Content Delivery Network) **[SR]**

### What It Is
A geographically distributed network of edge servers that cache and serve content close to users, reducing latency and offloading origin servers.

### How It Works

```
User (Mumbai)                    User (New York)
     |                                |
     v                                v
+----------+                    +----------+
|Edge Node |                    |Edge Node |
| Mumbai   |                    | New York |
+----------+                    +----------+
     |  (cache miss)                  |  (cache hit -> serve directly)
     v
+----------+
|  Origin  |
|  Server  |
+----------+
```

### Push vs Pull CDN

| Type | How | When |
|------|-----|------|
| **Pull** | Edge fetches from origin on first request, caches with TTL | Most common. Good for dynamic or large catalogs. |
| **Push** | You upload content to CDN proactively | Small, predictable content sets (e.g., static site assets) |

### Key Trade-offs

| Gain | Lose |
|------|------|
| Lower latency for global users | Cache invalidation complexity, cost per GB transferred |
| Reduced origin load | Stale content risk, debugging is harder (which edge served it?) |

### When to Use (Interview Triggers)
- "Users are globally distributed"
- "Serve static assets (images, JS, CSS)"
- "Video streaming" -- CDN is essential

### Real-World Mapping
- **CloudFront**: AWS CDN. You can put it in front of S3 (static assets), API Gateway (API caching), or ALB
- CloudFront + S3: your standard pattern for serving user-uploaded images with pre-signed URLs
- **Lambda@Edge / CloudFront Functions**: run code at the edge for request/response manipulation
