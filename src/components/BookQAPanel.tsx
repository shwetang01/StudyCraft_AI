'use client';

import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Quote,
  Layers,
  Loader2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  FileText,
  ChevronRight,
  ExternalLink,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Book, BookFigure, BookQAResult, Citation, Flashcard, RetrievalDebugInfo } from '@/lib/types';

interface BookQAPanelProps {
  book: Book;
  onGenerateFlashcards: (cards: Flashcard[]) => void;
  onGenerateQuiz?: (topic: string, contextText?: string) => void;
  apiKeyOverride?: { gemini?: string };
}

function renderInlineBold(str: string) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderFormattedAnswer(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} style={{ margin: '8px 0 14px 20px', lineHeight: 1.68 }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '5px' }}>
              {renderInlineBold(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      flushList(`list-before-h3-${index}`);
      elements.push(
        <h4
          key={`h3-${index}`}
          style={{
            fontSize: '1.08rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginTop: index === 0 ? '0px' : '20px',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith('#### ')) {
      flushList(`list-before-h4-${index}`);
      elements.push(
        <h5
          key={`h4-${index}`}
          style={{
            fontSize: '0.96rem',
            fontWeight: 700,
            color: 'var(--accent-primary)',
            marginTop: '14px',
            marginBottom: '6px',
          }}
        >
          {trimmed.slice(5)}
        </h5>
      );
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed.length > 0) {
      flushList(`list-before-p-${index}`);
      elements.push(
        <p key={`p-${index}`} style={{ margin: '0 0 12px 0', lineHeight: 1.68 }}>
          {renderInlineBold(line)}
        </p>
      );
    } else {
      flushList(`list-empty-${index}`);
    }
  });

  flushList('list-end');
  return <div style={{ fontSize: '0.98rem', color: 'var(--text-secondary)' }}>{elements}</div>;
}

function DevDiagnosticsSection({ debug }: { debug: RetrievalDebugInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);

  const passedCount = debug.chunks.filter((c) => c.passed_threshold).length;

  return (
    <div
      style={{
        marginTop: '24px',
        borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
        paddingTop: '16px',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '0.84rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
            🛠️ Retrieval Diagnostics (Development Mode)
          </span>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--success)',
              fontWeight: 600,
            }}
          >
            {passedCount} / {debug.total_candidates_evaluated} passed threshold
          </span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            fontSize: '0.82rem',
          }}
        >
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block' }}>
                Query Embedding
              </span>
              <strong style={{ color: debug.has_query_embedding ? 'var(--success)' : 'var(--warning)' }}>
                {debug.has_query_embedding ? 'Active (768-dim Gemini)' : 'Lexical Only Fallback'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block' }}>
                Lexical FTS Query
              </span>
              <code style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {debug.clean_fts_query}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block' }}>
                Candidates Evaluated
              </span>
              <strong>{debug.total_candidates_evaluated} chunks</strong>
            </div>
          </div>

          {/* Evaluated Chunks Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Source Page</th>
                  <th style={{ padding: '6px 8px' }}>Semantic</th>
                  <th style={{ padding: '6px 8px' }}>Keyword</th>
                  <th style={{ padding: '6px 8px' }}>Combined</th>
                  <th style={{ padding: '6px 8px' }}>Chunk ID & Text</th>
                </tr>
              </thead>
              <tbody>
                {debug.chunks.map((c) => {
                  const isExpanded = expandedChunkId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: c.passed_threshold ? 'transparent' : 'rgba(239, 68, 68, 0.03)',
                        }}
                      >
                        <td style={{ padding: '8px' }}>
                          {c.passed_threshold ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'var(--success)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={13} /> Passed
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'var(--text-muted)',
                                fontSize: '0.72rem',
                              }}
                            >
                              <XCircle size={13} /> Filtered
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>
                          Page {c.printed_page_number}{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            (pdf {c.pdf_page_index})
                          </span>
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>
                          {c.semantic_score.toFixed(3)}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>
                          {c.keyword_score.toFixed(3)}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {c.combined_score.toFixed(3)}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {c.id.slice(0, 8)}...
                            </code>
                            <button
                              type="button"
                              onClick={() => setExpandedChunkId(isExpanded ? null : c.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                padding: '2px 4px',
                                textDecoration: 'underline',
                              }}
                            >
                              {isExpanded ? 'Hide' : 'Inspect Text'}
                            </button>
                          </div>
                          {!isExpanded && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: '2px' }}>
                              {c.snippet}
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: '10px 14px', background: 'rgba(0, 0, 0, 0.25)' }}>
                            <div style={{ marginBottom: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <strong>Full Chunk ID:</strong> {c.id} (index #{c.chunk_index}) · <strong>Source Page:</strong> {c.printed_page_number}
                            </div>
                            <pre
                              style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                                margin: 0,
                                background: 'rgba(0,0,0,0.3)',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                              }}
                            >
                              {c.chunk_text || c.snippet}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookQAPanel({
  book,
  onGenerateFlashcards,
  onGenerateQuiz,
  apiKeyOverride,
}: BookQAPanelProps) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaResult, setQaResult] = useState<BookQAResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiagram, setSelectedDiagram] = useState<BookFigure | null>(null);
  const [activeFigureIdx, setActiveFigureIdx] = useState(0);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const isPhysicsBook = book.title.toLowerCase().includes('physic');

  const sampleQuestions = isPhysicsBook
    ? [
        "Explain Newton's second law of motion.",
        'Show the diagram of Atwood machine and explain the tension forces.',
        'What is the difference between static and kinetic friction?',
        'Derive the equations for uniform circular motion.',
      ]
    : [
        'Explain the core foundational principles with exact page citations.',
        'Show diagrams related to key mechanisms and explain them.',
        'What key trade-offs and constraints does the author highlight?',
        'Explain the primary methodology with supporting verbatim quotes.',
      ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || isAsking) return;

    if (queryText) setQuestion(queryText);

    setIsAsking(true);
    setError(null);
    setActiveFigureIdx(0);

    try {
      const res = await fetch(`/api/books/${book.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          topK: 7,
          apiKeyOverride,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to process grounded book question.');
      }

      setQaResult(json.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCreateFlashcardsFromBook = async () => {
    setIsGeneratingCards(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${book.id}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: question || 'foundational concepts',
          cardCount: 6,
          apiKeyOverride,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to generate book flashcards.');
      }

      onGenerateFlashcards(json.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleCreateQuizFromBook = () => {
    if (!onGenerateQuiz) return;
    setIsGeneratingQuiz(true);
    try {
      const topic = question || book.title;
      const contextText = qaResult?.supporting_quotes?.join('\n') || qaResult?.answer || '';
      onGenerateQuiz(topic, contextText);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const primaryFigure =
    qaResult?.figures && qaResult.figures.length > 0
      ? qaResult.figures[activeFigureIdx] || qaResult.figures[0]
      : null;

  return (
    <div style={{ maxWidth: primaryFigure ? '1280px' : '860px', margin: '0 auto 36px', transition: 'max-width 0.3s ease' }}>
      {/* Search Input Box */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              Ask Grounded Question: &quot;{book.title}&quot;
            </h3>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {book.total_pages ? `${book.total_pages} pages indexed` : 'Full vector search active'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '16px' }}>
          Synthesizes strict textbook citations, verbatim excerpts, mathematical equations, and original diagrams.
        </p>

        {/* Preset suggestions */}
        <div className="preset-pills-row" style={{ marginBottom: '14px' }}>
          <span className="preset-label">Suggestions:</span>
          {sampleQuestions.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-pill"
              onClick={() => handleAsk(sq)}
              disabled={isAsking}
              style={{ fontSize: '0.78rem' }}
            >
              {sq}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
        >
          <div className="input-textarea-wrapper">
            <textarea
              className="input-textarea"
              rows={3}
              placeholder="Ask anything about the book (e.g. 'Explain Newton\'s second law of motion', 'Show Atwood machine diagram', 'What is static friction?')..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isAsking}
            />

            <div className="input-footer">
              <span className="input-char-count">{question.length} characters</span>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!question.trim() || isAsking}
                style={{ padding: '8px 20px' }}
              >
                {isAsking ? (
                  <>
                    <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Searching Vectors & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Retrieve & Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            background: 'var(--error-bg)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isAsking && (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '24px', width: '45%', margin: '0 auto 14px' }} />
          <div className="skeleton" style={{ height: '16px', width: '80%', margin: '0 auto 10px' }} />
          <div className="skeleton" style={{ height: '16px', width: '70%', margin: '0 auto 20px' }} />
          <div className="skeleton" style={{ height: '180px', width: '100%' }} />
        </div>
      )}

      {/* QA Result Presentation */}
      {qaResult && !isAsking && (
        <div className={primaryFigure ? 'visual-learning-workspace' : ''}>
          {/* Main Answer Column */}
          <div className="glass-card" style={{ padding: '28px', marginBottom: primaryFigure ? '0' : '24px' }}>
            {/* Header & Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="brand-badge" style={{ fontSize: '0.75rem' }}>
                  Textbook-Grounded Answer
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {qaResult.duration_ms}ms · {qaResult.retrieved_chunks.length} excerpts
                </span>
              </div>

              {/* Action Buttons: Flashcards & Quizzes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateFlashcardsFromBook}
                  disabled={isGeneratingCards}
                  style={{ fontSize: '0.78rem', padding: '6px 12px', gap: '6px' }}
                  title="Synthesize 3D flashcards with original diagrams"
                >
                  {isGeneratingCards ? (
                    <>
                      <Loader2 size={13} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Layers size={13} />
                      <span>Create Flashcards</span>
                    </>
                  )}
                </button>

                {onGenerateQuiz && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleCreateQuizFromBook}
                    disabled={isGeneratingQuiz}
                    style={{ fontSize: '0.78rem', padding: '6px 12px', gap: '6px' }}
                    title="Generate multiple-choice quiz questions"
                  >
                    <HelpCircle size={13} style={{ color: 'var(--accent-purple)' }} />
                    <span>Generate Quiz</span>
                  </button>
                )}
              </div>
            </div>

            {/* Insufficient Evidence Notice */}
            {qaResult.is_insufficient && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--warning)',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} />
                <span>
                  <strong>Notice:</strong> The textbook excerpts do not provide sufficient evidence to answer this query reliably. Unsubstantiated claims are avoided.
                </span>
              </div>
            )}

            {/* Main Answer Text */}
            <div style={{ marginBottom: '24px' }}>
              {renderFormattedAnswer(qaResult.answer)}
            </div>

            {/* Page Citations Section */}
            {qaResult.citations.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>PAGE-LEVEL CITATIONS:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {qaResult.citations.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-secondary)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>📖 Page {c.printedPageNumber || c.pdfPageIndex + 1}</span>
                      {c.quote && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                          (&quot;{c.quote.slice(0, 36)}...&quot;)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supporting Quotes Section */}
            {qaResult.supporting_quotes.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Quote size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>SUPPORTING VERBATIM QUOTES:</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {qaResult.supporting_quotes.map((q, idx) => (
                    <blockquote
                      key={idx}
                      style={{
                        borderLeft: '3px solid var(--accent-cyan)',
                        paddingLeft: '12px',
                        margin: 0,
                        fontStyle: 'italic',
                        fontSize: '0.86rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        background: 'rgba(6, 182, 212, 0.04)',
                        padding: '8px 12px',
                        borderRadius: '0 8px 8px 0',
                      }}
                    >
                      &ldquo;{q}&rdquo;
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {/* Development Mode Diagnostics Drawer (Hidden in Production) */}
            {process.env.NODE_ENV !== 'production' && qaResult.debug && (
              <DevDiagnosticsSection debug={qaResult.debug} />
            )}
          </div>

          {/* Right Column: Original Diagram & Visual Learning Card */}
          {primaryFigure && (
            <div className="diagram-visual-card">
              <div className="diagram-viewer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={15} style={{ color: 'var(--accent-purple)' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Original Textbook Diagram
                  </span>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page {primaryFigure.printed_page_number || primaryFigure.pdf_page_index + 1}
                </span>
              </div>

              {/* High-Res Image Frame */}
              <div
                className="diagram-img-frame"
                onClick={() => setSelectedDiagram(primaryFigure)}
                title="Click to zoom in high-resolution"
              >
                <img
                  src={primaryFigure.signed_url || primaryFigure.storage_path}
                  alt={primaryFigure.caption || primaryFigure.figure_label || 'Textbook Diagram'}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid var(--border-subtle)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Maximize2 size={12} />
                  <span>Zoom</span>
                </div>
              </div>

              {/* Figure Title & Metadata */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '4px' }}>
                  {primaryFigure.figure_label || 'Textbook Figure'}
                </div>

                {primaryFigure.caption && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 8px 0' }}>
                    {primaryFigure.caption}
                  </p>
                )}

                {primaryFigure.description && (
                  <div
                    style={{
                      background: 'rgba(99, 102, 241, 0.06)',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: 'var(--accent-primary)' }}>Visual Mechanism: </strong>
                    {primaryFigure.description}
                  </div>
                )}
              </div>

              {/* Multiple Figures Switcher Pills */}
              {qaResult.figures.length > 1 && (
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    MORE RELATED DIAGRAMS:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {qaResult.figures.map((fig, idx) => (
                      <button
                        key={fig.id}
                        type="button"
                        onClick={() => setActiveFigureIdx(idx)}
                        style={{
                          background: activeFigureIdx === idx ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: activeFigureIdx === idx ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fig.figure_label || `Fig ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Selected Diagram */}
      {selectedDiagram && (
        <div className="modal-backdrop" onClick={() => setSelectedDiagram(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '880px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {selectedDiagram.figure_label || 'Original Diagram'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Source: &quot;{book.title}&quot; · Page {selectedDiagram.printed_page_number || selectedDiagram.pdf_page_index + 1}
                </span>
              </div>
              <button className="btn btn-icon" onClick={() => setSelectedDiagram(null)}>
                ✕
              </button>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '14px',
              }}
            >
              <img
                src={selectedDiagram.signed_url || selectedDiagram.storage_path}
                alt={selectedDiagram.caption || 'Diagram'}
                style={{ maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>

            {selectedDiagram.caption && (
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem' }}>Caption: </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedDiagram.caption}
                </span>
              </div>
            )}

            {selectedDiagram.description && (
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Visual Mechanism Description: </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedDiagram.description}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

