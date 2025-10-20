# Google Cloud Storage Workflow in Memora

## 📋 Overview

Memora uses **Google Cloud Storage (GCS)** as its primary file storage backend, providing secure, scalable, and reliable storage for user-uploaded files. This document details the complete workflow from file upload to retrieval.

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    USER UPLOADS FILE                         │
│                  (via Web Interface)                         │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Next.js API Route                               │
│              /api/ingest-file                                │
│                                                              │
│  1. Receive multipart/form-data                             │
│  2. Parse file buffer                                       │
│  3. Generate unique GCS path                                │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│           Google Cloud Storage Upload                        │
│                                                              │
│  Path: gs://bucket/users/{userId}/moments/{momentId}/       │
│        files/{filename}                                      │
│                                                              │
│  • Private bucket (no public access)                        │
│  • Server-side encryption at rest                           │
│  • Cache-Control: max-age=31536000                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Content Extraction Pipeline                     │
│                                                              │
│  • PDF: Extract text using pdf-parse                        │
│  • DOCX: Extract text using Mammoth.js                      │
│  • Images: OCR via DedalusLabs Vision API                   │
│  • Images: Extract EXIF metadata (GPS, timestamp)           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│           Generate Semantic Embeddings                       │
│                                                              │
│  • Fireworks AI (nomic-embed-text-v1.5)                     │
│  • 768-dimensional vector                                   │
│  • Used for semantic search                                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Dual Index to Elasticsearch                     │
│                                                              │
│  Moments Index:                                              │
│  • moment_id, user_id, timestamp                            │
│  • artifacts: [{ artifact_id, gcs_path, ... }]              │
│  • Lightweight metadata                                     │
│                                                              │
│  File Contents Index:                                        │
│  • content_id, artifact_id, moment_id                       │
│  • extracted_text, content_vector                           │
│  • Full content for deep search                             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  File Ready for Search                       │
│                                                              │
│  • Searchable via keyword (BM25)                            │
│  • Searchable via semantic (vector)                         │
│  • Retrievable via signed URL                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📂 GCS Bucket Structure

### Directory Hierarchy

```
gs://memora-files/
├── users/
│   ├── user-123/
│   │   ├── moments/
│   │   │   ├── moment-abc/
│   │   │   │   ├── files/
│   │   │   │   │   ├── driver_license.pdf
│   │   │   │   │   ├── receipt.jpg
│   │   │   │   │   └── notes.docx
│   │   │   │   └── thumbnails/
│   │   │   │       ├── receipt_thumb.jpg
│   │   │   │       └── notes_thumb.png
│   │   │   └── moment-xyz/
│   │   │       └── files/
│   │   │           └── photo.jpg
│   │   └── profile/
│   │       └── avatar.jpg
│   └── user-456/
│       └── moments/
│           └── ...
└── public/
    └── assets/
        └── logos/
```

### Path Convention

**Format:**
```
gs://{bucket}/users/{user_id}/moments/{moment_id}/files/{filename}
```

**Example:**
```
gs://memora-files/users/user-demo/moments/abc-123/files/driver_license.pdf
```

**Benefits:**
- ✅ **User Isolation**: Each user has their own directory
- ✅ **Moment Grouping**: Files organized by moment/memory
- ✅ **Easy Cleanup**: Delete entire moment directory at once
- ✅ **Scalability**: Hierarchical structure supports millions of files

---

## 🔄 Complete Upload Workflow

### Step 1: Client-Side File Selection

```typescript
// User selects file via file input
<input 
  type="file" 
  accept=".pdf,.docx,.jpg,.png,.txt"
  onChange={handleFileSelect}
/>
```

### Step 2: API Request

```typescript
// Frontend sends multipart form data
const formData = new FormData();
formData.append('moment_id', momentId);
formData.append('user_id', userId);
formData.append('file', file);
formData.append('title', 'Driver License Renewal');
formData.append('text', 'Optional description');

const response = await fetch('/api/ingest-file', {
  method: 'POST',
  body: formData,
});
```

### Step 3: Server-Side Processing

