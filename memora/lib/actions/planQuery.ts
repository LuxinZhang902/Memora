import { NextRequest, NextResponse } from 'next/server';
import { planQuery } from '../dedalus';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const plan = await planQuery({ text: body.text || '' });
  return NextResponse.json({ plan });
}
