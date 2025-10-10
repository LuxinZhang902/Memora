"use client";
import React from 'react';
import type { GroundedAnswer } from '@/lib/types';

type Props = { answer?: GroundedAnswer; loading?: boolean; onPlay?: () => void };

export default function AnswerCard({ answer, loading, onPlay }: Props) {
  if (loading) return <div className="animate-pulse p-4 border rounded-md">Loading answer…</div>;
  if (!answer) return <div className="p-4 border rounded-md text-gray-500">Ask a question to see results.</div>;
  return (
    <div className="p-4 border rounded-md space-y-3">
      <div className="text-lg">{answer.answerText}</div>
      <div className="flex gap-2 text-sm text-gray-600">
        {answer.when && <span className="px-2 py-1 bg-gray-100 rounded">{answer.when}</span>}
        {answer.location && (answer.location.city || answer.location.country) && (
          <span className="px-2 py-1 bg-gray-100 rounded">{[answer.location.city, answer.location.country].filter(Boolean).join(', ')}</span>
        )}
      </div>
      <div className="flex gap-2">
        {onPlay && <button onClick={onPlay} className="px-3 py-1 rounded bg-emerald-600 text-white">Play</button>}
      </div>
    </div>
  );
}
