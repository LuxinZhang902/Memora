# Memora - Verification Checklist

Run these commands to verify your setup is correct.

## 1. Check File Structure

```bash
cd /Users/luxin/Desktop/Hackathons/TechWeek2025/memora

# Verify all key files exist
ls -la app/page.tsx
ls -la lib/types.ts
ls -la convex/actions/planQuery.ts
ls -la infrastructure/es-mapping.json
ls -la scripts/create_index.ts
```

**Expected:** All files exist (no "No such file" errors)

## 2. Install Dependencies

```bash
pnpm install
```

**Expected:** 
- No errors
- `node_modules/` directory created
- All TypeScript errors should disappear

## 3. Verify Environment Variables

```bash
# Copy example env
cp infrastructure/example.env .env.local

# Edit .env.local and add your API keys
# Then verify it's gitignored:
git status .env.local
```

**Expected:** `.env.local` should NOT appear in git status (gitignored)

## 4. Start Elasticsearch

```bash
docker run -d \
  --name memora-es \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0

# Wait 30 seconds, then verify
sleep 30
curl http://localhost:9200
```

**Expected:** JSON response with cluster info

## 5. Create Index

```bash
pnpm create-index
```

**Expected:** `Created index life-moments-2025-10`

## 6. Verify Index

```bash
curl http://localhost:9200/life-moments-2025-10
```

**Expected:** JSON with mappings showing `moment_id`, `user_id`, `artifacts`, etc.

## 7. Seed Demo Data

```bash
pnpm seed
```

**Expected:** 
- No errors
- `Test search hits: 1` or `Test search hits: 2`

## 8. Verify Seeded Data

```bash
curl -X POST http://localhost:9200/life-moments-2025-10/_search \
  -H "Content-Type: application/json" \
  -d '{"query":{"match_all":{}},"size":10}'
```

**Expected:** JSON with 2 hits (Paris trip + DMV renewal)

## 9. Build Next.js

```bash
pnpm build
```

**Expected:** 
- `.next/` directory created
- No TypeScript errors
- "Compiled successfully"

## 10. Start Dev Server

```bash
pnpm dev
```

**Expected:** 
- Server starts on http://localhost:3000
- No errors in console

## 11. Test Frontend

Open http://localhost:3000 in browser

**Expected:**
- Page loads with "Memora" heading
- "Speak" button visible
- Input field visible
- No console errors

## 12. Test Query (Manual)

In browser:
1. Type: "When was the last time I went to Paris?"
2. Click "Ask"

**Expected:**
- Loading state appears
- Answer card shows 2-sentence response
- Evidence gallery shows 3 items (photo, PDF, note)
- Debug panel toggle works

## 13. Test API Endpoints

```bash
# Test planner
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -d '{"text":"When was the last time I went to Paris?"}'

# Expected: JSON with QueryPlan
```

## 14. Security Verification

```bash
# Verify CSP headers
curl -I http://localhost:3000

# Expected: Content-Security-Policy header present
```

## 15. Check Logs

```bash
# In terminal where `pnpm dev` is running
# Type a query in browser
# Check logs
```

**Expected:**
- No content logged (no `text` or `signedUrl` in logs)
- Only metadata: `moment_id`, `timestamp`, `type`

---

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules .next
pnpm install
```

### Elasticsearch not responding
```bash
docker logs memora-es
docker restart memora-es
```

### GCS errors (optional for local dev)
- Comment out GCS-related code in `scripts/seed_moments.ts`
- Or set up GCS bucket and credentials

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
pnpm dev
```

---

## Success Criteria ✅

- [ ] All dependencies installed
- [ ] Elasticsearch running and indexed
- [ ] 2 demo moments seeded
- [ ] Next.js builds without errors
- [ ] Dev server starts on :3000
- [ ] Frontend loads without errors
- [ ] Query returns answer + evidence
- [ ] Debug panel shows plan/DSL
- [ ] No content in logs
- [ ] CSP headers present

**If all checked, you're ready to demo! 🎉**
