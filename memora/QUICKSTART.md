# Memora - Quick Setup Guide

## 1. Install Dependencies

```bash
cd /Users/luxin/Desktop/Hackathons/TechWeek2025/memora
pnpm install
```

## 2. Start Elasticsearch (Docker)

```bash
docker run -d \
  --name memora-es \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0
```

Wait 30 seconds for ES to start, then verify:
```bash
curl http://localhost:9200
```

## 3. Configure Environment

```bash
cp infrastructure/example.env .env.local
```

Edit `.env.local` and add your API keys:
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `ELEVENLABS_API_KEY` - Get from https://elevenlabs.io/app/settings/api-keys
- `FIREWORKS_API_KEY` - Get from https://fireworks.ai/api-keys
- `GCP_PROJECT_ID` - Your Google Cloud project ID
- `GCS_BUCKET` - Your GCS bucket name (must exist and be private)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON or use ADC

**Minimal .env.local for testing (without GCS):**
```env
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
FIREWORKS_API_KEY=...
ES_HOST=http://localhost:9200
ES_USERNAME=elastic
ES_PASSWORD=changeme
DEMO_USER_ID=u_demo
```

## 4. Create GCS Bucket (if using GCS)

```bash
# Create private bucket
gsutil mb -p YOUR_PROJECT_ID gs://memora-dev-yourname

# Verify it's private (should return nothing)
gsutil iam get gs://memora-dev-yourname | grep allUsers
```

## 5. Create Elasticsearch Index

```bash
pnpm create-index
```

Expected output:
```
Created index life-moments-2025-10
```

## 6. Seed Demo Data

```bash
pnpm seed
```

Expected output:
```
Test search hits: 1
```

## 7. Start Dev Server

```bash
pnpm dev
```

Open http://localhost:3000

## 8. Test the Demo

### Option A: Type a question
1. Type: "When was the last time I went to Paris?"
2. Click "Ask"
3. See answer card with evidence (photo, PDF, note)

### Option B: Use voice (requires mic permission)
1. Click "Speak"
2. Say: "When did I renew my driver's license?"
3. Click "Stop"
4. See answer card with evidence

## Troubleshooting

### Elasticsearch not starting
```bash
# Check logs
docker logs memora-es

# Restart
docker restart memora-es
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules .next
pnpm install
```

### GCS signed URL fails
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON
- Or use Application Default Credentials: `gcloud auth application-default login`
- Ensure service account has `roles/storage.objectAdmin` on bucket

### Seed script fails
- Check ES is running: `curl http://localhost:9200`
- Check GCS bucket exists: `gsutil ls gs://YOUR_BUCKET`
- Verify API keys in `.env.local`

## Next Steps

- Add more moments via `/api/ingest` endpoint
- Customize UI in `app/page.tsx`
- Add real auth in `lib/auth.ts`
- Deploy to Vercel/Railway with production secrets
