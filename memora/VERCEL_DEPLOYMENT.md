# Deploying Memora to Vercel

## Prerequisites

Before deploying, ensure you have:

1. ✅ A Vercel account (sign up at https://vercel.com)
2. ✅ Elasticsearch instance (cloud or self-hosted with public access)
3. ✅ Google Cloud Storage bucket configured
4. ✅ API keys for:
   - DedalusLabs
   - Fireworks AI
   - ElevenLabs (optional)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

## Step 3: Configure Environment Variables

You'll need to set these environment variables in Vercel:

### Required Variables

```env
# AI Services
DEDALUS_API_KEY=your_dedalus_key
DEDALUS_API_URL=https://api.dedaluslabs.ai/v1
FIREWORKS_API_KEY=your_fireworks_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Elasticsearch (must be publicly accessible)
ES_HOST=https://your-elasticsearch-instance.com:9200
ES_USERNAME=elastic
ES_PASSWORD=your_es_password

# Google Cloud Storage
GCP_PROJECT_ID=your-project-id
GCS_BUCKET=your-bucket-name

# Google Cloud Service Account (base64 encoded)
GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64-encoded-service-account-json>

# Auth
DEMO_USER_ID=user-demo
```

### Encoding Google Cloud Credentials

Since Vercel doesn't support file uploads for credentials, you need to base64 encode your service account JSON:

```bash
# On Mac/Linux
base64 -i /path/to/your-service-account.json | tr -d '\n'

# On Windows (PowerShell)
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("C:\path\to\your-service-account.json"))
```

Then in your code, decode it:
```typescript
// lib/gcs.ts
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString())
  : undefined;
```

## Step 4: Deploy to Vercel

### Option A: Deploy via CLI (Recommended)

```bash
cd /Users/luxin/Desktop/Hackathons/TechWeek2025/memora
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** memora (or your preferred name)
- **Directory?** `./` (current directory)
- **Override settings?** No

### Option B: Deploy via GitHub Integration

1. Go to https://vercel.com/new
2. Import your GitHub repository: `LuxinZhang902/Memora`
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `memora`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Add all environment variables from Step 3
5. Click **Deploy**

## Step 5: Configure Environment Variables in Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable from Step 3
4. Make sure to set them for **Production**, **Preview**, and **Development**

## Step 6: Update GCS CORS Configuration

Your GCS bucket needs CORS configured to allow Vercel domain:

```bash
# Create cors.json
cat > cors.json << EOF
[
  {
    "origin": ["https://your-app.vercel.app", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS
gsutil cors set cors.json gs://your-bucket-name
```

## Step 7: Update Elasticsearch Security

If using Elasticsearch Cloud, add Vercel IPs to allowlist:
1. Go to Elasticsearch Cloud console
2. Navigate to **Security** → **Traffic Filters**
3. Add Vercel's IP ranges (or use 0.0.0.0/0 for testing)

## Step 8: Test Deployment

1. Visit your Vercel deployment URL
2. Try uploading a file
3. Try asking a question
4. Check Vercel logs for any errors:
   ```bash
   vercel logs
   ```

## Troubleshooting

### Issue: "Cannot find module '@elastic/elasticsearch'"

**Solution:** Already configured in `next.config.js` with `serverComponentsExternalPackages`

### Issue: "Function execution timeout"

**Solution:** Upgrade to Vercel Pro for longer function timeouts (60s vs 10s)

### Issue: "GCS authentication failed"

**Solution:** 
1. Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is correctly base64 encoded
2. Update `lib/gcs.ts` to decode the base64 string
3. Ensure service account has Storage Object Admin role

### Issue: "Elasticsearch connection refused"

**Solution:**
1. Ensure ES_HOST is publicly accessible
2. Check firewall/security group settings
3. Verify ES credentials are correct

### Issue: "API route timeout"

**Solution:**
- File processing (OCR, PDF extraction) can be slow
- Consider upgrading to Vercel Pro for 60s timeout
- Or use background jobs for large files

## Performance Optimization

### 1. Enable Edge Functions (Optional)

For faster response times in specific regions:

```json
// app/api/stt/route.ts
export const runtime = 'edge';
export const preferredRegion = 'sfo1';
```

### 2. Enable Caching

Add caching headers to API routes:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  }
});
```

### 3. Optimize Images

Vercel automatically optimizes images. Ensure you're using Next.js Image component:

```tsx
import Image from 'next/image';
<Image src={url} width={280} height={160} alt="..." />
```

## Monitoring

### View Logs

```bash
vercel logs --follow
```

### View Analytics

Go to Vercel Dashboard → Your Project → Analytics

### Set Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable alerts for:
   - Deployment failures
   - Function errors
   - Performance issues

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

## Continuous Deployment

Vercel automatically deploys:
- **Production:** When you push to `main` branch
- **Preview:** When you create a pull request

To disable auto-deployment:
1. Go to **Settings** → **Git**
2. Configure deployment branches

## Cost Considerations

### Vercel Free Tier Limits:
- ✅ 100 GB bandwidth/month
- ✅ 100 GB-hours serverless function execution
- ❌ 10s function timeout (may need Pro for file processing)
- ❌ No background jobs

### Vercel Pro ($20/month):
- ✅ 1 TB bandwidth/month
- ✅ 1000 GB-hours execution
- ✅ 60s function timeout
- ✅ Better performance

### Other Costs:
- **Elasticsearch Cloud:** ~$50-200/month depending on size
- **Google Cloud Storage:** ~$0.02/GB/month
- **API Costs:**
  - DedalusLabs: Pay per use
  - Fireworks AI: Pay per use
  - ElevenLabs: Pay per use

## Security Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] No API keys in code or git history
- [ ] GCS bucket is private (not public)
- [ ] Elasticsearch has authentication enabled
- [ ] CORS configured correctly
- [ ] CSP headers enabled
- [ ] Rate limiting configured (if needed)

## Next Steps

After successful deployment:

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain
4. ✅ Enable analytics
5. ✅ Share with users!

---

**Need help?** Check Vercel docs: https://vercel.com/docs
