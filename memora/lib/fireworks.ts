export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  const model = process.env.FIREWORKS_EMBED_MODEL || 'nomic-ai/nomic-embed-text-v1.5';
  const res = await fetch(`https://api.fireworks.ai/inference/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error('Fireworks embeddings failed');
  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  return Array.isArray(vec) ? vec : [];
}
