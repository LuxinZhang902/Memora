# DedalusLabs Migration Guide

This document describes the migration from OpenAI to DedalusLabs API.

## What Changed

All OpenAI API calls have been replaced with DedalusLabs API calls:

### 1. **Query Planning** (`lib/dedalus.ts`)

- Function: `planQuery()`
- Replaces: OpenAI GPT-4o-mini for query understanding
- Model: `gpt-4o-mini` (configurable via `DEDALUS_PLANNER_MODEL`)

### 2. **Answer Composition** (`lib/dedalus.ts`)

- Function: `composeAnswer()`
- Replaces: OpenAI GPT-4o-mini for answer generation
- Model: `gpt-4o-mini` (configurable via `DEDALUS_ANSWER_MODEL`)

### 3. **Image OCR** (`lib/contentExtractor.ts`)

- Function: `extractImageText()`
- Replaces: OpenAI Vision (GPT-4V) for text extraction from images
- Model: `dedalus-vision` (configurable via `DEDALUS_VISION_MODEL`)

### 4. **Speech-to-Text** (`lib/actions/sttTranscribe.ts`)

- Function: `transcribeAudio()`
- Replaces: OpenAI Whisper for audio transcription
- Model: `dedalus-whisper` (configurable via `DEDALUS_STT_MODEL`)
- Fallback: ElevenLabs STT (if DedalusLabs fails)

## Configuration

Add these environment variables to your `.env.local`:

```bash
# DedalusLabs API
DEDALUS_API_KEY=dsk_live_4b96cbc7c175_606560d4c0eaca51319d8064e995fa31
DEDALUS_API_URL=https://api.dedaluslabs.ai/v1

# Optional: Custom model names
DEDALUS_PLANNER_MODEL=gpt-4o-mini
DEDALUS_ANSWER_MODEL=gpt-4o-mini
DEDALUS_VISION_MODEL=dedalus-vision
DEDALUS_STT_MODEL=dedalus-whisper
```

## Files Modified

1. **`lib/dedalus.ts`** (NEW)

   - DedalusLabs API client
   - All LLM operations

2. **`lib/actions/composeAnswer.ts`**

   - Import changed from `openai.ts` to `dedalus.ts`

3. **`lib/actions/planQuery.ts`**

   - Import changed from `openai.ts` to `dedalus.ts`

4. **`lib/contentExtractor.ts`**

   - `extractImageWithOpenAI()` → `extractImageWithDedalus()`
   - Uses DedalusLabs Vision API

5. **`lib/actions/sttTranscribe.ts`**

   - OpenAI Whisper → DedalusLabs STT
   - Fallback to ElevenLabs maintained

6. **`infrastructure/example.env`**
   - Updated with DedalusLabs configuration

## API Compatibility

The DedalusLabs client (`lib/dedalus.ts`) is designed to be compatible with OpenAI's API format:

- **Chat Completions**: `POST /chat/completions`
- **Audio Transcriptions**: `POST /audio/transcriptions`
- **Response Format**: Same as OpenAI (choices, message, content)

If your DedalusLabs API has a different format, you may need to adjust the `callDedalus()` function in `lib/dedalus.ts`.

## Testing

1. Set your `DEDALUS_API_KEY` in `.env.local`
2. Restart the dev server
3. Test the following features:
   - Ask a question (tests query planning + answer composition)
   - Upload an image (tests vision OCR)
   - Record audio (tests speech-to-text)

## Rollback

If you need to rollback to OpenAI:

1. Revert imports in:
   - `lib/actions/composeAnswer.ts`
   - `lib/actions/planQuery.ts`
2. Restore `extractImageWithOpenAI()` in `lib/contentExtractor.ts`
3. Restore OpenAI Whisper in `lib/actions/sttTranscribe.ts`
4. Set `OPENAI_API_KEY` in `.env.local`

## Notes

- ElevenLabs is still used as a fallback for STT
- Fireworks AI is still used for embeddings
- All error handling is maintained with graceful fallbacks