```typescript
// /app/api/ingest-file/route.ts

export async function POST(request: NextRequest) {
  // 1. Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // 2. Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // 3. Generate GCS path
  const gcsPath = `gs://${process.env.GCS_BUCKET}/users/${userId}/moments/${momentId}/files/${file.name}`;
  
  // 4. Upload to GCS
  await uploadFile(buffer, gcsPath, file.type);
  
  // 5. Extract content
  const result = await ingestFile({
    momentId,
    userId,
    file: { buffer, filename: file.name, mimeType: file.type, size: file.size },
    gcsPath,
    extractContent: true,
  });
  
  // 6. Index to Elasticsearch
  await upsertMoment(momentIndex, momentId, momentDoc);
  
  return NextResponse.json({ success: true, ...result });
}
```

### Step 4: GCS Upload Implementation

```typescript
// /lib/gcs.ts

import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(
    Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString()
  ),
});

export async function uploadFile(
  buffer: Buffer,
  gcsPath: string,
  contentType: string
): Promise<string> {
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket);
  const filePath = keyParts.join('/');
  const file = b.file(filePath);

  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  console.log(`[GCS] Uploaded file to ${gcsPath}`);
  return gcsPath;
}
```

### Step 5: Content Extraction

```typescript
// /lib/fileStorage.ts

export async function ingestFile(options: IngestFileOptions) {
  const { file, gcsPath } = options;
  
  // Determine file category
  const fileCategory = getFileCategory(file.mimeType);
  
  // Extract content based on file type
  let extractionResult: ExtractionResult | undefined;
  
  if (shouldExtractContent(fileCategory)) {
    extractionResult = await extractContent(
      file.buffer,
      file.filename,
      file.mimeType,
      fileCategory
    );
  }
  
  // Generate embedding for semantic search
  let contentVector: number[] | undefined;
  if (extractionResult?.success && extractionResult.text) {
    contentVector = await embedText(extractionResult.text);
  }
  
  // Create file content document
  const fileContentDoc: FileContentDocument = {
    content_id: contentId,
    artifact_id: artifactId,
    moment_id: momentId,
    user_id: userId,
    file_name: file.filename,
    gcs_path: gcsPath,
    extracted_text: extractionResult?.text,
    content_vector: contentVector,
    extraction_status: extractionResult?.success ? 'success' : 'failed',
    created_at: new Date().toISOString(),
  };
  
  // Store in Elasticsearch
  await client.index({
    index: 'file-contents',
    id: contentId,
    body: fileContentDoc,
    refresh: true,
  });
  
  return { artifactId, contentId, artifactReference, extractionResult };
}
```

---

## 🔐 Security & Access Control

### Private Bucket Configuration

**Bucket Settings:**
```bash
# Create private bucket
gsutil mb -p ${GCP_PROJECT_ID} -c STANDARD -l us-central1 gs://memora-files

# Set private access (no public access)
gsutil iam ch allUsers:objectViewer gs://memora-files  # DO NOT RUN THIS

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://memora-files

# Set lifecycle policy (optional: auto-delete old files)
gsutil lifecycle set lifecycle.json gs://memora-files
```

**Lifecycle Policy (lifecycle.json):**
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 365,
          "matchesPrefix": ["users/deleted/"]
        }
      }
    ]
  }
}
```

### Signed URLs for Secure Access

**Why Signed URLs?**
- ✅ **Temporary Access**: URLs expire after 10 minutes
- ✅ **No Public Bucket**: Files remain private
- ✅ **User-Specific**: Each user can only access their own files
- ✅ **Audit Trail**: Track who accessed what

**Generate Signed URL:**

```typescript
// /lib/gcs.ts

export async function signRead(gcsPath: string, minutes = 10): Promise<string> {
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket);
  const file = b.file(keyParts.join('/'));
  
  const [url] = await file.getSignedUrl({
    action: 'read',
    version: 'v4',
    expires: Date.now() + minutes * 60_000, // 10 minutes
  });
  
  return url;
}
```

**Usage in API:**

