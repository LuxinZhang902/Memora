# Security Posture

Memora is designed with **privacy by default** and **zero-trust principles** for personal data.

## Core Security Guarantees

### 1. Private Storage (GCS)

- **Bucket is private:** No public access; all objects require signed URLs.
- **Signed URLs:** V4 signatures with 10-minute TTL (configurable).
- **No direct access:** Client never receives raw `gs://` paths; only time-limited signed URLs.
- **Lifecycle policies:** Optional auto-deletion of derived artifacts (e.g., TTS MP3s after 7 days).

**Verification:**
```bash
# Direct bucket URL should 403:
curl https://storage.googleapis.com/${GCS_BUCKET}/users/u_demo/moments/2023/05/20/abc123/media/photo.jpg
# → 403 Forbidden

# Signed URL works (for 10 min):
curl "https://storage.googleapis.com/...?X-Goog-Signature=..."
# → 200 OK
```

### 2. User Isolation (Elasticsearch)

- **Mandatory filter:** Every ES query includes `filter: { term: { user_id } }`.
- **Server-side DSL:** Client never sends raw ES queries; all DSL built in `lib/es.ts`.
- **_source minimization:** Only required fields returned via `_source.includes`.
- **No cross-user leakage:** User A cannot query User B's moments.

**Verification:**
```typescript
// lib/es.ts always enforces:
const filter: any[] = [{ term: { user_id: params.userId } }];
```

### 3. Content Security Policy (CSP)

Strict CSP headers in `middleware.ts`:
```
default-src 'self';
img-src 'self' https: data: blob:;
media-src 'self' https: blob:;
connect-src 'self' https:;
frame-ancestors 'none';
```

Additional headers:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY`
- `Permissions-Policy: microphone=()`

### 4. Secrets Management

- **Local dev:** `.env.local` (gitignored)
- **Production:** GCP Secret Manager (recommended) or equivalent
- **No hardcoded keys:** All API keys read from environment variables
- **Rotation:** Update `.env.local` or Secret Manager; restart app

**Best practices:**
- Use GCP Workload Identity for GCS access (no service account JSON in prod)
- Rotate API keys quarterly
- Use separate keys for dev/staging/prod

### 5. Logging Policy

- **No content logging:** Never log `text`, `text_en`, or signed URLs
- **Metadata only:** Log `moment_id`, `timestamp`, `type`, `user_id` for debugging
- **Error messages:** Sanitize before logging (no PII)

**Example:**
```typescript
// ✅ Good:
console.log('Moment ingested', { moment_id, user_id, type });

// ❌ Bad:
console.log('Moment ingested', { text: doc.text, signedUrl });
```

### 6. Transport Security

- **TLS required:** All external API calls (OpenAI, ElevenLabs, Fireworks) use HTTPS
- **Elasticsearch:** Use `https://` for ES_HOST in production
- **GCS:** All signed URLs use HTTPS

### 7. Input Validation

- **Server-side:** All API routes validate input before processing
- **ES query sanitization:** No raw user input in ES DSL; use structured QueryPlan
- **File uploads:** Validate MIME types, size limits (future work)

## Threat Model

| Threat | Mitigation |
|--------|------------|
| **Cross-user data leakage** | Mandatory `user_id` filter in all ES queries |
| **Unauthorized GCS access** | Private bucket + signed URLs with short TTL |
| **XSS** | CSP headers + React auto-escaping |
| **CSRF** | SameSite cookies (future auth), CORS policies |
| **API key exposure** | `.env.local` gitignored, Secret Manager in prod |
| **Replay attacks** | Signed URLs expire after 10 min |
| **Content injection** | Server-side DSL build, no raw client queries |

## Incident Response

1. **API key compromise:**
   - Rotate key immediately in Secret Manager or `.env.local`
   - Restart app to pick up new key
   - Review logs for unauthorized usage

2. **Data breach:**
   - Revoke all signed URLs (they expire in 10 min)
   - Audit ES access logs for anomalous queries
   - Notify affected users (if multi-user)

3. **Vulnerability disclosure:**
   - Email: security@memora.example (placeholder)
   - Response SLA: 48 hours

## Compliance Notes

- **GDPR:** User data stored in GCS (EU region if needed); right to erasure via delete API (future)
- **HIPAA:** Not HIPAA-compliant (no BAA with cloud providers)
- **SOC 2:** Not audited (hackathon MVP)

## Future Hardening

- [ ] **Rate limiting:** Throttle API requests per user
- [ ] **Audit logs:** Structured logging to GCS or BigQuery
- [ ] **Encryption at rest:** Enable GCS CMEK (customer-managed encryption keys)
- [ ] **MFA:** Multi-factor auth for real user accounts
- [ ] **Penetration testing:** Third-party security audit

## Security Checklist (Production)

- [ ] All API keys in Secret Manager (not `.env.local`)
- [ ] GCS bucket is private (no public access)
- [ ] Elasticsearch uses HTTPS + authentication
- [ ] CSP headers enabled in middleware
- [ ] Signed URLs have short TTL (≤15 min)
- [ ] No content logging (only metadata)
- [ ] TLS enforced for all external APIs
- [ ] User isolation tested (cross-user query fails)
- [ ] `.env.local` not committed to git

---

**Last updated:** 2025-10-09  
**Contact:** security@memora.example (placeholder)
