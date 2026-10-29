'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Trash2, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { StudySession } from '@/lib/types';

interface SavedSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: StudySession) => void;
}

const HISTORY_KEY = 'studycraft_history_v1';

export function SavedSessionsModal({
  isOpen,
  onClose,
  onSelectSession,
}: SavedSessionsModalProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) {
          setSessions(JSON.parse(raw));
        }
      } catch {
        setSessions([]);
      }
    }
  }, [isOpen]);

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Saved Study Sessions</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No saved sessions found in your browser.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Generate a study suite to have it automatically archived here.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                    {s.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{s.flashcards.length} Cards</span>
                    <span>•</span>
                    <span>{s.quiz.length} Questions</span>
                    <span>•</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    title="Delete session"
                    style={{ width: '32px', height: '32px', color: 'var(--error)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