```typescript
// /app/api/files/serve/[...path]/route.ts

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const userId = request.headers.get('x-user-id');
  const gcsPath = `gs://${process.env.GCS_BUCKET}/${params.path.join('/')}`;
  
  // Verify user owns this file
  if (!gcsPath.includes(`/users/${userId}/`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Generate signed URL
  const signedUrl = await signRead(gcsPath, 10);
  
  // Redirect to signed URL
  return NextResponse.redirect(signedUrl);
}
```

### User Isolation

**Enforcement Points:**

1. **Upload**: Path must include user's ID
```typescript
const gcsPath = `gs://${bucket}/users/${userId}/moments/${momentId}/files/${filename}`;
```

2. **Search**: Elasticsearch queries filtered by `user_id`
```typescript
const query = {
  bool: {
    must: [
      { term: { user_id: userId } },
      // ... other conditions
    ]
  }
};
```

3. **Retrieval**: Verify user owns the file
```typescript
if (!gcsPath.includes(`/users/${userId}/`)) {
  throw new Error('Unauthorized');
}
```

---

## 📊 File Metadata & EXIF Extraction

### EXIF Data from Images

When uploading images (JPEG, PNG), Memora extracts EXIF metadata including:

**GPS Location:**
```typescript
{
  gps_latitude: 37.7749,
  gps_longitude: -122.4194,
  gps_altitude: 15.5,
  location: {
    lat: 37.7749,
    lon: -122.4194
  }
}
```

**Camera Information:**
```typescript
{
  camera_make: "Apple",
  camera_model: "iPhone 14 Pro",
  date_taken: "2024-03-15T09:30:00Z"
}
```

**Propagation to Parent Moment:**

```typescript
// If image has GPS data, add to parent moment
const metadata = result.extractionResult?.metadata;
if (metadata?.gps_latitude && metadata?.gps_longitude) {
  momentDoc.geo = {
    lat: metadata.gps_latitude,
    lon: metadata.gps_longitude,
  };
}
```

**Benefits:**
- ✅ **Location-Based Search**: "Where was I near San Francisco?"
- ✅ **Timeline Visualization**: Map view of memories
- ✅ **Auto-Tagging**: Infer location from GPS coordinates

---

## 🔍 File Retrieval Workflow

### Workflow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│         User Searches: "driver license"                      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Hybrid Search (Elasticsearch)                   │
│                                                              │
│  • Search moments index (BM25 + vector)                     │
│  • Search file-contents index (BM25 + vector)               │
│  • Combine and rank results                                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Results with File References                    │
│                                                              │
│  {                                                           │
│    moment_id: "abc-123",                                     │
│    artifacts: [{                                             │
│      artifact_id: "file-789",                                │
│      name: "driver_license.pdf",                             │
│      gcs_path: "gs://bucket/users/.../driver_license.pdf"   │
│    }]                                                        │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│         Frontend Requests File URL                           │
│                                                              │
│  GET /api/files/serve/users/{userId}/moments/{momentId}/    │
│      files/driver_license.pdf                                │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│         Backend Generates Signed URL                         │
│                                                              │
│  • Verify user owns file                                    │
│  • Generate signed URL (10 min expiry)                      │
│  • Return URL to frontend                                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│         Frontend Displays File                               │
│                                                              │
│  • Images: <img src={signedUrl} />                          │
│  • PDFs: <iframe src={signedUrl} />                         │
│  • Documents: Download link                                 │
└──────────────────────────────────────────────────────────────┘
```

### Code Example

```typescript
// Frontend: Display file
const FileDisplay = ({ artifact }: { artifact: Artifact }) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  
  useEffect(() => {
    // Request signed URL from backend
    fetch(`/api/files/serve/${artifact.gcs_path.replace('gs://', '')}`)
      .then(res => res.json())
      .then(data => setSignedUrl(data.url));
  }, [artifact.gcs_path]);
  
  if (artifact.kind === 'photo') {
    return <img src={signedUrl} alt={artifact.name} />;
  }
  
  if (artifact.kind === 'document') {
    return <a href={signedUrl} download>{artifact.name}</a>;
  }
  
  return null;
};
```

---

## ⚙️ Configuration & Setup

### Environment Variables

```bash
# Google Cloud Project
GCP_PROJECT_ID=memora-production

# GCS Bucket Name
GCS_BUCKET=memora-files

# Authentication (choose one)

# Option 1: Local development (service account key file)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: Vercel/Production (base64-encoded JSON)
GOOGLE_APPLICATION_CREDENTIALS_JSON=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibWVtb3JhLXByb2R1Y3Rpb24iLAogIC4uLgp9Cg==
```

### Service Account Setup

**1. Create Service Account:**

```bash
gcloud iam service-accounts create memora-storage \
  --display-name="Memora Storage Service Account" \
  --project=${GCP_PROJECT_ID}
```

**2. Grant Permissions:**

```bash
# Storage Object Admin (read/write/delete)
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:memora-storage@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Storage Bucket Viewer (list buckets)
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:memora-storage@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.legacyBucketReader"
```

**3. Create Key:**

```bash
gcloud iam service-accounts keys create memora-storage-key.json \
  --iam-account=memora-storage@${GCP_PROJECT_ID}.iam.gserviceaccount.com
```

**4. For Vercel Deployment:**

```bash
# Base64 encode the key
cat memora-storage-key.json | base64 > memora-storage-key.base64

# Add to Vercel environment variables
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON < memora-storage-key.base64
```

---

## 📈 Performance Optimization

### 1. Parallel Uploads

For multiple files, upload in parallel:

```typescript
const uploadPromises = files.map(file => 
  uploadFile(file.buffer, file.gcsPath, file.mimeType)
);

await Promise.all(uploadPromises);
```

### 2. Streaming for Large Files

For files > 10MB, use streaming:

```typescript
import { Readable } from 'stream';

export async function uploadFileStream(
  stream: Readable,
  gcsPath: string,
  contentType: string
): Promise<string> {
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const file = storage.bucket(bucket).file(keyParts.join('/'));
  
  await new Promise((resolve, reject) => {
    stream
      .pipe(file.createWriteStream({ contentType }))
      .on('finish', resolve)
      .on('error', reject);
  });
  
  return gcsPath;
}
```

### 3. Thumbnail Generation

Generate thumbnails for images:

```typescript
import sharp from 'sharp';

export async function generateThumbnail(
  buffer: Buffer,
  maxWidth: number = 300
): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// Upload both original and thumbnail
const thumbBuffer = await generateThumbnail(buffer);
const thumbPath = gcsPath.replace('/files/', '/thumbnails/').replace(/\.\w+$/, '_thumb.jpg');

await Promise.all([
  uploadFile(buffer, gcsPath, file.mimeType),
  uploadFile(thumbBuffer, thumbPath, 'image/jpeg'),
]);
```

### 4. CDN Integration

Use Cloud CDN for faster delivery:

```bash
# Enable Cloud CDN on bucket
gcloud compute backend-buckets create memora-cdn \
  --gcs-bucket-name=memora-files \
  --enable-cdn
```

---

## 🧪 Testing

### Local Testing with GCS Emulator

```bash
# Install GCS emulator
pip install gcs-emulator

# Start emulator
gcs-emulator start --port=9023 --in-memory

# Set environment variable
export STORAGE_EMULATOR_HOST=http://localhost:9023
```

### Unit Tests

```typescript
import { uploadFile, signRead, deleteFile } from '@/lib/gcs';

describe('GCS Operations', () => {
  it('should upload file', async () => {
    const buffer = Buffer.from('test content');
    const gcsPath = 'gs://test-bucket/test.txt';
    
    const result = await uploadFile(buffer, gcsPath, 'text/plain');
    expect(result).toBe(gcsPath);
  });
  
  it('should generate signed URL', async () => {
    const gcsPath = 'gs://test-bucket/test.txt';
    const url = await signRead(gcsPath, 10);
    
    expect(url).toContain('storage.googleapis.com');
    expect(url).toContain('X-Goog-Signature');
  });
  
  it('should delete file', async () => {
    const gcsPath = 'gs://test-bucket/test.txt';
    await deleteFile(gcsPath);
    
    // Verify file is deleted
    const exists = await fileExists(gcsPath);
    expect(exists).toBe(false);
  });
});
```

---

## 💰 Cost Optimization

### Storage Costs

**Pricing (as of 2024):**
- Standard Storage: $0.020 per GB/month
- Nearline Storage: $0.010 per GB/month (for archives)
- Operations: $0.05 per 10,000 operations

**Optimization Strategies:**

1. **Lifecycle Policies**: Move old files to Nearline
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
        "condition": { "age": 90 }
      }
    ]
  }
}
```

2. **Compression**: Compress text files before upload
```typescript
import zlib from 'zlib';

