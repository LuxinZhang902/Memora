"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "./components/AuthGuard";
import MicButton from "./components/MicButton";
import AnswerCard from "./components/AnswerCard";
import EvidenceGallery from "./components/EvidenceGallery";
import DebugPanel from "./components/DebugPanel";
import BuildMemoryButton from "./components/BuildMemoryButton";
import type { EvidenceItem, GroundedAnswer, QueryPlan } from "@/lib/types";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");
  const [plan, setPlan] = useState<QueryPlan | undefined>();
  const [dsl, setDsl] = useState<any>();
  const [highlights, setHighlights] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [answer, setAnswer] = useState<GroundedAnswer | undefined>();
  const timings = useMemo(() => ({} as Record<string, number>), []);

  const handleReset = () => {
    setText("");
    setAnswer(undefined);
    setEvidence([]);
    setHighlights([]);
    setPlan(undefined);
    setDsl(undefined);
    setLoading(false);
    setTranscribing(false);
    setTranscriptionStatus("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTranscribing(true);
    setTranscriptionStatus(`Uploading ${file.name}...`);
    setText("");

    try {
      const form = new FormData();
      form.append("file", file);

      setTranscriptionStatus("Transcribing audio...");
      const res = await fetch("/api/stt", { method: "POST", body: form });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("STT API error:", errorData);
        setTranscriptionStatus(
          `Error: ${errorData.error || "Transcription failed"}`
        );
        alert(
          `Transcription failed: ${errorData.error || "Unknown error"}\n${
            errorData.details || ""
          }`
        );
        return;
      }

      const data = await res.json();
      if (data?.text) {
        // Simulate word-by-word display
        const words = data.text.split(" ");
        let currentText = "";
        for (let i = 0; i < words.length; i++) {
          currentText += (i > 0 ? " " : "") + words[i];
          setText(currentText);
          setTranscriptionStatus(`Transcribed: ${i + 1}/${words.length} words`);
          await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay per word
        }
        setTranscriptionStatus("Transcription complete! Running Q&A...");
        await runQa(data.text);
        setTranscriptionStatus("");
      } else {
        setTranscriptionStatus("No text found in audio");
      }
    } catch (err) {
      console.error("File upload STT error:", err);
      setTranscriptionStatus(`Error: ${err}`);
      alert(`Upload error: ${err}`);
    } finally {
      setTranscribing(false);
      // Reset file input
      e.target.value = "";
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
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      const planJson = await planRes.json();
      setPlan(planJson.plan);

      const execRes = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          plan: planJson.plan,
          queryText: q  // Pass original query for hybrid search
        }),
      });
      const execJson = await execRes.json();
      setDsl(execJson.dsl);
      setHighlights(execJson.highlights || []);
      
      // Store file content if found
      if (execJson.fileContent) {
        console.log('[Search] Found matching file content:', execJson.fileContent.file_name);
      }

      const evRes = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifacts: execJson.artifacts }),
      });
      const evJson = await evRes.json();
      
      // Enrich evidence with highlights from file content
      let enrichedEvidence = evJson.evidence || [];
      if (execJson.fileContent && execJson.highlights?.length > 0) {
        enrichedEvidence = enrichedEvidence.map((item: EvidenceItem) => {
          // Match evidence item with file content by name
          if (item.name === execJson.fileContent.file_name) {
            return {
              ...item,
              highlight: execJson.highlights[0] // Use first highlight
            };
          }
          return item;
        });
      }
      
      setEvidence(enrichedEvidence);

      const ansRes = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          hit: execJson.hit,
          highlights: execJson.highlights,
          evidence: evJson.evidence,
          fileContent: execJson.fileContent,  // Include file content for better answers
        }),
      });
      const ansJson = await ansRes.json();
      setAnswer(ansJson.answer);
    } catch (e) {
      console.error("QA flow error");
    } finally {
      timings.total = Math.round(performance.now() - t0);
      setLoading(false);
    }
  };

  const hasResults = answer || loading;

  return (
    <AuthGuard>
      <main className="min-h-screen relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

      {/* Centered Layout - Before Results */}
      {!hasResults && (
        <div className="min-h-screen flex items-start justify-center pt-40 p-8 relative z-10">
          <div className="max-w-4xl w-full space-y-10">
            {/* Header */}
            <div className="text-center space-y-6">
              <h1 className="text-7xl font-bold gradient-text">Memora</h1>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Make personal memories and life admin instantly answerable—with
                verifiable evidence—while staying private by default.
              </p>
              
              {/* Navigation Link */}
              <div className="pt-2">
                <Link
                  href="/files"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm"
                >
                  <span>📁</span>
                  <span>View All Files</span>
                </Link>
              </div>
            </div>

            {/* Input Section - Centered */}
            <div className="glass rounded-2xl p-8 space-y-4 glow">
              <div className="flex gap-3 items-center flex-wrap justify-center">
                <MicButton onText={runQa} disabled={loading || transcribing} />
                <label
                  className={`px-6 py-3 rounded-xl font-medium cursor-pointer transition-all duration-300 ${
                    transcribing
                      ? "bg-gray-700 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 glow-green"
                  } text-white`}
                >
                  {transcribing ? "⏳ Processing..." : "🎵 Upload Audio"}
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading || transcribing}
                  />
                </label>
                <input
                  className="flex-1 min-w-[350px] max-w-md glass border border-gray-700 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                  placeholder="When is the last time I renew my driver license?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={transcribing}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    text &&
                    !loading &&
                    !transcribing &&
                    runQa(text)
                  }
                />
                <button
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    !text || loading || transcribing
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white glow-purple"
                  }`}
                  onClick={() => runQa(text)}
                  disabled={!text || loading || transcribing}
                >
                  {loading ? "🔍 Searching..." : "✨ Ask"}
                </button>
              </div>

              {/* Transcription Status */}
              {transcriptionStatus && (
                <div className="glass rounded-lg p-4 border border-blue-500/30 shimmer">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    <span className="text-blue-400 font-medium">
                      {transcriptionStatus}
                    </span>
                  </div>
                </div>
              )}

              {/* Transcribed text preview */}
              {text && transcribing && (
                <div className="glass rounded-lg p-4 border border-purple-500/30">
                  <div className="text-purple-300 font-mono text-sm text-center">
                    {text}
                    <span className="inline-block w-1 h-4 bg-purple-400 ml-1 animate-pulse"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Build Memory Button */}
            <div className="flex justify-center">
              <BuildMemoryButton
                onMemoryCreated={(momentId) =>
                  console.log("Memory created:", momentId)
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Layout - After Results */}
      {hasResults && (
        <div className="max-w-6xl mx-auto p-8 space-y-6 relative z-10">
          {/* Compact Header */}
          <div className="flex items-center justify-between pt-4">
            <h1 className="text-4xl font-bold gradient-text">Memora</h1>
            <Link
              href="/files"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm"
            >
              <span>📁</span>
              <span>View All Files</span>
            </Link>
          </div>

          {/* Compact Input Section - Top */}
          <div className="glass rounded-xl p-4 space-y-3 glow">
            <div className="flex gap-2 items-center flex-wrap">
              <MicButton onText={runQa} disabled={loading || transcribing} />
              <label
                className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-all duration-300 text-sm ${
                  transcribing
                    ? "bg-gray-700 cursor-not-allowed opacity-50"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 glow-green"
                } text-white`}
              >
                {transcribing ? "⏳ Processing..." : "🎵 Upload"}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading || transcribing}
                />
              </label>
              <input
                className="flex-1 min-w-[300px] glass border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ask another question..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={transcribing}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  text &&
                  !loading &&
                  !transcribing &&
                  runQa(text)
                }
              />
              <button
                className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${
                  !text || loading || transcribing
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white glow-purple"
                }`}
                onClick={() => runQa(text)}
                disabled={!text || loading || transcribing}
              >
                {loading ? "🔍" : "✨ Ask"}
              </button>
            </div>

            {transcriptionStatus && (
              <div className="glass rounded-lg p-3 border border-blue-500/30 shimmer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="text-blue-400 text-sm">
                    {transcriptionStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Build Memory Button */}
            <div className="pt-2 flex justify-center">
              <BuildMemoryButton
                onMemoryCreated={(momentId) =>
                  console.log("Memory created:", momentId)
                }
              />
            </div>
          </div>

          {/* Results */}
          <AnswerCard answer={answer} loading={loading} />
          <EvidenceGallery items={evidence} />
          
          {/* New Search Button - Show after results */}
          {answer && !loading && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleReset}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 flex items-center gap-3"
              >
                <span className="text-xl">🔄</span>
                <span>Ask Another Question</span>
              </button>
            </div>
          )}
          
          <DebugPanel
            plan={plan}
            dsl={dsl}
            timings={timings}
            highlights={highlights}
          />
        </div>
      )}
    </main>
    </AuthGuard>
  );
}
