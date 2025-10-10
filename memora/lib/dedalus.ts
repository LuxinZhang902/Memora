/**
 * DedalusLabs API Client
 * Replaces OpenAI for LLM operations
 */

import type { GroundedAnswer, QueryPlan } from './types';

const DEDALUS_API_URL = process.env.DEDALUS_API_URL || 'https://api.dedaluslabs.ai/v1';
const DEDALUS_API_KEY = process.env.DEDALUS_API_KEY;

interface DedalusCompletionRequest {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  response_format?: { type: 'json_object' | 'text' };
  max_tokens?: number;
  temperature?: number;
}

interface DedalusCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

async function callDedalus(request: DedalusCompletionRequest): Promise<DedalusCompletionResponse> {
  const response = await fetch(`${DEDALUS_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEDALUS_API_KEY}`,
    },
    body: JSON.stringify({
      model: request.model || 'gpt-4o-mini',
      messages: request.messages,
      response_format: request.response_format,
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DedalusLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function planQuery(input: { text: string; language?: string }): Promise<QueryPlan> {
  const model = process.env.DEDALUS_PLANNER_MODEL || 'gpt-4o-mini'; // Use compatible model name
  const sys = `You output ONLY valid JSON for a QueryPlan. If unsure, return defaults.`;
  const user = `Text: ${input.text}`;
  
  try {
    const res = await callDedalus({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    });
    
    const content = res.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const plan: QueryPlan = {
      time_intent: parsed.time_intent || 'last',
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      filters: parsed.filters || undefined,
      must_text: parsed.must_text || undefined,
      sort: parsed.sort === 'asc' ? 'asc' : 'desc',
      size: typeof parsed.size === 'number' ? parsed.size : 1,
    };
    return plan;
  } catch (error) {
    console.error('[DedalusLabs] Query planning failed:', error);
    return { time_intent: 'last', entities: [], sort: 'desc', size: 1 } as QueryPlan;
  }
}

export async function composeAnswer(input: {
  query: string;
  hit: any;
  highlights: string[];
  evidence: { kind: string; name: string }[];
  fileContent?: any;
}): Promise<GroundedAnswer> {
  const model = process.env.DEDALUS_ANSWER_MODEL || 'gpt-4o-mini'; // Use compatible model name
  
  console.log('[ComposeAnswer] ========== COMPOSING ANSWER ==========');
  console.log('[ComposeAnswer] Query:', input.query);
  console.log('[ComposeAnswer] Has hit:', !!input.hit);
  console.log('[ComposeAnswer] File content available:', !!input.fileContent);
  
  if (input.fileContent) {
    console.log('[ComposeAnswer] *** FILE CONTENT FOUND ***');
    console.log('[ComposeAnswer] File name:', input.fileContent.file_name);
    console.log('[ComposeAnswer] Has extracted_text:', !!input.fileContent.extracted_text);
    if (input.fileContent.extracted_text) {
      console.log('[ComposeAnswer] Text preview:', input.fileContent.extracted_text.substring(0, 150));
    }
  } else {
    console.log('[ComposeAnswer] *** NO FILE CONTENT ***');
  }
  
  const sys = `Answer strictly in 2 sentences. Use only provided facts. If unknown, say you can't tell. If the answer comes from a file, quote the relevant content.`;
  const facts = {
    title: input.hit?._source?.title,
    text: input.hit?._source?.text,
    text_en: input.hit?._source?.text_en,
    when: input.hit?._source?.timestamp,
    location: input.hit?._source?.geo,
    highlights: input.highlights,
    evidence: input.evidence?.map((e) => ({ kind: e.kind, name: e.name })),
    // Include file content if available
    file_content: input.fileContent ? {
      file_name: input.fileContent.file_name,
      extracted_text: input.fileContent.extracted_text,
      created_at: input.fileContent.created_at,
      metadata: input.fileContent.metadata,
    } : undefined,
  };
  
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system' as const, content: sys },
    { role: 'user' as const, content: `Question: ${input.query}\nFacts: ${JSON.stringify(facts)}` },
  ];
  
  const res = await callDedalus({ model, messages });
  const answerText = (res.choices[0]?.message?.content || '').split(/\n/).join(' ').trim();
  
  return {
    question: input.query,
    answerText: answerText.slice(0, 600),
    when: facts.when,
    location: facts.location,
    evidence: input.evidence as any,
    highlights: input.highlights,
  };
}

/**
 * Vision API for image OCR
 */
export async function extractImageText(buffer: Buffer, mimeType: string): Promise<string> {
  const base64Image = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  
  const res = await callDedalus({
    model: process.env.DEDALUS_VISION_MODEL || 'gpt-4o-mini', // Use compatible model name
    messages: [
      {
        role: 'user',
        content: `Extract all visible text from this image. Return only the text, no commentary.\n\nImage: ${dataUrl}`,
      },
    ],
  });
  
  return res.choices[0]?.message?.content || '';
}

/**
 * Speech-to-Text transcription
 */
export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  formData.append('file', blob, filename);
  formData.append('model', process.env.DEDALUS_STT_MODEL || 'whisper-1'); // Use compatible model name
  
  const response = await fetch(`${DEDALUS_API_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEDALUS_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`DedalusLabs STT error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.text || '';
}
