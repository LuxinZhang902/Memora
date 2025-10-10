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
      className={`px-4 py-2 rounded-md font-medium ${recording ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
      disabled={disabled}
    >
      {recording ? 'Stop' : 'Speak'}
    </button>
  );
}
