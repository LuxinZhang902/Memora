import { NextRequest, NextResponse } from 'next/server';
import { composeAnswer as llmAnswer } from '../openai';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const answer = await llmAnswer({ query: body.query, hit: body.hit, highlights: body.highlights || [], evidence: body.evidence || [] });
  return NextResponse.json({ answer });
}
