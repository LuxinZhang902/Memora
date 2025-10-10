"use client";
import React from 'react';
import type { GroundedAnswer } from '@/lib/types';

type Props = { answer?: GroundedAnswer; loading?: boolean; onPlay?: () => void };

export default function AnswerCard({ answer, loading, onPlay }: Props) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 border border-blue-500/30 shimmer">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
          <span className="text-blue-400 font-medium">✨ Generating answer...</span>
        </div>
      </div>
    );
  }
  
  if (!answer) {
    return (
      <div className="glass rounded-2xl p-8 border border-gray-700/50 text-center">
        <div className="text-gray-500 text-lg">💭 Ask a question to unlock your memories</div>
      </div>
    );
  }
  
  return (
    <div className="glass rounded-2xl p-6 border border-purple-500/30 space-y-4 glow-purple">
      <div className="flex items-start gap-3">
        <div className="text-3xl">💡</div>
        <div className="flex-1">
          <div className="text-xl text-white leading-relaxed">{answer.answerText}</div>
        </div>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {answer.when && (
          <span className="px-4 py-2 glass border border-blue-500/30 rounded-lg text-blue-300 text-sm font-medium">
            📅 {answer.when}
          </span>
        )}
        {answer.location && (answer.location.city || answer.location.country) && (
          <span className="px-4 py-2 glass border border-green-500/30 rounded-lg text-green-300 text-sm font-medium">
            📍 {[answer.location.city, answer.location.country].filter(Boolean).join(', ')}
          </span>
        )}
      </div>
      
      {onPlay && (
        <div className="pt-2">
          <button 
            onClick={onPlay} 
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium transition-all duration-300 glow-green"
          >
            🔊 Play Audio
          </button>
        </div>
      )}
    </div>
  );
}
