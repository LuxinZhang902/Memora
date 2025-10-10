# Memora - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Security Audit
- [ ] All API keys in Secret Manager (not `.env.local`)
- [ ] GCS bucket is private (verify with `gsutil iam get`)
- [ ] Elasticsearch uses HTTPS + authentication
- [ ] CSP headers enabled in `middleware.ts`
- [ ] Signed URL TTL ≤ 15 minutes
- [ ] No content logging (audit all `console.log` statements)
- [ ] `.env.local` not committed to git (check `.gitignore`)

### 2. Infrastructure Setup

#### Elasticsearch
```bash
# Production ES cluster (Elastic Cloud recommended)
# Or self-hosted with TLS:
ES_HOST=https://your-es-cluster.com:9200
ES_USERNAME=elastic
ES_PASSWORD=<strong-password>
```

#### Google Cloud Storage
```bash
# Create production bucket (private)
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://memora-prod

# Set lifecycle policy
gsutil lifecycle set infrastructure/gcs-lifecycle.json gs://memora-prod

# Verify private
gsutil iam get gs://memora-prod | grep allUsers
# Should return nothing
```

#### Secret Manager (GCP)
```bash
# Store secrets
echo -n "sk-..." | gcloud secrets create openai-api-key --data-file=-
echo -n "..." | gcloud secrets create elevenlabs-api-key --data-file=-
echo -n "..." | gcloud secrets create fireworks-api-key --data-file=-
echo -n "changeme" | gcloud secrets create es-password --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Environment Variables (Production)

Create `.env.production` (or use platform secrets):
```env
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=<from-secret-manager>
OPENAI_PLANNER_MODEL=gpt-4o-mini
OPENAI_ANSWER_MODEL=gpt-4o-mini

# ElevenLabs
ELEVENLABS_API_KEY=<from-secret-manager>
ELEVENLABS_VOICE_ID=Rachel

# Fireworks
FIREWORKS_API_KEY=<from-secret-manager>
FIREWORKS_EMBED_MODEL=nomic-ai/nomic-embed-text-v1.5

# Elasticsearch
ES_HOST=https://your-es-cluster.com:9200
ES_USERNAME=elastic
ES_PASSWORD=<from-secret-manager>
ES_INDEX_PREFIX=life-moments

# Google Cloud
GCP_PROJECT_ID=your-project-id
GCS_BUCKET=memora-prod
# Use Workload Identity (no GOOGLE_APPLICATION_CREDENTIALS)

# App
DEMO_USER_ID=u_demo
```

## Deployment Options

### Option A: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Link project:**
   ```bash
   cd memora
   vercel link
   ```

3. **Add environment variables:**
   ```bash
   vercel env add OPENAI_API_KEY production
   vercel env add ELEVENLABS_API_KEY production
   vercel env add FIREWORKS_API_KEY production
   vercel env add ES_HOST production
   vercel env add ES_USERNAME production
   vercel env add ES_PASSWORD production
   vercel env add GCP_PROJECT_ID production
   vercel env add GCS_BUCKET production
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Verify:**
   - Visit deployed URL
   - Check CSP headers: `curl -I https://your-app.vercel.app`
   - Test query: type "When was the last time I went to Paris?"

**Note:** Vercel serverless functions have 10s timeout (Hobby) or 60s (Pro). For long-running embeddings, consider Railway or Cloud Run.

### Option B: Railway

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Create project:**
   ```bash
   railway init
   ```

3. **Add services:**
   ```bash
   # Add Elasticsearch (or use external)
   railway add elasticsearch

   # Add environment variables
   railway variables set OPENAI_API_KEY=sk-...
   railway variables set ELEVENLABS_API_KEY=...
   railway variables set FIREWORKS_API_KEY=...
   railway variables set ES_HOST=http://elasticsearch.railway.internal:9200
   railway variables set GCP_PROJECT_ID=...
   railway variables set GCS_BUCKET=memora-prod
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

### Option C: Google Cloud Run

1. **Build container:**
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm i -g pnpm && pnpm install --frozen-lockfile
   COPY . .
   RUN pnpm build
   EXPOSE 3000
   CMD ["pnpm", "start"]
   ```

