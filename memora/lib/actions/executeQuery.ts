import { NextRequest, NextResponse } from 'next/server';
import { searchMoments, indexNameFromPrefix } from '../es';
import { requireUser } from '../auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = requireUser();
  const index = indexNameFromPrefix();
  const { dsl, hit, highlights, artifacts } = await searchMoments({ index, userId, plan: body.plan });
  return NextResponse.json({ dsl, hit, highlights, artifacts });
}
