"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getUserId } from '@/lib/user';

type Props = {
  onMemoryCreated?: (momentId: string) => void;
};

export default function BuildMemoryButton({ onMemoryCreated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadProgress('Creating memory...');

    try {
      // Create moment ID
      const momentId = `moment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = getUserId();

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}...`);

        const formData = new FormData();
        formData.append('moment_id', momentId);
        formData.append('user_id', userId);
        formData.append('file', file);
        formData.append('title', title || `Uploaded ${file.name}`);
        formData.append('text', description);

        const response = await fetch('/api/ingest-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        console.log(`[BuildMemory] Uploaded ${file.name}:`, result);
      }

      setUploadProgress('✅ Memory created successfully!');
      
      // Reset form
      setTimeout(() => {
        setFiles([]);
        setTitle('');
        setDescription('');
        setIsOpen(false);
        setUploadProgress('');
        if (onMemoryCreated) {
          onMemoryCreated(momentId);
        }
      }, 2000);

    } catch (error: any) {
      console.error('[BuildMemory] Upload error:', error);
      setUploadProgress(`❌ Error: ${error.message}`);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 relative z-[10000]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✨</span>
                <h2 className="text-2xl font-bold gradient-text">Build My Memory</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
                disabled={uploading}
              >
                ×
              </button>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300 font-semibold">Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., My Trip to Paris, Driver License Renewal..."
                className="w-full bg-slate-950/60 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                disabled={uploading}
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300 font-semibold">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context about this memory..."
                rows={3}
                className="w-full bg-slate-950/60 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                disabled={uploading}
              />
            </div>

            {/* File Upload Area */}
            <div className="space-y-3">
              <label className="text-sm text-gray-300 font-semibold">Files</label>
              
              {/* Upload Button */}
              <label className="block">
                <div className="bg-slate-950/40 border-2 border-dashed border-slate-600 hover:border-purple-500 hover:bg-slate-950/60 rounded-xl p-8 text-center cursor-pointer transition-all group">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                  <div className="text-white font-semibold mb-1">Click to upload files</div>
                  <div className="text-sm text-gray-400">
                    Images, PDFs, Audio, Documents, etc.
                  </div>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                />
              </label>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="bg-slate-950/60 border-2 border-slate-700 rounded-lg p-3 flex items-center justify-between group hover:border-purple-500/70 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(file)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        disabled={uploading}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="bg-blue-950/40 rounded-lg p-4 border-2 border-blue-500/50">
                <div className="flex items-center gap-3">
                  {uploading && <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>}
                  <span className="text-blue-300 font-medium text-sm">{uploadProgress}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-6 py-3 rounded-lg bg-slate-800 border-2 border-slate-600 text-gray-200 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all font-medium"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  files.length === 0 || uploading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white glow-purple'
                }`}
              >
                {uploading ? '⏳ Uploading...' : `✨ Create Memory (${files.length})`}
              </button>
            </div>
          </div>
        </div>
  ) : null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white transition-all duration-300 glow-purple flex items-center gap-2"
      >
        <span className="text-xl">✨</span>
        <span>Build My Memory</span>
      </button>

      {/* Modal Portal */}
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
