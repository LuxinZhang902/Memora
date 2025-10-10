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
    <div className="relative group">
      {/* Enhanced animated gradient border - Purple theme */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl opacity-75 group-hover:opacity-100 blur-xl transition duration-1000 group-hover:duration-200 animate-gradient"></div>
      
      <div className="relative glass rounded-3xl p-8 border-2 border-purple-500/30 space-y-6 hover:border-purple-400/40 transition-all">
        {/* Header with icon */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
            <div className="relative text-5xl bg-gradient-to-br from-purple-400 to-pink-400 p-4 rounded-2xl shadow-2xl shadow-purple-500/50 hover:scale-110 transition-transform duration-300">
              💡
            </div>
          </div>
          <div className="flex-1 pt-2">
            <h3 className="text-sm font-bold text-purple-300 mb-3 uppercase tracking-widest">Answer</h3>
            <div className="text-2xl text-white leading-relaxed font-light">{answer.answerText}</div>
          </div>
        </div>
        
        {/* Metadata chips - Enhanced */}
        {(answer.when || answer.location) && (
          <div className="flex gap-3 flex-wrap pt-2">
            {answer.when && (
              <div className="group/chip relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl opacity-60 group-hover/chip:opacity-100 blur-lg transition duration-300"></div>
                <span className="relative flex items-center gap-2 px-5 py-3 glass border border-blue-500/50 rounded-xl text-blue-200 text-sm font-semibold hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/30">
                  <span className="text-xl">📅</span>
                  <span>{new Date(answer.when).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </span>
              </div>
            )}
            {answer.location && (answer.location.city || answer.location.country) && (
              <div className="group/chip relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl opacity-60 group-hover/chip:opacity-100 blur-lg transition duration-300"></div>
                <span className="relative flex items-center gap-2 px-5 py-3 glass border border-green-500/50 rounded-xl text-green-200 text-sm font-semibold hover:scale-110 transition-all duration-300 shadow-lg shadow-green-500/30">
                  <span className="text-xl">📍</span>
                  <span>{[answer.location.city, answer.location.country].filter(Boolean).join(', ')}</span>
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Play audio button - Enhanced */}
        {onPlay && (
          <div className="pt-4">
            <button 
              onClick={onPlay} 
              className="group/btn relative px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/50 flex items-center gap-3"
            >
              <span className="text-2xl group-hover/btn:scale-125 transition-transform duration-300">🔊</span>
              <span>Play Audio Answer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
