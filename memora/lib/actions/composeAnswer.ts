import { NextRequest, NextResponse } from 'next/server';
import { composeAnswer } from '../dedalus';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const answer = await composeAnswer({ query: body.query, hit: body.hit, highlights: body.highlights || [], evidence: body.evidence || [] });
  return NextResponse.json({ answer });
}
