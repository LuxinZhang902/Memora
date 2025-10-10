"use client";
import React, { useEffect, useRef, useState } from 'react';

type Props = { onText: (text: string) => void; disabled?: boolean };

export default function MicButton({ onText, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      try {
        const res = await fetch('/api/stt', { method: 'POST', body: form });
        const data = await res.json();
        if (data?.text) onText(data.text);
      } catch (e) {
        console.error('STT error');
      }
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
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
          ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white pulse-glow animate-pulse' 
          : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white glow'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
    >
      {recording ? '🔴 Stop Recording' : '🎤 Speak'}
    </button>
  );
}