const compressed = zlib.gzipSync(buffer);
await uploadFile(compressed, gcsPath, 'application/gzip');
```

3. **Deduplication**: Hash files to avoid duplicates
```typescript
import crypto from 'crypto';

const hash = crypto.createHash('sha256').update(buffer).digest('hex');
const gcsPath = `gs://bucket/users/${userId}/files/${hash}.${ext}`;
```

### Bandwidth Costs

- **Egress (download)**: $0.12 per GB (to internet)
- **Ingress (upload)**: Free
- **Within GCP**: Free

**Optimization:**
- Use Cloud CDN to cache frequently accessed files
- Serve thumbnails instead of full images when possible

---

## 🚨 Error Handling

### Common Errors

**1. Authentication Failed**
```typescript
try {
  await uploadFile(buffer, gcsPath, contentType);
} catch (error) {
  if (error.code === 401) {
    console.error('GCS authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS');
  }
}
```

**2. Bucket Not Found**
```typescript
try {
  await uploadFile(buffer, gcsPath, contentType);
} catch (error) {
  if (error.code === 404) {
    console.error(`Bucket not found: ${process.env.GCS_BUCKET}`);
  }
}
```

**3. Quota Exceeded**
```typescript
try {
  await uploadFile(buffer, gcsPath, contentType);
} catch (error) {
  if (error.code === 429) {
    console.error('GCS quota exceeded. Retry with exponential backoff');
    await retryWithBackoff(() => uploadFile(buffer, gcsPath, contentType));
  }
}
```

### Retry Logic

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 📊 Monitoring & Logging

### Cloud Logging

```typescript
import { Logging } from '@google-cloud/logging';

