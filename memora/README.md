# Memora

**Mission:** Make personal memories and life admin instantly answerable—with verifiable evidence—while staying private by default.

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **Elasticsearch** 8.x running locally or remote
- **Google Cloud Storage** bucket (private by default)
- API keys: OpenAI, ElevenLabs, Fireworks

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   Copy `infrastructure/example.env` to `.env.local` and fill in your keys:
   ```bash
   cp infrastructure/example.env .env.local
   ```

   | Variable | Description |
   |----------|-------------|
   | `OPENAI_API_KEY` | OpenAI API key for planner + answer composer |
   | `ELEVENLABS_API_KEY` | ElevenLabs API key for STT/TTS |
   | `FIREWORKS_API_KEY` | Fireworks API key for embeddings |
   | `ES_HOST` | Elasticsearch host (default: `http://localhost:9200`) |
   | `ES_USERNAME` / `ES_PASSWORD` | Elasticsearch credentials |
   | `GCP_PROJECT_ID` | Google Cloud project ID |
   | `GCS_BUCKET` | GCS bucket name (must be private) |
   | `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON (or use ADC) |
   | `DEMO_USER_ID` | Demo user ID for dev auth (default: `u_demo`) |

3. **Start Elasticsearch** (if local):
   ```bash
   docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.15.0
   ```

4. **Create Elasticsearch index:**
   ```bash
   pnpm create-index
   ```

5. **Seed demo data:**
   ```bash
   pnpm seed
   ```
   This creates two moments:
   - **Paris trip** (2023-05-20): photo, itinerary PDF, note
   - **DMV renewal** (2024-10-01): selfie, receipt PDF, note

6. **Start the dev server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Demo Flow

1. **Press "Speak"** or type a question:
   - _"When was the last time I went to Paris?"_
   - _"When did I renew my driver's license?"_

2. **Watch the pipeline:**
   - ElevenLabs STT → text
   - OpenAI planner → QueryPlan JSON
   - Elasticsearch → matching moment + artifacts
   - GCS signed URLs → evidence items
   - OpenAI composer → 2-sentence grounded answer

3. **View evidence:**
   - Photos, PDFs, notes displayed in gallery
   - Click to open signed URL in new tab

4. **Debug panel:**
   - Toggle to see QueryPlan, ES DSL, highlights, timings

## Architecture

```
User speaks → STT (ElevenLabs)
            ↓
         Text query
            ↓
    OpenAI planner → QueryPlan JSON
            ↓
    Elasticsearch search (user_id filter, lexical + future hybrid kNN)
            ↓
    Top moment + artifacts[]
            ↓
    GCS signed URLs (10 min TTL)
            ↓
    OpenAI composer → 2-sentence answer
            ↓
    Frontend: AnswerCard + EvidenceGallery
```

### Tech Stack

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind
- **Backend:** Next.js API routes (server-side orchestration)
- **AI/Audio:** ElevenLabs STT/TTS, OpenAI (planner + composer), Fireworks embeddings
- **Search:** Elasticsearch 8 (lexical first; designed for hybrid kNN later)
- **Storage:** Google Cloud Storage (private, signed URLs)
- **Security:** CSP headers, server-side ES queries, user_id filter, GCS private bucket

## Security Defaults

- **Private by default:** GCS bucket is private; all access via V4 signed URLs (10 min TTL)
- **User isolation:** Every ES query includes `filter: { term: { user_id } }`
- **Server-side only:** ES DSL built server-side; client never sends raw queries
- **CSP headers:** `default-src 'self'`, strict frame/referrer policies
- **No content logging:** Only metadata (moment_id, timestamp, type) logged; no text/URLs

See [SECURITY.md](./SECURITY.md) for details.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm create-index` | Create Elasticsearch index from mapping |
| `pnpm seed` | Seed demo moments (Paris trip, DMV renewal) |

## Project Structure

```
memora/
├── app/
│   ├── page.tsx              # Main UI: mic, input, answer, evidence
│   ├── layout.tsx            # Root layout (loads globals.css)
│   ├── globals.css           # Tailwind imports
│   ├── components/
│   │   ├── MicButton.tsx     # Record audio → STT
│   │   ├── AnswerCard.tsx    # 2-sentence answer + chips
│   │   ├── EvidenceGallery.tsx  # Horizontal strip of evidence items
│   │   └── DebugPanel.tsx    # Toggle to show plan/DSL/timings
│   └── api/
│       ├── plan/route.ts     # POST /api/plan → planQuery
│       ├── exec/route.ts     # POST /api/exec → executeQuery
│       ├── evidence/route.ts # POST /api/evidence → buildEvidence
│       ├── compose/route.ts  # POST /api/compose → composeAnswer
│       ├── stt/route.ts      # POST /api/stt → sttTranscribe
│       └── ingest/route.ts   # POST /api/ingest → ingestMoment
├── lib/
│   ├── types.ts              # QueryPlan, Artifact, MomentDoc, EvidenceItem, GroundedAnswer
│   ├── openai.ts             # planQuery, composeAnswer
│   ├── elevenlabs.ts         # transcribeWebm, textToSpeech
│   ├── fireworks.ts          # embedText
│   ├── es.ts                 # createIndexIfNotExists, upsertMoment, searchMoments
│   ├── gcs.ts                # signRead, signWrite
│   └── auth.ts               # requireUser (dev auth)
├── convex/
│   ├── convex.config.ts      # Minimal Convex schema
│   └── actions/
│       ├── planQuery.ts      # httpAction → OpenAI planner
│       ├── executeQuery.ts   # httpAction → ES search
│       ├── buildEvidence.ts  # httpAction → GCS signed URLs
│       ├── composeAnswer.ts  # httpAction → OpenAI composer
│       ├── ingestMoment.ts   # httpAction → embed + upsert ES
│       └── sttTranscribe.ts  # httpAction → ElevenLabs STT
├── scripts/
│   ├── create_index.ts       # Create ES index from mapping
│   └── seed_moments.ts       # Seed demo moments
├── infrastructure/
│   ├── es-mapping.json       # Elasticsearch mapping (nested artifacts, dense_vector)
│   ├── gcs-lifecycle.json    # GCS lifecycle policy (optional)
│   └── example.env           # Environment variable template
├── middleware.ts             # CSP + secure headers
├── next.config.js            # Next.js config (transpile convex, external packages)
├── package.json              # Dependencies + scripts
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
├── postcss.config.js         # PostCSS config
├── .gitignore                # Ignore .env.local, node_modules, .next
├── README.md                 # This file
└── SECURITY.md               # Security posture + best practices
```

## Roadmap / Stretch Goals

- [ ] **Hybrid retrieval:** kNN on `vector` field + lexical requery by IDs
- [ ] **ElevenLabs TTS:** "Play" button for final answer (store MP3 in GCS)
- [ ] **Real auth:** Replace `DEMO_USER_ID` with Convex auth or NextAuth
- [ ] **Multi-user:** Add user management, session tokens
- [ ] **Mobile app:** React Native + same backend
- [ ] **Incremental ingestion:** Watch folder, auto-ingest photos/files

## License

MIT (hackathon MVP)
