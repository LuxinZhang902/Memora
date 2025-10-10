"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = { onText: (text: string) => void; disabled?: boolean };

export default function MicButton({ onText, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording")
        mediaRecorderRef.current.stop();
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mr.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        if (chunksRef.current.length === 0) {
          console.error("No audio data recorded");
          alert("No audio was recorded. Please try again.");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (blob.size === 0) {
          console.error("Empty audio blob");
          alert("Recording is empty. Please speak and try again.");
          return;
        }

        console.log(`Recording complete: ${blob.size} bytes`);

        const form = new FormData();
        form.append("file", blob, "audio.webm");

        try {
          const res = await fetch("/api/stt", { method: "POST", body: form });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("STT API error:", errorData);
            alert(
              `Transcription failed: ${errorData.error || "Unknown error"}`
            );
            return;
          }

          const data = await res.json();
          if (data?.text) {
            onText(data.text);
          } else {
            alert("No text was transcribed. Please try speaking more clearly.");
          }
        } catch (e) {
          console.error("STT error:", e);
          alert("Failed to transcribe audio. Please try again.");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      onClick={() => (recording ? stop() : start())}
      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        recording
          ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white pulse-glow animate-pulse"
          : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white glow"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
    >
      {recording ? "🔴 Stop Recording" : "Speak"}
    </button>
  );
}
