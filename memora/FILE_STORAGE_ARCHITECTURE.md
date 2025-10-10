# File Storage Architecture for Memora

## 📋 Overview

This document describes the **production-grade file storage system** with content extraction and parent-child relationships in Elasticsearch.

## 🏗️ Architecture

### Parent-Child Document Model

```
┌─────────────────────────────────────────────────────────────┐
│                    MOMENT (Parent)                          │
│  - moment_id: "abc-123"                                     │
│  - user_id: "user-456"                                      │
│  - title: "Driver License Renewal"                          │
│  - timestamp: "2024-03-15T10:00:00Z"                        │
│  - artifacts: [                                             │
│      {                                                      │
│        artifact_id: "file-789",                             │
│        kind: "document",                                    │
│        name: "license.pdf",                                 │
│        has_content: true                                    │
│      }                                                      │
│    ]                                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ references
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FILE CONTENT (Child)                           │
│  - content_id: "content-999"                                │
│  - artifact_id: "file-789"                                  │
│  - moment_id: "abc-123"                                     │
│  - file_name: "license.pdf"                                 │
│  - file_category: "document"                                │
│  - extracted_text: "Driver License... expires 2025..."     │
│  - content_vector: [0.123, 0.456, ...]                     │
│  - metadata: {                                              │
│      page_count: 2,                                         │
│      word_count: 450                                        │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Type Taxonomy

### Supported File Categories

1. **DOCUMENT** - PDFs, DOCX, TXT, RTF
   - Content extraction: ✅ Text extraction
   - Searchable: ✅ Full-text search
   - Metadata: Page count, word count, author

2. **IMAGE** - JPG, PNG, GIF, HEIC
   - Content extraction: ✅ OCR (Optical Character Recognition) + EXIF metadata
   - Searchable: ✅ Extracted text from images
   - Metadata: Dimensions, format, detected objects, GPS location, camera info

3. **AUDIO** - MP3, WAV, M4A
   - Content extraction: ✅ Speech-to-Text transcription
   - Searchable: ✅ Transcribed text
   - Metadata: Duration, bitrate, transcript

4. **VIDEO** - MP4, MOV, AVI
   - Content extraction: ⏳ Planned (frame extraction, speech-to-text)
   - Searchable: ⏳ Future
   - Metadata: Duration, resolution, codec

5. **ARCHIVE** - ZIP, RAR, TAR
   - Content extraction: ⏳ Planned (file list)
   - Searchable: ❌ Not applicable
   - Metadata: File list, compressed size

6. **CODE** - JS, TS, PY, JAVA
   - Content extraction: ✅ Plain text
   - Searchable: ✅ Full-text search
   - Metadata: Lines of code, language

## 🔧 Implementation

### Core Files

1. **`lib/fileTypes.ts`**
   - File type definitions
   - Category mappings
   - TypeScript interfaces
   - Elasticsearch mappings

2. **`lib/contentExtractor.ts`**
   - PDF text extraction
   - Image OCR (OpenAI Vision)
   - Audio transcription (Whisper)
   - Document parsing

3. **`lib/fileStorage.ts`**
   - File ingestion pipeline
   - Elasticsearch operations
   - Search functionality
   - Storage statistics

4. **`app/api/ingest-file/route.ts`**
   - HTTP endpoint for file uploads
   - Multipart form data handling
   - Response formatting

## 📊 Elasticsearch Indices

### Index 1: `life-moments` (Parent)

```json
{
  "moment_id": "abc-123",
  "user_id": "user-456",
  "timestamp": "2024-03-15T10:00:00Z",
  "type": "file_upload",
  "title": "Driver License Renewal",
  "text": "Renewed my driver license...",
  "artifacts": [
    {
      "artifact_id": "file-789",
      "kind": "document",
      "name": "license.pdf",
      "mime": "application/pdf",
      "size": 245678,
      "gcs_path": "gs://bucket/users/user-456/files/license.pdf",
      "has_content": true,
      "page_count": 2
    }
  ],
  "has_files": true,
  "file_count": 1,
  "geo": {
    "lat": 37.7749,
    "lon": -122.4194,
    "city": "San Francisco",
    "state": "CA",
    "country": "USA"
  },
  "vector": [0.123, 0.456, ...]
}
```

### Index 2: `file-contents` (Child)

```json
{
  "content_id": "content-999",
  "artifact_id": "file-789",
  "moment_id": "abc-123",
  "user_id": "user-456",
  
  "file_name": "license.pdf",
  "file_type": "pdf",
  "file_category": "document",
  "mime_type": "application/pdf",
  "file_size": 245678,
  
  "gcs_path": "gs://bucket/users/user-456/files/license.pdf",
  
  "extracted_text": "California Driver License\nName: John Doe\nExpires: 03/15/2025\n...",
  "extracted_text_en": "California Driver License\nName: John Doe\nExpires: 03/15/2025\n...",
  
  "metadata": {
    "page_count": 2,
    "word_count": 450,
    "author": "CA DMV",
    "created_date": "2024-03-15",
    "camera_make": "Apple",
    "camera_model": "iPhone 14 Pro",
    "date_taken": "2024-03-15T09:30:00Z",
    "gps_latitude": 37.7749,
    "gps_longitude": -122.4194,
    "gps_altitude": 15.5,
    "location": {
      "lat": 37.7749,
      "lon": -122.4194
    }
  },
  
  "content_vector": [0.234, 0.567, ...],
  
  "extraction_status": "success",
  "extraction_timestamp": "2024-03-15T10:01:30Z",
  
  "created_at": "2024-03-15T10:01:00Z",
  "updated_at": "2024-03-15T10:01:30Z"
}
```

## 🔍 Search Capabilities

### 1. Full-Text Search

Search within file contents:

```typescript
const results = await searchFileContents({
  userId: 'user-456',
  query: 'driver license expires',
  fileCategories: [FileCategory.DOCUMENT],
  limit: 10
});
```

Returns:
- Matching files with scores
- Highlighted excerpts
- File metadata

### 2. Vector Similarity Search

Semantic search using embeddings:

```typescript
const queryVector = await embedText('when does my license expire');
const results = await searchFileContentsByVector(
  'user-456',
  queryVector,
  10
);
```

### 3. Hybrid Search

Combine full-text and vector search for best results:

```typescript
// 1. Get vector matches
const vectorResults = await searchFileContentsByVector(userId, queryVector, 20);

