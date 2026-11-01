'use client';

import React from 'react';
import {
  BookOpen,
  ChevronDown,
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Book } from '@/lib/types';

interface BookSelectorProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onOpenUpload: () => void;
  onDeleteBook: (bookId: string) => void;
  onRetryIngest: (bookId: string) => void;
  isLoading?: boolean;
}

export function BookSelector({
  books,
  selectedBook,
  onSelectBook,
  onOpenUpload,
  onDeleteBook,
  onRetryIngest,
  isLoading,
}: BookSelectorProps) {
  if (books.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          maxWidth: '820px',
          margin: '0 auto 24px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No Textbooks Ingested Yet</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Upload your textbook PDF to begin asking grounded questions and retrieving diagrams.
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenUpload} style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
          <Plus size={15} />
          <span>Upload Textbook</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-card"
      style={{
        maxWidth: '820px',
        margin: '0 auto 24px',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Book Selector Dropdown & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="input-textarea"
                style={{
                  minHeight: 'auto',
                  height: '34px',
                  padding: '4px 10px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  maxWidth: '360px',
                  cursor: 'pointer',
                }}
                value={selectedBook?.id || ''}
                onChange={(e) => {
                  const found = books.find((b) => b.id === e.target.value);
                  if (found) onSelectBook(found);
                }}
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.total_pages > 0 ? `${b.total_pages} pages` : b.status})
                  </option>
                ))}
              </select>

              {/* Status Badge */}
              {selectedBook && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background:
                      selectedBook.status === 'completed'
                        ? 'var(--success-bg)'
                        : selectedBook.status === 'processing'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'var(--error-bg)',
                    color:
                      selectedBook.status === 'completed'
                        ? 'var(--success)'
                        : selectedBook.status === 'processing'
                        ? 'var(--warning)'
                        : 'var(--error)',
                  }}
                >
                  {selectedBook.status === 'completed' ? (
                    <CheckCircle2 size={12} />
                  ) : selectedBook.status === 'processing' ? (
                    <Clock size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  <span>{selectedBook.status}</span>
                </span>
              )}
            </div>

            {selectedBook && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                <span>Total: {selectedBook.total_pages} pages</span>
                <span>Fingerprint: {selectedBook.file_hash.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedBook?.status === 'failed' && (
            <button
              className="btn btn-ghost"
              onClick={() => onRetryIngest(selectedBook.id)}
              style={{ fontSize: '0.78rem', padding: '6px 10px', color: 'var(--warning)' }}
              title="Retry Ingestion Pipeline"
            >
              <RotateCw size={14} />
              <span>Retry</span>
            </button>
          )}

          <button
            className="btn btn-ghost"
            onClick={onOpenUpload}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Plus size={14} />
            <span>Upload Another</span>
          </button>

          {selectedBook && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${selectedBook.title}" and its vector indices?`)) {
                  onDeleteBook(selectedBook.id);
                }
              }}
              style={{ fontSize: '0.8rem', padding: '6px 8px', color: 'var(--error)' }}
              title="Delete Book from Supabase"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

