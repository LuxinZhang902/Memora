import { NextRequest, NextResponse } from 'next/server';
import { planQuery as llmPlan } from '../openai';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const plan = await llmPlan({ text: body.text || '' });
  return NextResponse.json({ plan });
}
