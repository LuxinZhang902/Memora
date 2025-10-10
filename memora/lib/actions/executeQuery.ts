import { NextRequest, NextResponse } from 'next/server';
import { searchMoments, hybridSearch, indexNameFromPrefix } from '../es';
import { requireUser } from '../auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = requireUser();
  
  // Use hybrid search if query text is provided, otherwise fall back to legacy search
  const useHybridSearch = body.queryText && body.queryText.trim().length > 0;
  
  if (useHybridSearch) {
    console.log('[ExecuteQuery] Using hybrid search for:', body.queryText);
    const result = await hybridSearch({ 
      userId, 
      plan: body.plan,
      queryText: body.queryText 
    });
    return NextResponse.json(result);
  } else {
    // Legacy search (backward compatibility)
    const index = indexNameFromPrefix();
    const { dsl, hit, highlights, artifacts } = await searchMoments({ index, userId, plan: body.plan });
    return NextResponse.json({ dsl, hit, highlights, artifacts });
  }
}
