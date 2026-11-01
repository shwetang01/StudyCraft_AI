'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Maximize2,
  X,
} from 'lucide-react';
import { Flashcard } from '@/lib/types';
import { sounds } from '@/lib/soundEffects';

interface FlashcardDeckProps {
  cards: Flashcard[];
  onUpdateCardStatus: (cardId: string, status: 'learning' | 'mastered') => void;
}

export function FlashcardDeck({ cards, onUpdateCardStatus }: FlashcardDeckProps) {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedDiagram, setExpandedDiagram] = useState<{ url: string; caption?: string | null } | null>(null);

  // Sync internal state if cards change from external refinement or book generation
  useEffect(() => {
    setDeck(cards);
    if (currentIndex >= cards.length) {
      setCurrentIndex(0);
    }
  }, [cards, currentIndex]);

  const currentCard = deck[currentIndex] || deck[0];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    sounds.playFlip();
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
  }, [deck.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  }, [deck.length]);

  // Keyboard navigation: Space to flip, Left/Right arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape' && expandedDiagram) {
        setExpandedDiagram(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, expandedDiagram]);

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
  };

  const handleMarkStatus = (status: 'learning' | 'mastered') => {
    if (!currentCard) return;
    onUpdateCardStatus(currentCard.id, status);
    // Auto advance to next card after marking
    setTimeout(() => {
      handleNext();
    }, 250);
  };

  const masteredCount = deck.filter((c) => c.userStatus === 'mastered').length;
  const progressPercent = Math.round((masteredCount / deck.length) * 100);

  if (!currentCard) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p>No flashcards available for this session.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Top Deck Stats & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            Card {currentIndex + 1} of {deck.length}
          </span>
          <span
            style={{
              fontSize: '0.78rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              fontWeight: 600,
            }}
          >
            {masteredCount} / {deck.length} Mastered ({progressPercent}%)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-ghost"
            onClick={handleShuffle}
            title="Shuffle Flashcard Deck"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            <Shuffle size={14} />
            <span>Shuffle</span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(0);
            }}
            title="Restart from first card"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            <RotateCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3D Flipping Card Stage */}
      {(() => {
        const sourcePage =
          currentCard.citations && currentCard.citations.length > 0
            ? currentCard.citations[0].printedPageNumber || String(currentCard.citations[0].pdfPageIndex + 1)
            : null;
        const hasDiagram = !!currentCard.figureUrl;

        return (
          <div
            className={`flashcard-stage ${hasDiagram ? 'has-diagram' : ''}`}
            onClick={handleFlip}
            role="button"
            tabIndex={0}
          >
            <div className={`flashcard-flipper ${isFlipped ? 'is-flipped' : ''}`}>
              {/* Card Front */}
              <div className="flashcard-face flashcard-front">
                <div className="flashcard-header">
                  {hasDiagram ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.45)',
                          padding: '3px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                        }}
                      >
                        Diagram Flashcard
                      </span>
                      {currentCard.category && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {currentCard.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flashcard-category">{currentCard.category || 'General'}</span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sourcePage && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Page {sourcePage}
                      </span>
                    )}
                    <span className={`flashcard-difficulty difficulty-${currentCard.difficulty || 'medium'}`}>
                      {currentCard.difficulty || 'medium'}
                    </span>
                  </div>
                </div>

                <div className="flashcard-body" style={{ textAlign: hasDiagram ? 'left' : 'center', padding: hasDiagram ? '8px 0' : '20px 0' }}>
                  <h3
                    style={{
                      fontSize: hasDiagram ? '1.02rem' : '1.18rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: hasDiagram ? '12px' : '0',
                      lineHeight: 1.45,
                    }}
                  >
                    Front — {currentCard.front.replace(/^(front\s*[-—:]\s*)+/i, '').trim()}
                  </h3>

                  {/* High-Resolution Diagram Showcase */}
                  {currentCard.figureUrl && (
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '12px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'zoom-in',
                        maxHeight: '270px',
                        overflow: 'hidden',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDiagram({
                          url: currentCard.figureUrl!,
                          caption: currentCard.figureCaption,
                        });
                      }}
                      title="Click to zoom diagram"
                    >
                      <img
                        src={currentCard.figureUrl}
                        alt={currentCard.figureCaption || 'Textbook Diagram'}
                        style={{
                          maxHeight: '246px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '10px',
                          background: 'rgba(15, 23, 42, 0.88)',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <Maximize2 size={12} />
                        <span>Zoom</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Citations footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <BookOpen size={12} />
                    <span>Textbook Grounded Active Recall</span>
                  </span>

                  <div className="flashcard-hint">
                    <RotateCw size={13} />
                    <span>[Space] reveal answer</span>
                  </div>
                </div>
              </div>

              {/* Card Back */}
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-header">
                  {hasDiagram ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.45)',
                          padding: '3px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        Diagram Solution
                      </span>
                      {currentCard.category && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {currentCard.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flashcard-category" style={{ color: 'var(--accent-purple)' }}>
                      Explanation & Key Takeaway
                    </span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sourcePage && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Page {sourcePage}
                      </span>
                    )}
                    {currentCard.userStatus === 'mastered' && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          color: 'var(--success)',
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={14} /> Mastered
                      </span>
                    )}
                  </div>
                </div>

                <div className="flashcard-body" style={{ textAlign: 'left', padding: '10px 0', overflowY: 'auto' }}>
                  <h4
                    style={{
                      fontSize: '0.96rem',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      marginBottom: '8px',
                    }}
                  >
                    Back — Explanation &amp; Mechanism:
                  </h4>
                  <p className="flashcard-text-back" style={{ textAlign: 'left', lineHeight: 1.68 }}>
                    {currentCard.back.replace(/^(back\s*[-—:]\s*)+/i, '').trim()}
                  </p>

                  {/* Compact diagram thumbnail on back */}
                  {currentCard.figureUrl && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '12px',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDiagram({
                          url: currentCard.figureUrl!,
                          caption: currentCard.figureCaption,
                        });
                      }}
                    >
                      <img
                        src={currentCard.figureUrl}
                        alt="Diagram thumbnail"
                        style={{ width: '48px', height: '40px', objectFit: 'contain', background: '#fff', borderRadius: '4px', padding: '2px' }}
                      />
                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>{currentCard.figureCaption || 'Inspect Source Diagram'}</span>
                      </div>
                      <Maximize2 size={14} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  )}
                </div>

                {/* Citations on back */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Click card to flip
                  </span>

                  <div className="flashcard-hint">
                    <RotateCw size={13} />
                    <span>[Space] flip</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bottom Controls & Mastery Actions */}
      <div className="flashcard-controls">
        <button
          className="btn"
          onClick={handlePrev}
          disabled={deck.length <= 1}
          style={{ minWidth: '100px' }}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        {/* Mastery Feedback Buttons */}
        <div className="flashcard-rating-actions">
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkStatus('learning');
            }}
            style={{
              borderColor: 'rgba(245, 158, 11, 0.4)',
              color: 'var(--warning)',
              fontSize: '0.82rem',
            }}
          >
            <HelpCircle size={15} />
            <span>Need Review</span>
          </button>

          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkStatus('mastered');
            }}
            style={{
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: 'var(--success)',
              fontSize: '0.82rem',
            }}
          >
            <CheckCircle2 size={15} />
            <span>Mark Mastered</span>
          </button>
        </div>

        <button
          className="btn"
          onClick={handleNext}
          disabled={deck.length <= 1}
          style={{ minWidth: '100px' }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Keyboard Shortcut Help */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '16px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>Space</kbd> Flip
        </span>
        <span>
          <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>←</kbd> Prev Card
        </span>
        <span>
          <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>→</kbd> Next Card
        </span>
      </div>

      {/* Diagram Fullscreen Lightbox Modal */}
      {expandedDiagram && (
        <div className="modal-backdrop" onClick={() => setExpandedDiagram(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '850px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {expandedDiagram.caption || 'Original Textbook Figure'}
              </h3>
              <button className="btn btn-icon" onClick={() => setExpandedDiagram(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '16px' }}>
              <img
                src={expandedDiagram.url}
                alt={expandedDiagram.caption || 'Textbook Diagram'}
                style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
