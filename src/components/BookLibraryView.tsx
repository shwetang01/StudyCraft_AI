'use client';

import React from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { Book } from '@/lib/types';
import { BookUploader } from './BookUploader';

interface BookLibraryViewProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onOpenStudyWorkspace: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onRetryIngest: (bookId: string) => void;
  onBookUploaded: (newBook: Book) => void;
  showUploader: boolean;
  setShowUploader: (show: boolean) => void;
  isLoading?: boolean;
}

export function BookLibraryView({
  books,
  selectedBook,
  onSelectBook,
  onOpenStudyWorkspace,
  onDeleteBook,
  onRetryIngest,
  onBookUploaded,
  showUploader,
  setShowUploader,
  isLoading,
}: BookLibraryViewProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Library Banner Header */}
      <div className="book-library-header">
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '6px' }}>
            Textbook Library & Knowledge Base
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Ingest full academic textbooks for vector search, page citations, and diagram extraction.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowUploader(!showUploader)}
          style={{ gap: '8px' }}
        >
          <Plus size={16} />
          <span>{showUploader ? 'Close Uploader' : 'Add New Textbook'}</span>
        </button>
      </div>

      {/* Embedded Uploader Dropzone if open or if no books */}
      {(showUploader || books.length === 0) && (
        <div style={{ marginBottom: '32px' }}>
          <BookUploader onBookUploaded={onBookUploaded} />
        </div>
      )}

      {/* Books Grid */}
      {books.length > 0 && (
        <div className="books-grid">
          {books.map((book) => {
            const isSelected = selectedBook?.id === book.id;

            return (
              <div
                key={book.id}
                className={`book-card-modern ${isSelected ? 'is-selected' : ''}`}
              >
                <div>
                  {/* Book Spine Icon + Header */}
                  <div className="book-card-spine">
                    <div className="book-icon-box">
                      <BookOpen size={24} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="book-card-title" title={book.title}>
                        {book.title}
                      </div>

                      <div className="book-card-meta">
                        {book.total_pages ? (
                          <span>{book.total_pages} printed pages</span>
                        ) : (
                          <span>Scanning pages...</span>
                        )}
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {formatDate(book.updated_at || book.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Status Pill */}
                  <div style={{ marginBottom: '16px' }}>
                    {book.status === 'completed' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--success)',
                          background: 'var(--success-bg)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Ready for RAG & Visual Study</span>
                      </span>
                    )}

                    {book.status === 'processing' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                          background: 'rgba(99, 102, 241, 0.12)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        <RotateCw
                          size={13}
                          className="spinner"
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                        <span>Extracting text & diagrams...</span>
                      </span>
                    )}

                    {book.status === 'uploaded' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--warning)',
                          background: 'var(--warning-bg)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        <Clock size={13} />
                        <span>Uploaded · Ingestion queued</span>
                      </span>
                    )}

                    {book.status === 'failed' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--error)',
                          background: 'var(--error-bg)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        <AlertTriangle size={13} />
                        <span>Ingestion interrupted</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="book-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {book.status === 'completed' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          onSelectBook(book);
                          onOpenStudyWorkspace(book);
                        }}
                        style={{ fontSize: '0.82rem', padding: '6px 14px', gap: '6px' }}
                      >
                        <span>Study Book</span>
                        <ArrowRight size={14} />
                      </button>
                    )}

                    {book.status === 'failed' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => onRetryIngest(book.id)}
                        style={{ fontSize: '0.82rem', padding: '6px 12px', gap: '6px' }}
                      >
                        <RotateCw size={13} />
                        <span>Retry</span>
                      </button>
                    )}

                    {book.status === 'completed' && !isSelected && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => onSelectBook(book)}
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      >
                        Set Active
                      </button>
                    )}
                  </div>

                  <button
                    className="btn btn-icon"
                    onClick={() => {
                      if (confirm(`Remove "${book.title}" from your library?`)) {
                        onDeleteBook(book.id);
                      }
                    }}
                    title="Remove textbook"
                    style={{ color: 'var(--text-muted)', width: '32px', height: '32px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

