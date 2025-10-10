"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserId } from '@/lib/user';
import AuthGuard from '../components/AuthGuard';
import BuildMemoryButton from '../components/BuildMemoryButton';

interface FileMetadata {
  page_count?: number;
  word_count?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  camera_make?: string;
  camera_model?: string;
  date_taken?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  location?: {
    lat: number;
    lon: number;
  };
}

interface FileItem {
  contentId: string;
  artifactId: string;
  momentId: string;
  fileName: string;
  fileType: string;
  fileCategory: string;
  mimeType: string;
  fileSize: number;
  gcsPath: string;
  thumbPath?: string;
  extractedText?: string;
  metadata: FileMetadata;
  extractionStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const response = await fetch(`/api/files?user_id=${userId}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'audio': return '🎵';
      case 'video': return '🎬';
      case 'code': return '💻';
      default: return '📎';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSelectedFile(null);
        fetchFiles();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  const handleUpdateFileName = async () => {
    if (!selectedFile || !newFileName.trim()) return;
    
    try {
      const response = await fetch(`/api/files/${selectedFile.contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newFileName }),
      });
      
      if (response.ok) {
        setEditingName(false);
        setSelectedFile({ ...selectedFile, fileName: newFileName });
        fetchFiles();
      } else {
        alert('Failed to update file name');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update file name');
    }
  };

  const handleOpenFile = (file: FileItem) => {
    // Open file via serve endpoint (generates signed GCS URL)
    const serveUrl = `/api/files/serve/${file.contentId}`;
    window.open(serveUrl, '_blank');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'image': return 'from-purple-500 to-pink-600';
      case 'document': return 'from-blue-500 to-cyan-600';
      case 'audio': return 'from-green-500 to-emerald-600';
      case 'video': return 'from-red-500 to-orange-600';
      case 'code': return 'from-yellow-500 to-amber-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  return (
    <AuthGuard>
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        {/* Header with integrated navigation */}
        <div className="mb-6 pt-2">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-3xl md:text-4xl font-bold gradient-text hover:opacity-80 transition-opacity">
                Memora
              </Link>
              <span className="text-gray-600 hidden md:inline">|</span>
              <span className="text-gray-400 text-sm md:text-base hidden md:inline">Files</span>
            </div>
            
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back to Search</span>
            </Link>
          </div>

          {/* Page Title and Description */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">All Files</h1>
            <p className="text-gray-400">
              {loading ? 'Loading your files...' : `${total} file${total !== 1 ? 's' : ''} uploaded`}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="glass rounded-xl p-4 mb-6 glow">
          <div className="flex flex-wrap items-center gap-3">
            <BuildMemoryButton onMemoryCreated={() => {
              console.log('Memory created, refreshing files...');
              setTimeout(() => fetchFiles(), 1000);
            }} />
            <button
              onClick={fetchFiles}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <div className="ml-auto text-sm text-gray-400 hidden md:block">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading files...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-white mb-2">No files yet</h3>
            <p className="text-gray-400 mb-6">Upload your first file to get started</p>
            <BuildMemoryButton onMemoryCreated={() => {
              console.log('Memory created, refreshing files...');
              setTimeout(() => fetchFiles(), 1000);
            }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <div
                key={file.contentId}
                onClick={() => setSelectedFile(file)}
                className="glass rounded-xl p-6 hover:border-purple-500/50 border-2 border-transparent transition-all cursor-pointer group"
              >
                {/* File Icon & Category */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getCategoryColor(file.fileCategory)} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                    {getFileIcon(file.fileCategory)}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-gray-300">
                    {file.fileCategory}
                  </span>
                </div>

                {/* File Name */}
                <h3 className="text-white font-semibold mb-2 truncate" title={file.fileName}>
                  {file.fileName}
                </h3>

                {/* File Info */}
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>📦</span>
                    <span>{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                  
                  {/* GPS Location */}
                  {file.metadata?.gps_latitude && file.metadata?.gps_longitude && (
                    <div className="flex items-center gap-2 text-green-400">
                      <span>📍</span>
                      <span className="truncate">
                        {file.metadata.gps_latitude.toFixed(4)}, {file.metadata.gps_longitude.toFixed(4)}
                      </span>
                    </div>
                  )}

                  {/* Camera Info */}
                  {file.metadata?.camera_make && (
                    <div className="flex items-center gap-2">
                      <span>📷</span>
                      <span className="truncate">{file.metadata.camera_make}</span>
                    </div>
                  )}
                </div>

                {/* Extraction Status */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    file.extractionStatus === 'success' 
                      ? 'bg-green-500/20 text-green-400' 
                      : file.extractionStatus === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {file.extractionStatus === 'success' ? '✓ Processed' : 
                     file.extractionStatus === 'failed' ? '✗ Failed' : 
                     '○ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Detail Modal */}
      {selectedFile && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getCategoryColor(selectedFile.fileCategory)} flex items-center justify-center text-3xl`}>
                  {getFileIcon(selectedFile.fileCategory)}
                </div>
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="flex-1 bg-slate-950/60 border-2 border-purple-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateFileName()}
                      />
                      <button
                        onClick={handleUpdateFileName}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-white">{selectedFile.fileName}</h2>
                      <button
                        onClick={() => {
                          setEditingName(true);
                          setNewFileName(selectedFile.fileName);
                        }}
                        className="text-gray-400 hover:text-purple-400 transition-colors"
                        title="Edit name"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  <p className="text-gray-400 mt-1">{selectedFile.mimeType}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setEditingName(false);
                }}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-950/60 rounded-lg p-4 border-2 border-slate-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">File Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="text-white ml-2">{formatFileSize(selectedFile.fileSize)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="text-white ml-2">{selectedFile.fileType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="text-white ml-2">{formatDate(selectedFile.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 ${
                      selectedFile.extractionStatus === 'success' ? 'text-green-400' : 
                      selectedFile.extractionStatus === 'failed' ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {selectedFile.extractionStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* GPS Location */}
              {selectedFile.metadata?.gps_latitude && selectedFile.metadata?.gps_longitude && (
                <div className="bg-green-950/40 rounded-lg p-4 border-2 border-green-700/50">
                  <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                    <span>📍</span> GPS Location
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-green-400">Latitude:</span>
                      <span className="text-white ml-2">{selectedFile.metadata.gps_latitude.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-green-400">Longitude:</span>
                      <span className="text-white ml-2">{selectedFile.metadata.gps_longitude.toFixed(6)}</span>
                    </div>
                    {selectedFile.metadata.gps_altitude && (
                      <div>
                        <span className="text-green-400">Altitude:</span>
                        <span className="text-white ml-2">{selectedFile.metadata.gps_altitude.toFixed(1)}m</span>
                      </div>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${selectedFile.metadata.gps_latitude},${selectedFile.metadata.gps_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition-all"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                </div>
              )}

              {/* Camera Info */}
              {(selectedFile.metadata?.camera_make || selectedFile.metadata?.date_taken) && (
                <div className="bg-slate-950/60 rounded-lg p-4 border-2 border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <span>📷</span> Camera Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedFile.metadata.camera_make && (
                      <div>
                        <span className="text-gray-500">Make:</span>
                        <span className="text-white ml-2">{selectedFile.metadata.camera_make}</span>
                      </div>
                    )}
                    {selectedFile.metadata.camera_model && (
                      <div>
                        <span className="text-gray-500">Model:</span>
                        <span className="text-white ml-2">{selectedFile.metadata.camera_model}</span>
                      </div>
                    )}
                    {selectedFile.metadata.date_taken && (
                      <div>
                        <span className="text-gray-500">Date Taken:</span>
                        <span className="text-white ml-2">{formatDate(selectedFile.metadata.date_taken)}</span>
                      </div>
                    )}
                    {selectedFile.metadata.width && selectedFile.metadata.height && (
                      <div>
                        <span className="text-gray-500">Dimensions:</span>
                        <span className="text-white ml-2">{selectedFile.metadata.width} × {selectedFile.metadata.height}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extracted Text Preview */}
              {selectedFile.extractedText && (
                <div className="bg-slate-950/60 rounded-lg p-4 border-2 border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Extracted Text Preview</h3>
                  <p className="text-gray-400 text-sm">{selectedFile.extractedText}...</p>
                </div>
              )}

              {/* IDs */}
              <div className="bg-slate-950/60 rounded-lg p-4 border-2 border-slate-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Technical Details</h3>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-gray-500">Content ID:</span>
                    <span className="text-gray-400 ml-2">{selectedFile.contentId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Artifact ID:</span>
                    <span className="text-gray-400 ml-2">{selectedFile.artifactId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Moment ID:</span>
                    <span className="text-gray-400 ml-2">{selectedFile.momentId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenFile(selectedFile)}
                  className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all font-medium flex items-center gap-2"
                >
                  <span>📂</span> Open File
                </button>
                <button
                  onClick={() => handleDeleteFile(selectedFile.contentId)}
                  className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all font-medium flex items-center gap-2"
                >
                  <span>🗑️</span> Delete
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setEditingName(false);
                }}
                className="px-6 py-3 rounded-lg bg-slate-800 border-2 border-slate-600 text-gray-200 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </AuthGuard>
  );
}
