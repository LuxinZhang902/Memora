export async function transcribeWebm(blob: Blob): Promise<{ text: string; language?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form as any,
  });
  if (!res.ok) throw new Error('STT failed');
  const data = await res.json();
  return { text: data?.text || '', language: data?.language };
}

export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'Rachel';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': apiKey || '' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error('TTS failed');
  return await res.arrayBuffer();
}