2. **Build and push:**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT/memora
   ```

3. **Deploy:**
   ```bash
   gcloud run deploy memora \
     --image gcr.io/YOUR_PROJECT/memora \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "ES_HOST=https://...,GCS_BUCKET=memora-prod" \
     --set-secrets "OPENAI_API_KEY=openai-api-key:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest"
   ```

## Post-Deployment

### 1. Create Production Index
```bash
# SSH into server or run locally with prod ES_HOST
ES_HOST=https://your-es-cluster.com:9200 \
ES_USERNAME=elastic \
ES_PASSWORD=<password> \
pnpm create-index
```

### 2. Smoke Test
```bash
# Test API endpoints
curl -X POST https://your-app.com/api/plan \
  -H "Content-Type: application/json" \
  -d '{"text":"When was the last time I went to Paris?"}'

# Should return QueryPlan JSON
```

### 3. Monitor
- **Logs:** Check for errors, no content logging
- **Metrics:** Track API latency (OpenAI, ES, GCS)
- **Alerts:** Set up alerts for 5xx errors, high latency

### 4. Backup
```bash
# Snapshot ES index
curl -X PUT "https://your-es-cluster.com:9200/_snapshot/my_backup/snapshot_1?wait_for_completion=true"

# Backup GCS bucket
gsutil -m rsync -r gs://memora-prod gs://memora-backup
```

## Scaling Considerations

### Elasticsearch
- **Index per month:** Rotate indices monthly (already implemented)
- **Shards:** 1 primary + 1 replica for <50GB
- **Heap:** 50% of RAM, max 32GB

### GCS
- **Lifecycle:** Auto-delete derived artifacts after 7 days (see `gcs-lifecycle.json`)
- **CDN:** Use Cloud CDN for signed URLs (optional)

### API Rate Limits
- **OpenAI:** 3,500 RPM (Tier 1), 10,000 RPM (Tier 2)
- **ElevenLabs:** 10,000 chars/month (free), unlimited (paid)
- **Fireworks:** 600 RPM (free), 6,000 RPM (paid)

### Caching (Future)
- Cache QueryPlan for identical queries (Redis)
- Cache embeddings for common phrases
- Cache signed URLs for 5 min (in-memory)

## Rollback Plan

1. **Revert deployment:**
   ```bash
   # Vercel
   vercel rollback

   # Railway
   railway rollback

   # Cloud Run
   gcloud run services update-traffic memora --to-revisions=PREVIOUS_REVISION=100
   ```

2. **Restore ES snapshot:**
   ```bash
   curl -X POST "https://your-es-cluster.com:9200/_snapshot/my_backup/snapshot_1/_restore"
   ```

3. **Restore GCS backup:**
   ```bash
   gsutil -m rsync -r gs://memora-backup gs://memora-prod
   ```

## Security Incident Response

### API Key Compromise
1. Rotate key in Secret Manager
2. Update deployment with new key
3. Review logs for unauthorized usage
4. Notify affected users (if multi-user)

### Data Breach
1. Revoke all signed URLs (expire in 10 min)
2. Audit ES access logs
3. Rotate ES credentials
4. Notify users per GDPR/CCPA

### Vulnerability Disclosure
1. Triage severity (critical/high/medium/low)
2. Patch within SLA (24h critical, 7d high)
3. Deploy hotfix
4. Post-mortem + disclosure

## Monitoring Checklist

- [ ] Uptime monitoring (Pingdom, UptimeRobot)
- [ ] Error tracking (Sentry, Rollbar)
- [ ] Log aggregation (GCP Logging, Datadog)
- [ ] APM (New Relic, Datadog APM)
- [ ] Cost alerts (GCP Budgets, AWS Cost Explorer)

## Compliance

### GDPR
- [ ] Data processing agreement with cloud providers
- [ ] Right to erasure (delete API endpoint)
- [ ] Data export (download user moments)
- [ ] Privacy policy + cookie consent

### SOC 2
- [ ] Access controls (IAM, RBAC)
- [ ] Audit logs (all data access)
- [ ] Encryption at rest (GCS CMEK)
- [ ] Encryption in transit (TLS 1.3)
- [ ] Incident response plan

---

**Last updated:** 2025-10-09  
**Maintained by:** Memora Team