// 2. Get text matches
const textResults = await searchFileContents({ userId, query, limit: 20 });

// 3. Merge and re-rank
const mergedResults = mergeAndRank(vectorResults, textResults);
```

## 📝 Usage Examples

### Example 1: Upload PDF with Content Extraction

```bash
curl -X POST http://localhost:3000/api/ingest-file \
  -F "moment_id=abc-123" \
  -F "user_id=user-456" \
  -F "file=@license.pdf" \
  -F "title=Driver License Renewal"
```

Response:
```json
{
  "success": true,
  "momentId": "abc-123",
  "artifactId": "file-789",
  "contentId": "content-999",
  "extraction": {
    "status": "success",
    "textLength": 1234,
    "processingTimeMs": 2500
  }
}
```

### Example 2: Upload Image with OCR

```bash
curl -X POST http://localhost:3000/api/ingest-file \
  -F "moment_id=xyz-456" \
  -F "user_id=user-456" \
  -F "file=@receipt.jpg" \
  -F "title=Grocery Receipt"
```

The system will:
1. Upload image to GCS
2. Extract text using OCR (OpenAI Vision)
3. Generate vector embedding
4. Store in Elasticsearch
5. Link to parent moment

### Example 3: Search Across Files

```typescript
// Search for "driver license"
const results = await searchFileContents({
  userId: 'user-456',
  query: 'driver license expires 2025',
  fileCategories: [FileCategory.DOCUMENT, FileCategory.IMAGE],
  limit: 10
});

// Results include:
// - license.pdf (extracted text match)
// - license_photo.jpg (OCR text match)
// - dmv_email.txt (text match)
```

## 🎯 Benefits

### 1. **Searchability**
- ✅ Search within PDFs, images, audio
- ✅ Full-text and semantic search
- ✅ Highlighted excerpts

### 2. **Scalability**
- ✅ Separate indices for moments and content
- ✅ Efficient storage (no duplication)
- ✅ Fast queries with proper indexing

### 3. **Flexibility**
- ✅ Easy to add new file types
- ✅ Extensible metadata structure
- ✅ Support for multiple extraction methods

### 4. **Performance**
- ✅ Parallel content extraction
- ✅ Async processing
- ✅ Caching of embeddings

## 🚀 Production Deployment

### Required Services

1. **Elasticsearch** (v8+)
   - File content index
   - Vector search enabled

2. **Google Cloud Storage** (or S3)
   - File storage
   - Signed URLs for access

3. **OpenAI API**
   - Whisper for audio transcription
   - Vision API for image OCR
   - Embeddings for semantic search

4. **Optional: Apache Tika**
   - Universal content extraction
   - Supports 1000+ file formats

### Environment Variables

```bash
# Elasticsearch
ES_HOST=https://elasticsearch:9200
ES_USERNAME=elastic
ES_PASSWORD=changeme

# Storage
GCS_BUCKET=memora-files
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# AI Services
OPENAI_API_KEY=sk-...
FIREWORKS_API_KEY=fw_...
```

### Setup Steps

1. **Create Elasticsearch indices**
```bash
curl -X POST http://localhost:3000/api/setup-indices
```

2. **Configure GCS bucket**
```bash
gsutil mb gs://memora-files
gsutil lifecycle set infrastructure/gcs-lifecycle.json gs://memora-files
```

3. **Test file upload**
```bash
curl -X POST http://localhost:3000/api/ingest-file \
  -F "moment_id=test-123" \
  -F "user_id=test-user" \
  -F "file=@test.pdf"
```

## 📈 Future Enhancements

1. **Video Processing**
   - Frame extraction
   - Scene detection
   - Speech-to-text from video

2. **Advanced OCR**
   - Handwriting recognition
   - Table extraction
   - Form field detection

3. **Smart Metadata**
   - Auto-tagging
   - Entity extraction
   - Sentiment analysis

4. **Batch Processing**
   - Queue-based extraction
   - Background jobs
   - Progress tracking

5. **Caching Layer**
   - Redis for frequently accessed content
   - CDN for file delivery
   - Edge caching

## 🔒 Security Considerations

1. **File Validation**
   - MIME type verification
   - File size limits
   - Virus scanning

2. **Access Control**
   - User-based isolation
   - Signed URLs with expiration
   - Audit logging

3. **Data Privacy**
   - Encryption at rest (GCS)
   - Encryption in transit (HTTPS)
   - PII detection and redaction

## 📚 References

- [Elasticsearch Parent-Child](https://www.elastic.co/guide/en/elasticsearch/reference/current/parent-join.html)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Apache Tika](https://tika.apache.org/)
