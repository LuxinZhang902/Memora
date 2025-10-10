"use client";
import React from 'react';
import type { GroundedAnswer } from '@/lib/types';

type Props = { answer?: GroundedAnswer; loading?: boolean; onPlay?: () => void };

export default function AnswerCard({ answer, loading, onPlay }: Props) {
  if (loading) {
    return (
      <div className="glass rounded-3xl p-8 border-2 border-blue-500/40 shimmer relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
            <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full"></div>
          </div>
          <span className="text-blue-300 font-semibold text-lg">✨ Generating your answer...</span>
        </div>
      </div>
    );
  }
  
  if (!answer) {
    return null;
  }
  
  return (
    <div className="glass rounded-2xl p-8 border border-gray-700 space-y-6 hover:border-gray-600 transition-all">
      {/* Header with icon */}
      <div className="flex items-start gap-4">
        <div className="text-4xl">💡</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Answer</h3>
          <div className="text-2xl text-white leading-relaxed font-light">{answer.answerText}</div>
        </div>
      </div>
      
      {/* Metadata chips - Simplified colors */}
      {(answer.when || answer.location) && (
        <div className="flex gap-3 flex-wrap pt-2">
          {answer.when && (
            <span className="flex items-center gap-2 px-4 py-2 glass border border-gray-600 rounded-lg text-gray-300 text-sm">
              <span className="text-lg">📅</span>
              <span>{new Date(answer.when).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </span>
          )}
          {answer.location && (answer.location.city || answer.location.country) && (
            <span className="flex items-center gap-2 px-4 py-2 glass border border-gray-600 rounded-lg text-gray-300 text-sm">
              <span className="text-lg">📍</span>
              <span>{[answer.location.city, answer.location.country].filter(Boolean).join(', ')}</span>
            </span>
          )}
        </div>
      )}
      
      {/* Play audio button */}
      {onPlay && (
        <div className="pt-4">
          <button 
            onClick={onPlay} 
            className="px-6 py-2 rounded-lg glass border border-gray-600 hover:border-gray-500 text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg">🔊</span>
            <span>Play Audio</span>
          </button>
        </div>
      )}
    </div>
  );
}
