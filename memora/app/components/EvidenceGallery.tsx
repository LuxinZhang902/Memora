"use client";
import React from 'react';
import type { EvidenceItem } from '@/lib/types';

type Props = { items: EvidenceItem[] };

export default function EvidenceGallery({ items }: Props) {
  if (!items?.length) return null;
  
  return (
    <div className="relative group/gallery">
      {/* Subtle border glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-3xl opacity-50 group-hover/gallery:opacity-70 blur transition duration-1000"></div>
      
      <div className="relative bg-black/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-gray-700 space-y-6 hover:border-gray-600 transition-all">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">📎</span>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Evidence Gallery</h3>
            <p className="text-sm text-gray-400">Source documents that support this answer</p>
          </div>
          <div className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl">
            <span className="text-white font-bold text-lg">{items.length}</span>
            <span className="text-gray-400 text-sm ml-1">{items.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.slice(0, 8).map((it, idx) => {
          // Get user-friendly file type
          const getFileType = (mime?: string, name?: string) => {
            if (mime?.includes('pdf')) return 'PDF';
            if (mime?.includes('word') || mime?.includes('document')) return 'Document';
            if (mime?.includes('sheet') || mime?.includes('excel')) return 'Spreadsheet';
            if (mime?.includes('presentation') || mime?.includes('powerpoint')) return 'Presentation';
            if (name?.endsWith('.docx') || name?.endsWith('.doc')) return 'Document';
            if (name?.endsWith('.xlsx') || name?.endsWith('.xls')) return 'Spreadsheet';
            if (name?.endsWith('.pptx') || name?.endsWith('.ppt')) return 'Presentation';
            return 'File';
          };

          return (
          <div key={idx} className="min-w-[280px] max-w-[280px] flex-shrink-0">
            <a 
              href={it.signedUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="block bg-gray-900/50 border border-gray-700 rounded-lg p-2 hover:border-gray-500 transition-all duration-300 group"
            >
              {it.mime?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={it.thumbUrl || it.signedUrl} 
                  alt={it.name} 
                  className="h-40 w-full object-cover rounded group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="h-40 flex flex-col items-center justify-center bg-gray-800/50 rounded text-sm text-gray-400 group-hover:text-white transition-colors">
                  <div className="text-xl mb-1">📄</div>
                  <div className="text-xs text-gray-500">{getFileType(it.mime, it.name)}</div>
                </div>
              )}
              <div className="mt-1.5 text-xs text-gray-400 truncate group-hover:text-white transition-colors" title={it.name}>
                {it.name}
              </div>
            </a>
            
            {/* Show highlight for documents/PDFs */}
            {it.highlight && (it.mime?.includes('pdf') || it.mime?.includes('document') || it.mime?.includes('word')) && (
              <div className="mt-2 p-3 glass border border-green-500/30 rounded-lg bg-black/30">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-white font-semibold">✨ Relevant excerpt:</span>
                </div>
                <div 
                  className="text-xs text-white line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: it.highlight.replace(/<mark>/g, '<mark class="bg-green-500/40 text-white font-semibold px-1 rounded">') 
                  }}
                />
              </div>
            )}
          </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
