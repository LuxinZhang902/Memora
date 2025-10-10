"use client";
import React, { useState } from 'react';

type Props = { plan?: any; dsl?: any; timings?: Record<string, number>; highlights?: string[] };

export default function DebugPanel({ plan, dsl, timings, highlights }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button className="text-sm underline" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'} Debug</button>
      {open && (
        <div className="mt-2 p-3 border rounded bg-gray-50 text-xs overflow-auto max-h-96">
          <div className="font-semibold">Plan</div>
          <pre>{JSON.stringify(plan, null, 2)}</pre>
          <div className="font-semibold mt-2">DSL</div>
          <pre>{JSON.stringify(dsl, null, 2)}</pre>
          {highlights && highlights.length > 0 && (
            <>
              <div className="font-semibold mt-2">Highlights</div>
              <ul className="list-disc pl-5">
                {highlights.map((h, i) => (
                  <li key={i}>{h.replace(/<[^>]*>/g, '')}</li>
                ))}
              </ul>
            </>
          )}
          {timings && (
            <>
              <div className="font-semibold mt-2">Timings (ms)</div>
              <pre>{JSON.stringify(timings, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
