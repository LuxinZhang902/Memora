"use client";
import React from 'react';
import type { EvidenceItem } from '@/lib/types';

type Props = { items: EvidenceItem[] };

export default function EvidenceGallery({ items }: Props) {
  if (!items?.length) return null;
  
  return (
    <div className="glass rounded-2xl p-6 border border-green-500/30 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📎</span>
        <h3 className="text-lg font-semibold text-green-300">Evidence Gallery</h3>
        <span className="px-2 py-1 glass border border-green-500/30 rounded text-green-400 text-xs">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.slice(0, 8).map((it, idx) => (
          <a 
            key={idx} 
            href={it.signedUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="min-w-[160px] glass border border-gray-700 rounded-xl p-3 hover:border-green-500/50 transition-all duration-300 hover:glow-green group"
          >
            {it.mime?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={it.thumbUrl || it.signedUrl} 
                alt={it.name} 
                className="h-32 w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <div className="h-32 flex flex-col items-center justify-center glass rounded-lg text-sm text-gray-400 group-hover:text-green-400 transition-colors">
                <div className="text-3xl mb-2">📄</div>
                <div className="text-xs">{it.mime || it.kind}</div>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400 truncate group-hover:text-green-300 transition-colors" title={it.name}>
              {it.name}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
