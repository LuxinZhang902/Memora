import OpenAI from 'openai';
import type { GroundedAnswer, QueryPlan } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function planQuery(input: { text: string; language?: string }): Promise<QueryPlan> {
  const model = process.env.OPENAI_PLANNER_MODEL || 'gpt-4o-mini';
  const sys = `You output ONLY valid JSON for a QueryPlan. If unsure, return defaults.`;
  const user = `Text: ${input.text}`;
  try {
    const res = await client.chat.completions.create({
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
  } catch {
    return { time_intent: 'last', entities: [], sort: 'desc', size: 1 } as QueryPlan;
  }
}

export async function composeAnswer(input: {
  query: string;
  hit: any;
  highlights: string[];
  evidence: { kind: string; name: string }[];
}): Promise<GroundedAnswer> {
  const model = process.env.OPENAI_ANSWER_MODEL || 'gpt-4o-mini';
  const sys = `Answer strictly in 2 sentences. Use only provided facts. If unknown, say you can't tell.`;
  const facts = {
    title: input.hit?._source?.title,
    text: input.hit?._source?.text,
    text_en: input.hit?._source?.text_en,
    when: input.hit?._source?.timestamp,
    location: input.hit?._source?.geo,
    highlights: input.highlights,
    evidence: input.evidence?.map((e) => ({ kind: e.kind, name: e.name })),
  };
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system' as const, content: sys },
    { role: 'user' as const, content: `Question: ${input.query}\nFacts: ${JSON.stringify(facts)}` },
  ];
  const res = await client.chat.completions.create({ model, messages });
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
