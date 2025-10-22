# Memora - Your Personal Memory Search Engine

**Never forget anything again.** Memora transforms your personal files, photos, and documents into an instantly searchable knowledge base with AI-powered answers backed by verifiable evidence.

![Memora Demo](Image%20Docs/Screenshot%202025-10-10%20at%203.03.15%20PM.png)

## 🎯 What is Memora?

Memora is a **voice-first personal memory assistant** that lets you ask questions about your life and get accurate, evidence-backed answers. Upload your documents, photos, and notes, then simply ask:

- _"When did I celebrate my birthday this year?"_
- _"When was I near San Francisco port?"_
- _"When did I renew my driver's license?"_

Memora searches through all your uploaded content—including text inside PDFs, Word documents, and even images with OCR—and returns precise answers with visual evidence.

## ✨ Key Features

### 🎤 Voice-First Interface

- **Speak naturally** or type your questions
- **Real-time transcription** using DedalusLabs Speech-to-Text
- **Hands-free interaction** for quick queries on the go

### 🔍 Intelligent Hybrid Search

- **Keyword Search (BM25)** - Traditional text matching with fuzzy search for typos
- **Semantic Search (Vector)** - Understands meaning using Fireworks AI embeddings
- **Cross-Index Search** - Searches both moments and file contents simultaneously
- **Smart Ranking** - Combines scores for the most relevant results

### 📄 Deep Content Understanding

- **PDF Extraction** - Reads text from PDF documents
- **Word Document Processing** - Extracts content from .docx files
- **Image OCR** - Recognizes text in photos using DedalusLabs Vision API
- **EXIF Metadata** - Extracts GPS location and timestamps from photos

### 🎯 Grounded AI Answers

- **Evidence-Based Responses** - Every answer cites specific files
- **Visual Evidence Gallery** - See the source documents that support each answer
- **No Hallucinations** - Answers are grounded in your actual data

### 🔒 Privacy-First Design

- **Private by Default** - All data stored securely in Google Cloud Storage
- **User Isolation** - Your data is completely separate from other users
- **Temporary Access** - Signed URLs expire after 10 minutes
- **No Data Sharing** - Your personal information never leaves your control

## 🛠 Tech Stack

### Frontend

- **Next.js 14** (App Router) - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern, responsive UI styling
- **React Hooks** - State management and side effects

### Backend & APIs

- **Next.js API Routes** - Server-side orchestration
- **DedalusLabs AI**:
  - LLM for query planning and answer composition
  - Vision API for image OCR
  - Speech-to-Text for voice queries
- **Fireworks AI** - Text embeddings (nomic-embed-text-v1.5) for semantic search
- **ElevenLabs** - Fallback Speech-to-Text

### Search & Storage

- **Elasticsearch 8** - Hybrid search engine (BM25 + vector similarity)
- **Google Cloud Storage** - Private file storage with signed URLs
- **Vector Embeddings** - 768-dimensional semantic vectors

### Content Processing

- **Mammoth.js** - Word document (.docx) extraction
- **EXIF Parser** - Image metadata extraction
- **DedalusLabs Vision** - OCR for images
- **PDF.js** - PDF text extraction (with webpack compatibility challenges)

## 📦 Installation & Setup

### Prerequisites

- **Node.js** 18+ and **npm**
- **Elasticsearch** 8.x (local or cloud)
- **Google Cloud Storage** bucket
- **API Keys**:
  - DedalusLabs API key
  - Fireworks AI API key
  - ElevenLabs API key (optional, for fallback STT)

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/LuxinZhang902/Memora.git
   cd Memora/memora
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create `.env.local` in the `memora/` directory:

   ```env
   # AI Services
   DEDALUS_API_KEY=your_dedalus_key
   DEDALUS_API_URL=https://api.dedaluslabs.ai/v1
   FIREWORKS_API_KEY=your_fireworks_key
   ELEVENLABS_API_KEY=your_elevenlabs_key

   # Elasticsearch
   ES_HOST=http://localhost:9200
   ES_USERNAME=elastic
   ES_PASSWORD=changeme

   # Google Cloud Storage
   GCP_PROJECT_ID=your-project-id
   GCS_BUCKET=your-bucket-name
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

   # Auth (for development)
   DEMO_USER_ID=user-demo
   ```

4. **Start Elasticsearch** (if running locally):

   ```bash
   docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.15.0
   ```

5. **Create Elasticsearch indices:**

   ```bash
   npm run create-index
   ```

6. **Start the development server:**

   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Building Your Memory

1. **Click "Build My Memory"** button
2. **Upload files:**
   - Documents (.docx, .txt)
   - Images (.jpg, .png)
   - PDFs (.pdf - note: use .docx for better results)
3. **Add a description** (optional)
4. **Click "Upload"**

The system will:

- Extract text from documents
- Perform OCR on images
- Generate semantic embeddings
- Index everything for instant search

### Asking Questions

1. **Click the microphone button** or type in the search box
2. **Ask naturally:**
   - "When did I last visit San Francisco?"
   - "What did I do on my birthday?"
   - "When did I renew my driver's license?"
3. **View the answer** with cited evidence
4. **Click on files** in the Evidence Gallery to view full content

### Managing Files

- **View all files** on the Files page
- **Edit descriptions** by clicking the edit icon
- **Delete files** by clicking the delete icon
- **Re-upload** if extraction failed

## 🎨 Screenshots

### Main Search Interface

![Main Interface](Image%20Docs/Screenshot%202025-10-10%20at%203.03.15%20PM.png)

### Birthday Query Example

![Birthday Query](Image%20Docs/Celebrate%20Birthday.png)

### San Francisco Port Query

![SF Port Query](Image%20Docs/SF%20Port%20Case.png)

### Updated Evidence Gallery

![Evidence Gallery](Image%20Docs/updated%20evidence%20of%20gallery.png)

## 🔐 Security & Privacy

- **Private Storage** - All files stored in private GCS bucket
- **Signed URLs** - Temporary access (10 min expiration)
- **User Isolation** - Every query filtered by user_id
- **Server-Side Processing** - No sensitive data exposed to client
- **No API Key Exposure** - All API calls made server-side
- **Content Security Policy** - Strict CSP headers prevent XSS

## 🐛 Known Issues & Limitations

### PDF Extraction

- **Issue:** PDF text extraction fails due to webpack bundling issues with `pdf-parse` and `pdfjs-dist`
- **Workaround:** Use `.docx` or `.txt` files instead of PDFs
- **Status:** Investigating alternative PDF libraries or external extraction service

### Image GPS Data

- **Issue:** Some images may not have GPS EXIF data (stripped by editing apps)
- **Workaround:** Add location manually in file description
- **Status:** Working as designed (depends on source image)

### DedalusLabs STT 404

- **Issue:** DedalusLabs STT endpoint returns 404
- **Workaround:** System automatically falls back to ElevenLabs STT
- **Status:** Investigating correct endpoint configuration

## 🤝 Contributing

This is a hackathon MVP. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built with:

- **DedalusLabs** - LLM, Vision API, and Speech-to-Text
- **Fireworks AI** - Fast text embeddings
- **ElevenLabs** - Fallback Speech-to-Text
- **Elasticsearch** - Powerful hybrid search
- **Google Cloud** - Secure file storage
- **Next.js** - Modern web framework

---

**Made with ❤️ for TechWeek 2025 Hackathon**
