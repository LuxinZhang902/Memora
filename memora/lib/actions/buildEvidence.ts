import { NextRequest, NextResponse } from 'next/server';
import { signRead } from '../gcs';
import type { Artifact, EvidenceItem } from '../types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const arts = (body.artifacts || []) as Artifact[];
  const items: EvidenceItem[] = [];
  for (const a of arts.slice(0, 8)) {
    const signedUrl = await signRead(a.gcs_path, 10);
    const thumbUrl = a.thumb ? await signRead(a.thumb, 10) : undefined;
    items.push({ kind: a.kind, name: a.name || a.gcs_path.split('/').pop() || 'file', signedUrl, thumbUrl, mime: a.mime });
  }
  return NextResponse.json({ evidence: items });
}
