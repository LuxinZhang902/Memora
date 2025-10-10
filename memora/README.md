# Memora

**Mission:** Make personal memories and life admin instantly answerable—with verifiable evidence—while staying private by default.

![Memora Interface](docs/images/memora-screenshot.png)
*Memora's hybrid search finding relevant documents through semantic understanding*

## Features

- 🎤 **Voice-First Interface** - Speak naturally or type your questions
- 🔍 **Hybrid Search** - Combines keyword (BM25) + semantic vector search for accurate results
- 📄 **File Content Search** - Searches inside uploaded documents (PDFs, DOCX, images with OCR)
- 🎯 **Grounded Answers** - AI responses cite specific files and content
- 🔒 **Private by Default** - All data stored securely with user isolation
- 📎 **Evidence Gallery** - View source documents that support each answer

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

### Query Flow

```
User speaks → STT (ElevenLabs)
            ↓
         Text query
            ↓
    OpenAI planner → QueryPlan JSON
            ↓
    Hybrid Search (Elasticsearch)
    ├─ Moments Index (BM25 + Vector)
    └─ File Contents Index (BM25 + Vector)
            ↓
    Result Fusion (score-based ranking)
            ↓
    Top moment + artifacts[] + file content
            ↓
    GCS signed URLs (10 min TTL)
            ↓
    OpenAI composer → 2-sentence answer (with file context)
            ↓
    Frontend: AnswerCard + EvidenceGallery
```

### Hybrid Search Implementation

Memora uses a sophisticated hybrid search that combines:

1. **Keyword Search (BM25)** - Traditional text matching with fuzzy search for typos
2. **Semantic Search (Vector)** - Understands meaning using embeddings (nomic-embed-text-v1.5)
3. **Cross-Index Search** - Searches both moments and file contents simultaneously
4. **Score Fusion** - Ranks results by combined relevance score

**Example Query Flow:**
```
Query: "When did I renew my driver license?"
  ↓
[ES] ========== HYBRID SEARCH STARTING ==========
[ES] Query text: When is the last time I renew my driver license?
[ES] Has query vector: true
[ES] DSL saved to: logs/hybrid-search-2025-10-10T21-53-28-176Z.json
  ↓
[ES] ========== HYBRID SEARCH RESULTS ==========
[ES] Found: 0 moments, 1 files
[ES] *** TOP FILE MATCH ***
[ES] File name: my_note_driver_lisence.docx
[ES] Score: 0.79
[ES] Text preview: May.6 Preparation for driver license...
  ↓
[ES] *** RETURNING FILE-BASED RESULT ***
[ES] File content included: true
  ↓
[ComposeAnswer] ========== COMPOSING ANSWER ==========
[ComposeAnswer] *** FILE CONTENT FOUND ***
[ComposeAnswer] File name: my_note_driver_lisence.docx
[ComposeAnswer] Text preview: May.6 Preparation for driver license
                              Old driver license
                              Proof of current living address
  ↓
Answer: "You prepared for your driver license renewal on May 6, 
         as documented in 'my_note_driver_lisence.docx'."
```

**Key Features:**
- Finds semantically related content even without exact keyword matches
- Searches extracted text from PDFs, DOCX, and images (OCR)
- Generates embeddings for semantic similarity
- Falls back gracefully if vector search unavailable
- Logs detailed search flow for debugging

See [HYBRID_SEARCH_IMPLEMENTATION.md](./HYBRID_SEARCH_IMPLEMENTATION.md) for technical details.

### Tech Stack

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind
- **Backend:** Next.js API routes (server-side orchestration)
- **AI/Audio:** ElevenLabs STT/TTS, DedalusLabs LLM (planner + composer), Fireworks embeddings (nomic-embed-text-v1.5)
- **Search:** Elasticsearch 8 with hybrid search (BM25 + vector similarity via cosineSimilarity)
- **Storage:** Google Cloud Storage (private, signed URLs with 10min TTL)
- **Content Extraction:** PDF.js (PDFs), Mammoth (DOCX), EXIF-parser (images), DedalusLabs Vision (OCR)
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

## Roadmap

### ✅ Completed
- [x] **Hybrid retrieval:** BM25 + vector similarity search across moments and file contents
- [x] **File content extraction:** PDFs, DOCX, images with OCR
- [x] **Semantic search:** Vector embeddings for meaning-based matching
- [x] **File management:** Upload, view, edit, delete files with metadata

### 🚧 In Progress
- [ ] **User ID consistency:** Fix DEMO_USER_ID vs authenticated user mismatch
- [ ] **Reranking:** Add reranker model for better result ordering

### 📋 Planned
- [ ] **ElevenLabs TTS:** "Play" button for final answer (store MP3 in GCS)
- [ ] **Real auth:** Replace `DEMO_USER_ID` with proper authentication
- [ ] **Multi-user:** Add user management, session tokens
- [ ] **Mobile app:** React Native + same backend
- [ ] **Incremental ingestion:** Watch folder, auto-ingest photos/files
- [ ] **Multi-modal search:** CLIP embeddings for image content search

## License

MIT (hackathon MVP)
