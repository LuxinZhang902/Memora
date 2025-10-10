"use client";
import React, { useState } from 'react';

type Props = { plan?: any; dsl?: any; timings?: Record<string, number>; highlights?: string[] };

export default function DebugPanel({ plan, dsl, timings, highlights }: Props) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="glass rounded-2xl p-4 border border-gray-700/50">
      <button 
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-lg">{open ? '🔽' : '▶️'}</span>
        <span className="font-medium">{open ? 'Hide' : 'Show'} Debug Panel</span>
      </button>
      
      {open && (
        <div className="mt-4 space-y-4">
          {/* Plan */}
          <div className="glass rounded-lg p-4 border border-blue-500/30">
            <div className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <span>🎯</span> Query Plan
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-48 bg-black/30 p-3 rounded">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
          
          {/* DSL */}
          <div className="glass rounded-lg p-4 border border-purple-500/30">
            <div className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <span>🔍</span> Elasticsearch DSL
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-48 bg-black/30 p-3 rounded">
              {JSON.stringify(dsl, null, 2)}
            </pre>
          </div>
          
          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="glass rounded-lg p-4 border border-yellow-500/30">
              <div className="font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                <span>✨</span> Highlights
              </div>
              <ul className="space-y-1">
                {highlights.map((h, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>{h.replace(/<[^>]*>/g, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Timings */}
          {timings && (
            <div className="glass rounded-lg p-4 border border-green-500/30">
              <div className="font-semibold text-green-300 mb-2 flex items-center gap-2">
                <span>⏱️</span> Performance Timings
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(timings).map(([key, value]) => (
                  <div key={key} className="flex justify-between glass rounded p-2 border border-green-500/20">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-green-300 font-mono">{value}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
