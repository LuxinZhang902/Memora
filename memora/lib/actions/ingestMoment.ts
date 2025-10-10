import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { embedText } from '../fireworks';
import { upsertMoment, indexNameFromPrefix } from '../es';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const now = new Date();
  const ts = body.timestamp || now.toISOString();
  const id = body.moment_id || randomUUID();
  const index = indexNameFromPrefix();
  const vector = body.text || body.text_en ? await embedText(body.text_en || body.text) : [];
  const doc = { ...body, timestamp: ts, moment_id: id, vector };
  await upsertMoment(index, id, doc);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const gcs_uri = `gs://${process.env.GCS_BUCKET}/users/${body.userId}/moments/${year}/${month}/${day}/${id}/moment.json`;
  return NextResponse.json({ moment_id: id, gcs_uri });
}
