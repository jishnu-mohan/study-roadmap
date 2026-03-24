# Blob/Object Storage

## 13. Blob/Object Storage **[SR]**

### What It Is
Storage optimized for large unstructured objects (files, images, videos, backups) with HTTP-based access. Not a filesystem -- flat namespace with key-value semantics.

### How It Works

```
Upload Flow (Pre-signed URL):

  Client                    Backend              S3
    |                          |                  |
    |-- "I want to upload" --> |                  |
    |                          |-- generate       |
    |                          |   pre-signed URL |
    |<-- pre-signed URL -------|                  |
    |                                             |
    |------------- PUT file directly ------------>|
    |                                             |
    (no file goes through your backend -- saves bandwidth and cost)
```

### Key Concepts
- **Pre-signed URLs**: time-limited URLs that grant temporary access to upload or download. Your backend generates them, client uses them directly. This keeps files off your servers.
- **Multipart Upload**: for files > 100MB, split into parts, upload in parallel, server assembles. Supports resume on failure.
- **Lifecycle Policies**: automatically transition objects between storage classes (S3 Standard -> S3 IA -> Glacier) or delete after N days.
- **Versioning**: keep all versions of an object. Protects against accidental deletes.

### Key Trade-offs

| Gain | Lose |
|------|------|
| Virtually unlimited storage, high durability (11 9s) | Not suitable for frequent small updates |
| Cheap at scale | Higher latency than local disk |
| Pre-signed URLs offload bandwidth | Pre-signed URLs must be managed (expiry, security) |

### When to Use (Interview Triggers)
- "Users upload images/files" -- S3 + pre-signed URLs
- "Store large datasets" -- object storage
- "How to serve files to users globally?" -- S3 + CloudFront

### Real-World Mapping
- **S3**: your object store. You use pre-signed URLs for upload/download.
- **S3 + CloudFront**: serve files globally via CDN
- **S3 Event Notifications**: trigger Lambda on upload (e.g., image processing pipeline)
- **S3 Transfer Acceleration**: faster uploads via CloudFront edge locations
