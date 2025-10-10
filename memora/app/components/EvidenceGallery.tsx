"use client";
import React from 'react';
import type { EvidenceItem } from '@/lib/types';

type Props = { items: EvidenceItem[] };

export default function EvidenceGallery({ items }: Props) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex gap-3 overflow-x-auto">
      {items.slice(0, 8).map((it, idx) => (
        <a key={idx} href={it.signedUrl} target="_blank" rel="noreferrer" className="min-w-40 border rounded p-2 hover:bg-gray-50">
          {it.mime?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.thumbUrl || it.signedUrl} alt={it.name} className="h-24 object-cover rounded" />
          ) : (
            <div className="h-24 flex items-center justify-center bg-gray-100 rounded text-sm text-gray-600">{it.mime || it.kind}</div>
          )}
          <div className="mt-2 text-xs truncate" title={it.name}>{it.name}</div>
        </a>
      ))}
    </div>
  );
}
