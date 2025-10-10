# Google Cloud Storage Setup Guide

## Overview
Files are now uploaded to Google Cloud Storage (GCS) and served via signed URLs.

## Setup Steps

### 1. Create a GCS Bucket
```bash
# Using gcloud CLI
gcloud storage buckets create gs://memora20251010 \
  --location=us-central1 \
  --uniform-bucket-level-access
```

Or create via [Google Cloud Console](https://console.cloud.google.com/storage)

### 2. Set Up Service Account
```bash
# Create service account
gcloud iam service-accounts create memora-storage \
  --display-name="Memora File Storage"

# Grant storage permissions
gcloud projects add-iam-policy-binding memora20251010 \
  --member="serviceAccount:memora-storage@memora20251010.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download key
gcloud iam service-accounts keys create ./memora-gcs-key.json \
  --iam-account=memora-storage@memora20251010.iam.gserviceaccount.com
```

### 3. Configure Environment Variables
Add to your `.env.local`:

```bash
# Google Cloud Storage
GCP_PROJECT_ID=memora20251010
GCS_BUCKET=memora20251010
GOOGLE_APPLICATION_CREDENTIALS=./memora-gcs-key.json
```

### 4. Set Lifecycle Policy (Optional)
Apply the lifecycle policy to auto-delete old files:

```bash
gcloud storage buckets update gs://memora20251010 \
  --lifecycle-file=infrastructure/gcs-lifecycle.json
```

## How It Works

### Upload Flow
1. User uploads file via "Build My Memory"
2. File buffer is uploaded to GCS: `gs://bucket/users/{userId}/moments/{momentId}/files/{filename}`
3. File metadata + GCS path stored in Elasticsearch
4. Content extraction runs (EXIF, OCR, etc.)

### Serving Flow
1. User clicks "Open File"
2. Frontend calls `/api/files/serve/{contentId}`
3. Backend generates signed URL (valid 60 min)
4. User redirected to signed GCS URL
5. File downloads/displays directly from GCS

### Delete Flow
1. User clicks "Delete"
2. Backend deletes from GCS
3. Backend deletes metadata from Elasticsearch

## Security

- **Signed URLs**: Files are private, accessed via time-limited signed URLs
- **Uniform bucket-level access**: Simplified IAM permissions
- **Service account**: Limited scope credentials for storage operations

## Cost Optimization

- **Lifecycle policy**: Auto-delete files after 90 days (configurable)
- **Standard storage**: Use for frequently accessed files
- **Nearline/Coldline**: Move to cheaper storage for archives

## Troubleshooting

### "Failed to upload to GCS"
- Check `GOOGLE_APPLICATION_CREDENTIALS` path
- Verify service account has `storage.objectAdmin` role
- Ensure bucket exists and is accessible

### "File not found in storage"
- File may have been uploaded before GCS was configured
- Check if file exists in bucket: `gsutil ls gs://memora20251010/users/...`

### "Signed URL expired"
- URLs expire after 60 minutes
- Click "Open File" again to generate new URL

## Alternative: Public Bucket
If you want files publicly accessible (not recommended):

```bash
# Make bucket public
gsutil iam ch allUsers:objectViewer gs://memora20251010

# Update handleOpenFile to use public URL instead of signed URL
```

## Monitoring

View storage usage:
```bash
gcloud storage du gs://memora20251010 --summarize
```

View recent uploads:
```bash
gsutil ls -lh gs://memora20251010/users/
```
