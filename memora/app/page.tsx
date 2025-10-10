"use client";
import React, { useMemo, useState } from 'react';
import MicButton from './components/MicButton';
import AnswerCard from './components/AnswerCard';
import EvidenceGallery from './components/EvidenceGallery';
import DebugPanel from './components/DebugPanel';
import type { EvidenceItem, GroundedAnswer, QueryPlan } from '@/lib/types';

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [plan, setPlan] = useState<QueryPlan | undefined>();
  const [dsl, setDsl] = useState<any>();
  const [highlights, setHighlights] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [answer, setAnswer] = useState<GroundedAnswer | undefined>();
  const timings = useMemo(() => ({} as Record<string, number>), []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setTranscribing(true);
    setTranscriptionStatus(`Uploading ${file.name}...`);
    setText('');
    
    try {
      const form = new FormData();
      form.append('file', file);
      
      setTranscriptionStatus('Transcribing audio...');
      const res = await fetch('/api/stt', { method: 'POST', body: form });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('STT API error:', errorData);
        setTranscriptionStatus(`Error: ${errorData.error || 'Transcription failed'}`);
        alert(`Transcription failed: ${errorData.error || 'Unknown error'}\n${errorData.details || ''}`);
        return;
      }
      
      const data = await res.json();
      if (data?.text) {
        // Simulate word-by-word display
        const words = data.text.split(' ');
        let currentText = '';
        for (let i = 0; i < words.length; i++) {
          currentText += (i > 0 ? ' ' : '') + words[i];
          setText(currentText);
          setTranscriptionStatus(`Transcribed: ${i + 1}/${words.length} words`);
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay per word
        }
        setTranscriptionStatus('Transcription complete! Running Q&A...');
        await runQa(data.text);
        setTranscriptionStatus('');
      } else {
        setTranscriptionStatus('No text found in audio');
      }
    } catch (err) {
      console.error('File upload STT error:', err);
      setTranscriptionStatus(`Error: ${err}`);
      alert(`Upload error: ${err}`);
    } finally {
      setTranscribing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const runQa = async (q: string) => {
    setText(q);
    setLoading(true);
    setPlan(undefined);
    setDsl(undefined);
    setEvidence([]);
    setAnswer(undefined);
    const t0 = performance.now();
    try {
      const planRes = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: q })});
      const planJson = await planRes.json();
      setPlan(planJson.plan);

      const execRes = await fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planJson.plan })});
      const execJson = await execRes.json();
      setDsl(execJson.dsl);
      setHighlights(execJson.highlights || []);

      const evRes = await fetch('/api/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifacts: execJson.artifacts })});
      const evJson = await evRes.json();
      setEvidence(evJson.evidence || []);

      const ansRes = await fetch('/api/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, hit: execJson.hit, highlights: execJson.highlights, evidence: evJson.evidence })});
      const ansJson = await ansRes.json();
      setAnswer(ansJson.answer);
    } catch (e) {
      console.error('QA flow error');
    } finally {
      timings.total = Math.round(performance.now() - t0);
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Memora</h1>
      <p className="text-gray-600">Make personal memories and life admin instantly answerable—with verifiable evidence—while staying private by default.</p>
      <div className="space-y-2">
        <div className="flex gap-3 items-center">
          <MicButton onText={runQa} disabled={loading || transcribing} />
          <label className={`px-4 py-2 rounded cursor-pointer ${
            transcribing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          } text-white`}>
            {transcribing ? 'Processing...' : 'Upload Audio'}
            <input type="file" accept="audio/*,.mp3,.wav,.m4a,.webm" onChange={handleFileUpload} className="hidden" disabled={loading || transcribing} />
          </label>
          <input className="flex-1 border rounded px-3 py-2" placeholder="Type a question…" value={text} onChange={(e) => setText(e.target.value)} disabled={transcribing} />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => runQa(text)} disabled={!text || loading || transcribing}>Ask</button>
        </div>
        {transcriptionStatus && (
          <div className="text-sm text-blue-600 italic px-2">
            {transcriptionStatus}
          </div>
        )}
      </div>
      <AnswerCard answer={answer} loading={loading} />
      <EvidenceGallery items={evidence} />
      <DebugPanel plan={plan} dsl={dsl} timings={timings} highlights={highlights} />
    </main>
  );
}