const logging = new Logging({ projectId: process.env.GCP_PROJECT_ID });
const log = logging.log('memora-storage');

export async function logUpload(userId: string, gcsPath: string, size: number) {
  const metadata = {
    resource: { type: 'gcs_bucket', labels: { bucket_name: process.env.GCS_BUCKET } },
    severity: 'INFO',
  };
  
  const entry = log.entry(metadata, {
    user_id: userId,
    gcs_path: gcsPath,
    file_size: size,
    timestamp: new Date().toISOString(),
  });
  
  await log.write(entry);
}
```

### Metrics

Track key metrics:
- **Upload Success Rate**: % of successful uploads
- **Average Upload Time**: Time to upload files
- **Storage Usage**: Total bytes stored per user
- **Bandwidth Usage**: Total egress per day

```typescript
export async function getStorageMetrics(userId: string) {
  const [files] = await storage.bucket(process.env.GCS_BUCKET!).getFiles({
    prefix: `users/${userId}/`,
  });
  
  const totalSize = files.reduce((sum, file) => sum + Number(file.metadata.size || 0), 0);
  const fileCount = files.length;
  
  return { totalSize, fileCount };
}
```

---

## 🎯 Best Practices

### 1. Security
- ✅ Use private buckets (no public access)
- ✅ Generate signed URLs with short expiration (10 min)
- ✅ Validate file types and sizes before upload
- ✅ Scan for malware (use Cloud Security Scanner)

### 2. Performance
- ✅ Upload files in parallel when possible
- ✅ Use streaming for large files (> 10MB)
- ✅ Generate thumbnails for images
- ✅ Enable Cloud CDN for faster delivery

### 3. Cost
- ✅ Implement lifecycle policies (move old files to Nearline)
- ✅ Compress text files before upload
- ✅ Deduplicate files using content hashing
- ✅ Delete unused files regularly

### 4. Reliability
- ✅ Implement retry logic with exponential backoff
- ✅ Log all operations for debugging
- ✅ Monitor storage usage and set alerts
- ✅ Test with GCS emulator locally

---

## 📚 References

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Node.js Client Library](https://googleapis.dev/nodejs/storage/latest/)
- [Signed URLs Guide](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

---

**Made with ❤️ for TechWeek 2025 Hackathon**
