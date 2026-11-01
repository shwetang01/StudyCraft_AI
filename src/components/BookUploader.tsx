'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Book } from '@/lib/types';

interface BookUploaderProps {
  onBookUploaded: (book: Book) => void;
}

export function BookUploader({ onBookUploaded }: BookUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF textbook file (.pdf).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (!bookTitle) {
      const suggested = file.name.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').trim();
      setBookTitle(suggested);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(15);
    setStatusMessage('Uploading PDF and computing SHA-256 fingerprint...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (bookTitle.trim()) {
        formData.append('title', bookTitle.trim());
      }

      const res = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to upload textbook.');
      }

      const book: Book = json.data;
      setUploadProgress(50);

      if (json.deduplicated) {
        setStatusMessage('Identified existing ingested book. Instant retrieval ready!');
        setUploadProgress(100);
        onBookUploaded(book);
        setIsUploading(false);
        return;
      }

      setStatusMessage('Ingestion running: PyMuPDF page streaming & vector embeddings...');

      // Poll ingestion status until completed or failed
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/books/${book.id}/status`);
          const statusJson = await statusRes.json();
          if (statusJson.success && statusJson.data) {
            const status = statusJson.data.status;
            if (status === 'completed') {
              clearInterval(pollInterval);
              setUploadProgress(100);
              setStatusMessage(`Ingestion complete! ${statusJson.data.totalPages} pages, ${statusJson.data.chunkCount} chunks, ${statusJson.data.figureCount} diagrams.`);
              setIsUploading(false);
              onBookUploaded({
                ...book,
                total_pages: statusJson.data.totalPages,
                status: 'completed',
              });
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              setIsUploading(false);
              setError(statusJson.data.errorMessage || 'Ingestion encountered an error.');
            } else {
              if (statusJson.data.chunkCount > 0) {
                setStatusMessage(`Ingestion running: saved ${statusJson.data.chunkCount} chunks into Supabase pgvector...`);
              }
              setUploadProgress((prev) => Math.min(prev + 4, 96));
            }
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch (err: unknown) {
      setIsUploading(false);
      setError((err as Error).message);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '820px', margin: '0 auto 28px', padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span className="brand-badge" style={{ fontSize: '0.78rem' }}>
          Supabase Persistent Ingestion
        </span>
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
        Upload Textbook for Persistent RAG & Diagrams
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.5 }}>
        Upload any academic or technical book (supports large textbooks with 1,400+ pages). Ingestion runs once: text
        and diagrams are extracted via PyMuPDF, embedded via Gemini, and persisted to Supabase pgvector.
      </p>

      {/* Drag & Drop Zone */}
      <div
        className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
          transition: 'all 0.2s ease',
          marginBottom: '20px',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UploadCloud size={26} />
          </div>

          {selectedFile ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB PDF Document
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                Drag & drop textbook PDF here, or click to browse
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports textbooks, lecture manuscripts, and technical specs (up to 1,800+ pages)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Title input & Action */}
      {selectedFile && !isUploading && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Book Title:
            </label>
            <input
              type="text"
              className="input-textarea"
              style={{ minHeight: 'auto', height: '40px', padding: '8px 12px', fontSize: '0.9rem' }}
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. REST API Architecture Handbook"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleUpload}
            style={{ height: '40px', alignSelf: 'flex-end', padding: '0 24px', fontSize: '0.9rem' }}
          >
            <Sparkles size={16} />
            <span>Start Ingestion</span>
          </button>
        </div>
      )}

      {/* Uploading / Ingestion Progress Indicator */}
      {isUploading && (
        <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <span>{statusMessage}</span>
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {uploadProgress}%
            </span>
          </div>
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--error-bg)',
            color: 'var(--error)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

