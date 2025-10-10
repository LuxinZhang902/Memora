import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const formData = new FormData();
  formData.append('audio', file, 'audio.webm');
  const out = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });
  const json = await out.json();
  return NextResponse.json({ text: json?.text || '', language: json?.language });
}
