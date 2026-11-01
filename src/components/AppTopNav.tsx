'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  BookOpen,
  Upload,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Key,
  History,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Book } from '@/lib/types';
import { sounds } from '@/lib/soundEffects';

interface AppTopNavProps {
  selectedBook: Book | null;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenUpload: () => void;
  onOpenMobileMenu: () => void;
  onOpenHistory: () => void;
  onOpenApiKey: () => void;
  hasCustomKey?: boolean;
}

export function AppTopNav({
  selectedBook,
  books,
  onSelectBook,
  onOpenUpload,
  onOpenMobileMenu,
  onOpenHistory,
  onOpenApiKey,
  hasCustomKey,
}: AppTopNavProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMuted, setIsMuted] = useState(false);
  const [isBookMenuOpen, setIsBookMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = (root.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.enabled = !next;
  };

  return (
    <header className="studycraft-top-nav">
      <div className="top-nav-left">
        {/* Mobile menu button */}
        <button
          className="btn btn-icon md-hidden"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          style={{ width: '38px', height: '38px' }}
        >
          <Menu size={18} />
        </button>

        {/* Selected Book Quick Switcher Pill */}
        {selectedBook ? (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="top-nav-book-chip"
              onClick={() => setIsBookMenuOpen(!isBookMenuOpen)}
              title="Click to switch active textbook"
            >
              <BookOpen size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span
                style={{
                  fontWeight: 700,
                  maxWidth: '220px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedBook.title}
              </span>

              {selectedBook.status === 'completed' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: 'var(--success)',
                    fontWeight: 600,
                    background: 'var(--success-bg)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>Ready</span>
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: 'var(--warning)',
                    fontWeight: 600,
                    background: 'var(--warning-bg)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  <Loader2 size={12} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{selectedBook.status}</span>
                </span>
              )}

              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Quick Switcher Dropdown */}
            {isBookMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                  onClick={() => setIsBookMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: '300px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 70,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      padding: '6px 10px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Select Active Textbook
                  </div>
                  {books.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectBook(b);
                        setIsBookMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: selectedBook.id === b.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        border: 'none',
                        color: selectedBook.id === b.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {b.total_pages ? `${b.total_pages} pages` : 'In progress'}
                        </div>
                      </div>
                      {selectedBook.id === b.id && <CheckCircle2 size={15} style={{ color: 'var(--accent-primary)' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            No textbook selected
          </div>
        )}
      </div>

      {/* Top Nav Right Actions */}
      <div className="top-nav-actions">
        {/* Upload PDF Action */}
        <button
          className="btn btn-primary"
          onClick={onOpenUpload}
          style={{ padding: '7px 15px', fontSize: '0.82rem', gap: '6px' }}
        >
          <Upload size={14} />
          <span>Upload PDF</span>
        </button>

        {/* API Key Modal Trigger */}
        <button
          className="btn btn-icon"
          onClick={onOpenApiKey}
          title={hasCustomKey ? 'Custom API Key Active' : 'API Key Settings'}
          style={hasCustomKey ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : undefined}
          aria-label="API Key Settings"
        >
          <Key size={16} />
        </button>

        {/* Sound Toggle */}
        <button
          className="btn btn-icon"
          onClick={toggleSound}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label="Toggle Sound Effects"
        >
          {isMuted ? <VolumeX size={16} style={{ color: 'var(--text-muted)' }} /> : <Volume2 size={16} style={{ color: 'var(--accent-cyan)' }} />}
        </button>

        {/* History Modal Trigger */}
        <button
          className="btn btn-icon"
          onClick={onOpenHistory}
          title="Saved Study Sessions"
          aria-label="View Saved Sessions"
        >
          <History size={16} />
        </button>

        {/* Dark / Light Toggle */}
        <button
          className="btn btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Color Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

