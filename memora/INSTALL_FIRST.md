# ⚠️ IMPORTANT: Install Dependencies First!

## All TypeScript Errors Are Expected Before Installation

The TypeScript errors you're seeing are **completely normal** and will disappear after running `pnpm install`.

### Current Errors (Expected)

```
❌ Cannot find module 'next/server'
❌ Cannot find module '@elastic/elasticsearch'
❌ Cannot find module 'openai'
❌ Cannot find module 'react'
❌ Cannot find name 'process'
```

These errors exist because:
1. **No dependencies installed yet** - `node_modules/` doesn't exist
2. **No type definitions** - TypeScript can't find `@types/node`, `@types/react`, etc.

## Fix: Run Installation

```bash
cd /Users/luxin/Desktop/Hackathons/TechWeek2025/memora

# Install all dependencies
pnpm install
```

**After installation, all errors will resolve automatically.** ✅

## What Gets Installed

- `next` - Next.js framework
- `react` + `react-dom` - React library
- `@elastic/elasticsearch` - Elasticsearch client
- `@google-cloud/storage` - GCS client
- `openai` - OpenAI SDK
- `@types/node` - Node.js type definitions
- `@types/react` - React type definitions
- `typescript` - TypeScript compiler
- `tailwindcss` - CSS framework
- And more...

## Verification

After `pnpm install`, verify:

```bash
# Check node_modules exists
ls node_modules/

# Check TypeScript compiles
pnpm build
```

**Expected:** No TypeScript errors, successful build.

---

## Quick Start (Full Flow)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp infrastructure/example.env .env.local

# 3. Edit .env.local with your API keys
# (OPENAI_API_KEY, ELEVENLABS_API_KEY, FIREWORKS_API_KEY, etc.)

# 4. Start Elasticsearch
docker run -d --name memora-es -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0

# 5. Create index
pnpm create-index

# 6. Seed demo data
pnpm seed

# 7. Start dev server
pnpm dev
```

Open http://localhost:3000 🎉

---

**TL;DR: Run `pnpm install` first, then all errors disappear!**
