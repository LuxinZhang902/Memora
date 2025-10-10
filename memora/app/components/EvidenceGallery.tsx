"use client";
import React from 'react';
import type { EvidenceItem } from '@/lib/types';

type Props = { items: EvidenceItem[] };

export default function EvidenceGallery({ items }: Props) {
  if (!items?.length) return null;
  
  return (
    <div className="glass rounded-2xl p-8 border border-gray-700 space-y-6 hover:border-gray-600 transition-all">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">📎</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-400 uppercase tracking-wider">Evidence Gallery</h3>
          <p className="text-sm text-gray-500">Source documents</p>
        </div>
        <div className="px-3 py-1 glass border border-gray-600 rounded-lg">
          <span className="text-white font-semibold">{items.length}</span>
          <span className="text-gray-400 text-sm ml-1">{items.length === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.slice(0, 8).map((it, idx) => (
          <div key={idx} className="min-w-[280px] max-w-[280px] flex-shrink-0">
            <a 
              href={it.signedUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="block glass border border-gray-700 rounded-xl p-3 hover:border-green-500/50 transition-all duration-300 hover:glow-green group"
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
            
            {/* Show highlight for documents/PDFs */}
            {it.highlight && (it.mime?.includes('pdf') || it.mime?.includes('document') || it.mime?.includes('word')) && (
              <div className="mt-2 p-2 glass border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-green-400">✨ Relevant excerpt:</span>
                </div>
                <div 
                  className="text-xs text-gray-300 line-clamp-3"
                  dangerouslySetInnerHTML={{ 
                    __html: it.highlight.replace(/<mark>/g, '<mark class="bg-green-500/30 text-green-200 px-1 rounded">') 
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
