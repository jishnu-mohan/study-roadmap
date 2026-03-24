# File/Image Upload Service

## Problem 10: File/Image Upload Service **[SR]**

### Problem Statement
Design a service that handles file and image uploads, processes them (resize, transcode), and serves them globally via CDN. Maps directly to your S3 experience.

### Step 1: Requirements

**Functional Requirements**
- Upload files (images, documents, videos) up to 5GB
- Image processing: resize, crop, generate thumbnails, format conversion
- Serve files via CDN with low latency globally
- Access control (private files, time-limited access)
- Metadata storage and search

**Non-Functional Requirements**
- Upload reliability (resume on failure for large files)
- Processing latency: thumbnails within 30 seconds of upload
- High availability for serving (11 9s durability via S3)
- Scale to 10M uploads/day

### Step 2: Back-of-Envelope Estimation

```
10M uploads/day = ~115 uploads/sec
Average file size: 2MB (mix of images and documents)
Peak upload bandwidth: 115 * 2MB = 230MB/sec
Daily storage growth: 10M * 2MB = 20TB/day
Monthly storage: 600TB

Thumbnail generation: 115 images/sec
Each thumbnail: 3 sizes = 345 resize operations/sec
Processing time: ~2s per image = 690 concurrent workers at peak
```

### Step 3: High-Level Architecture

```
  Client
    |
    | 1. Request pre-signed URL
    v
  +------------------+
  | Upload Service   | 2. Generate pre-signed URL
  | (API)            |----> return to client
  +------------------+
    |
    | 3. Client uploads directly to S3
    v
  +------------------+       +------------------+
  |      S3          |------>| S3 Event         |
  | (raw uploads)    | event | Notification     |
  +------------------+       +------------------+
                                    |
                                    v
                             +------------------+
                             | Processing Queue |
                             | (SQS)            |
                             +------------------+
                                    |
                                    v
                             +------------------+
                             | Image Processor  |
                             | (Lambda)         |
                             +------------------+
                                    |
                             +------+------+
                             |             |
                             v             v
                        +--------+   +----------+
                        | S3     |   | Metadata  |
                        |(thumbs)|   | DB        |
                        +--------+   +----------+
                             |
                             v
                        +----------+
                        | CloudFront|
                        | (CDN)     |
                        +----------+
                             |
                             v
                          Clients
```

### Step 4: Database Design

```
PostgreSQL - File Metadata:
  Table: files
    id              UUID PRIMARY KEY
    user_id         UUID
    original_name   VARCHAR(255)
    content_type    VARCHAR(100)   -- "image/jpeg", "application/pdf"
    size_bytes      BIGINT
    s3_key          VARCHAR(500)   -- "uploads/user123/uuid.jpg"
    status          VARCHAR        -- "uploading", "processing", "ready", "failed"
    variants        JSONB          -- { "thumb_sm": "s3://...", "thumb_lg": "s3://..." }
    metadata        JSONB          -- EXIF data, dimensions, etc.
    is_public       BOOLEAN
    created_at      TIMESTAMP

  Index on (user_id, created_at) for listing user's files
  Index on content_type for filtering

S3 Bucket Structure:
  uploads/
    {user_id}/
      {file_id}/
        original.jpg
        thumb_small.jpg   (150x150)
        thumb_medium.jpg  (400x400)
        thumb_large.jpg   (800x800)
```

### Step 5: API Design

```
-- Request upload URL:
POST /api/v1/files/upload-url
  Body: { "filename": "photo.jpg", "content_type": "image/jpeg", "size_bytes": 2048000 }
  Response: {
    "file_id": "uuid",
    "upload_url": "https://s3.amazonaws.com/bucket/...?X-Amz-Signature=...",
    "expires_in": 3600
  }

-- Confirm upload complete (or rely on S3 event):
POST /api/v1/files/:id/complete

-- Get file info:
GET /api/v1/files/:id
  Response: {
    "id": "uuid",
    "status": "ready",
    "urls": {
      "original": "https://cdn.example.com/uploads/.../original.jpg",
      "thumb_small": "https://cdn.example.com/uploads/.../thumb_small.jpg"
    },
    "metadata": { "width": 4032, "height": 3024 }
  }

-- Get download URL (for private files):
GET /api/v1/files/:id/download-url
  Response: { "url": "https://...signed...", "expires_in": 3600 }

-- List user files:
GET /api/v1/files?page=1&limit=20&content_type=image
```

### Step 6: Deep Dive

**1. Pre-signed URL Flow**

```
Why pre-signed URLs?
  - File never touches your servers (saves bandwidth and compute)
  - Client uploads directly to S3
  - URL is time-limited and scoped to specific key and operation

Generation (in your Lambda):
  const url = s3.getSignedUrl('putObject', {
    Bucket: 'uploads',
    Key: `uploads/${userId}/${fileId}/original`,
    ContentType: 'image/jpeg',
    Expires: 3600  // 1 hour
  });
```

**2. Processing Pipeline**

```
S3 Event (ObjectCreated) --> SQS --> Lambda (processor)

Lambda processor:
  1. Download original from S3
  2. Validate (file type, size, virus scan)
  3. Generate variants:
     - thumb_small: 150x150 (center crop)
     - thumb_medium: 400x400 (fit within)
     - thumb_large: 800x800 (fit within)
  4. Upload variants to S3
  5. Extract metadata (EXIF, dimensions)
  6. Update file record in DB (status = "ready", variants, metadata)
  7. Publish "file.ready" event to EventBridge

For videos: use AWS MediaConvert (managed transcoding)
```

**3. Multipart Upload for Large Files**

Files > 100MB should use multipart upload:
1. Initiate multipart upload (get upload ID)
2. Upload parts in parallel (each 5-100MB)
3. Complete multipart upload (S3 assembles)
4. On failure: retry individual parts, or abort and clean up

Client library handles this. Your backend provides the initiation and completion endpoints.

### Step 7: Scaling and Trade-offs

- **Processing scaling**: Lambda auto-scales based on SQS queue depth. For CPU-heavy processing (video), use ECS with GPU instances.
- **CDN caching**: CloudFront caches files at edge. Invalidation is slow and costly -- use versioned URLs instead (append hash to filename).
- **Trade-off**: eager processing (generate all variants on upload) vs lazy processing (generate on first request). Eager is simpler, lazy saves storage for unused variants.
- **Trade-off**: pre-signed URLs (secure, scalable) vs proxy through your server (simpler client, but your server handles all traffic).
- **Cost**: S3 storage tiers. Use lifecycle policies: Standard -> IA after 30 days -> Glacier after 90 days for old files.
