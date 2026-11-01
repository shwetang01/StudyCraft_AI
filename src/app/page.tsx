'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  HelpCircle,
  CheckSquare,
  BarChart3,
  AlertCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  XCircle,
  BrainCircuit,
  Zap,
  LayoutGrid,
  ListFilter,
  Search,
  UploadCloud,
  Library,
  ArrowRight,
} from 'lucide-react';
import { AppSidebar, MainNavId } from '@/components/AppSidebar';
import { AppTopNav } from '@/components/AppTopNav';
import { BookLibraryView } from '@/components/BookLibraryView';
import { BookQAPanel } from '@/components/BookQAPanel';
import { FlashcardDeck } from '@/components/FlashcardDeck';
import { QuizEngine } from '@/components/QuizEngine';
import { InputSection } from '@/components/InputSection';
import { ConceptsChecklist } from '@/components/ConceptsChecklist';
import { RefinementInput } from '@/components/RefinementInput';
import { SavedSessionsModal } from '@/components/SavedSessionsModal';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { useAIGenerator } from '@/hooks/useAIGenerator';
import { Book, Flashcard, StudySession } from '@/lib/types';

export default function HomePage() {
  const {
    session,
    isGenerating,
    isRefining,
    error,
    apiKeyOverride,
    saveApiKeys,
    generate,
    refine,
    retry,
    cancelGeneration,
    clearSession,
    loadSession,
    updateSession,
    dismissError,
  } = useAIGenerator();

  // Navigation State
  const [activeNav, setActiveNav] = useState<MainNavId>('ask');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

  // Book RAG State
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  // Study Suite view mode
  const [suiteViewMode, setSuiteViewMode] = useState<'tabbed' | 'all'>('tabbed');
  const [suiteActiveTab, setSuiteActiveTab] = useState<'flashcards' | 'quiz' | 'checklist' | 'analytics'>('flashcards');

  // Fetch ingested books on mount
  const fetchBooks = useCallback(async () => {
    setIsLoadingBooks(true);
    try {
      const res = await fetch('/api/books');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBooks(json.data);
        if (json.data.length > 0 && !selectedBook) {
          setSelectedBook(json.data[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch books:', err);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [selectedBook]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle flashcard mastery updates
  const handleUpdateCardStatus = (cardId: string, status: 'learning' | 'mastered') => {
    updateSession((prev) => ({
      ...prev,
      flashcards: prev.flashcards.map((c) =>
        c.id === cardId ? { ...c, userStatus: status } : c
      ),
    }));
  };

  // Handle key concepts checklist toggles
  const handleToggleConcept = (conceptId: string) => {
    updateSession((prev) => ({
      ...prev,
      keyConcepts: prev.keyConcepts.map((c) =>
        c.id === conceptId ? { ...c, mastered: !c.mastered } : c
      ),
    }));
  };

  // Handle quiz questions progress updates
  const handleUpdateQuizProgress = (updatedQuiz: import('@/lib/types').QuizQuestion[]) => {
    updateSession((prev) => ({
      ...prev,
      quiz: updatedQuiz,
    }));
  };

  const handleBookUploaded = (newBook: Book) => {
    setBooks((prev) => {
      const filtered = prev.filter((b) => b.id !== newBook.id);
      return [newBook, ...filtered];
    });
    setSelectedBook(newBook);
    setShowUploader(false);
    setActiveNav('ask');
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (selectedBook?.id === bookId) {
        const remaining = books.filter((b) => b.id !== bookId);
        setSelectedBook(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  const handleRetryIngest = async (bookId: string) => {
    try {
      await fetch(`/api/books/${bookId}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyOverride }),
      });
      fetchBooks();
    } catch (err) {
      console.error('Failed to retry ingestion:', err);
    }
  };

  const handleLoadBookFlashcards = (cards: Flashcard[]) => {
    if (!selectedBook) return;
    const newSession: StudySession = {
      id: `book_session_${selectedBook.id}_${Date.now()}`,
      title: `${selectedBook.title} — Book Study Deck`,
      topic: selectedBook.title,
      summary: `Active recall deck with original textbook diagrams and page citations synthesized from "${selectedBook.title}".`,
      keyConcepts: [],
      flashcards: cards,
      quiz: session?.quiz || [],
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      bookId: selectedBook.id,
    };
    loadSession(newSession);
    setActiveNav('flashcards');
  };

  const handleGenerateQuizFromAnswer = async (topic: string, contextText?: string) => {
    const prompt = `Textbook: ${selectedBook?.title || 'Physics'}\nTopic: ${topic}\n\nContext excerpt:\n${contextText?.slice(0, 1400) || ''}`;
    setActiveNav('quiz');
    await generate(prompt, 'none');
  };

  const hasCustomKey = Boolean(
    apiKeyOverride?.gemini || apiKeyOverride?.groq || apiKeyOverride?.openai
  );

  return (
    <div className="studycraft-app-shell">
      {/* Collapsible Sidebar Navigation */}
      <AppSidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        booksCount={books.length}
        cardsCount={session?.flashcards?.length || 0}
        quizCount={session?.quiz?.length || 0}
      />

      {/* Main Content Area */}
      <div className="studycraft-main">
        {/* Top Navigation */}
        <AppTopNav
          selectedBook={selectedBook}
          books={books}
          onSelectBook={(b) => setSelectedBook(b)}
          onOpenUpload={() => {
            setActiveNav('books');
            setShowUploader(true);
          }}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenApiKey={() => setIsApiKeyOpen(true)}
          hasCustomKey={hasCustomKey}
        />

        {/* Global Error Banner */}
        {error && (
          <div style={{ maxWidth: '1200px', margin: '16px auto 0', padding: '0 24px', width: '100%' }}>
            <div className="error-banner">
              <div className="error-header">
                <div className="error-title">
                  <AlertCircle size={18} />
                  <span>AI Pipeline Anomaly Intercepted</span>
                </div>
                <span className="error-code">{error.code}</span>
              </div>
              <p className="error-message">{error.message}</p>
              <div className="error-actions">
                <button className="btn btn-primary" onClick={retry} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  <RotateCcw size={14} />
                  <span>Retry Generation</span>
                </button>
                <button className="btn btn-ghost" onClick={dismissError} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Loading State for AI Generation */}
        {isGenerating && (
          <div className="studycraft-workspace" style={{ maxWidth: '780px' }}>
            <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
              <div className="skeleton" style={{ height: '32px', width: '60%', margin: '0 auto 16px' }} />
              <div className="skeleton" style={{ height: '20px', width: '85%', margin: '0 auto 24px' }} />
              <div className="skeleton" style={{ height: '240px', width: '100%', marginBottom: '24px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <span>Synthesizing structured study materials with Gemini...</span>
                </div>

                <button
                  className="btn btn-ghost"
                  onClick={cancelGeneration}
                  style={{ color: 'var(--error)', fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  <XCircle size={15} />
                  <span>Cancel Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Main Workspace depending on activeNav */}
        {!isGenerating && (
          <main className="studycraft-workspace">
            {/* VIEW 1: ASK THE BOOK (AI Study Workspace) */}
            {activeNav === 'ask' && (
              <>
                {selectedBook ? (
                  <BookQAPanel
                    book={selectedBook}
                    onGenerateFlashcards={handleLoadBookFlashcards}
                    onGenerateQuiz={handleGenerateQuizFromAnswer}
                    apiKeyOverride={apiKeyOverride}
                  />
                ) : (
                  <div className="glass-card" style={{ maxWidth: '720px', margin: '48px auto', textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <BookOpen size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
                      No Textbook Selected
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 24px' }}>
                      Choose an ingested book from your library or upload a new PDF textbook to start asking grounded questions.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveNav('books')}
                      style={{ gap: '6px' }}
                    >
                      <Library size={16} />
                      <span>Open Textbook Library</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: MY BOOKS (Textbook Library & Ingestion) */}
            {activeNav === 'books' && (
              <BookLibraryView
                books={books}
                selectedBook={selectedBook}
                onSelectBook={(b) => {
                  setSelectedBook(b);
                }}
                onOpenStudyWorkspace={(b) => {
                  setSelectedBook(b);
                  setActiveNav('ask');
                }}
                onDeleteBook={handleDeleteBook}
                onRetryIngest={handleRetryIngest}
                onBookUploaded={handleBookUploaded}
                showUploader={showUploader}
                setShowUploader={setShowUploader}
                isLoading={isLoadingBooks}
              />
            )}

            {/* VIEW 3: FLASHCARDS (Active Recall with Diagrams) */}
            {activeNav === 'flashcards' && (
              <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      Visual Flashcards & Active Recall
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      Reinforce key definitions and original textbook diagrams with 3D card flipping.
                    </p>
                  </div>

                  {selectedBook && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveNav('ask')}
                      style={{ fontSize: '0.8rem', gap: '6px' }}
                    >
                      <Search size={14} />
                      <span>Ask Textbook</span>
                    </button>
                  )}
                </div>

                {session?.flashcards && session.flashcards.length > 0 ? (
                  <FlashcardDeck
                    cards={session.flashcards}
                    onUpdateCardStatus={handleUpdateCardStatus}
                  />
                ) : (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Layers size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
                      No Flashcards in Active Deck
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                      Synthesize cards directly from your textbook in &quot;Ask the Book&quot; or generate a deck from raw notes.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      {selectedBook && (
                        <button
                          className="btn btn-primary"
                          onClick={() => setActiveNav('ask')}
                          style={{ fontSize: '0.84rem', gap: '6px' }}
                        >
                          <BookOpen size={15} />
                          <span>Generate from &quot;{selectedBook.title}&quot;</span>
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveNav('suite')}
                        style={{ fontSize: '0.84rem' }}
                      >
                        Create from Custom Notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: QUIZZES (Adaptive Testing) */}
            {activeNav === 'quiz' && (
              <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      Adaptive Concept Quiz
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      Test your understanding with pedagogical rationales and targeted wrong-answer re-testing.
                    </p>
                  </div>

                  {selectedBook && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveNav('ask')}
                      style={{ fontSize: '0.8rem', gap: '6px' }}
                    >
                      <Search size={14} />
                      <span>Back to Study</span>
                    </button>
                  )}
                </div>

                {session?.quiz && session.quiz.length > 0 ? (
                  <QuizEngine
                    key={session.id}
                    initialQuestions={session.quiz}
                    onUpdateQuizProgress={handleUpdateQuizProgress}
                  />
                ) : (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <HelpCircle size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
                      No Active Quiz Available
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                      Ask a concept in &quot;Ask the Book&quot; and click &quot;Generate Quiz&quot;, or input custom notes in the Study Suite.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      {selectedBook && (
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            if (selectedBook) {
                              handleGenerateQuizFromAnswer(selectedBook.title, 'Foundational principles');
                            }
                          }}
                          style={{ fontSize: '0.84rem', gap: '6px' }}
                        >
                          <Sparkles size={15} />
                          <span>Generate Quiz for &quot;{selectedBook.title}&quot;</span>
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveNav('suite')}
                        style={{ fontSize: '0.84rem' }}
                      >
                        Create from Custom Topic
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: TOPIC STUDY SUITE GENERATOR */}
            {activeNav === 'suite' && (
              <div>
                <InputSection
                  onGenerate={(prompt) => generate(prompt, 'none')}
                  isLoading={isGenerating}
                  hasActiveSession={!!session}
                  onClearSession={clearSession}
                />

                {session && (
                  <div style={{ marginTop: '32px' }}>
                    {/* View Selection Tabs */}
                    <div className="tabs-container" style={{ maxWidth: '820px', margin: '0 auto 24px' }}>
                      <button
                        className={`tab-btn ${suiteActiveTab === 'flashcards' ? 'is-active' : ''}`}
                        onClick={() => setSuiteActiveTab('flashcards')}
                      >
                        <Layers size={16} />
                        <span>Flashcards ({session.flashcards.length})</span>
                      </button>

                      <button
                        className={`tab-btn ${suiteActiveTab === 'quiz' ? 'is-active' : ''}`}
                        onClick={() => setSuiteActiveTab('quiz')}
                      >
                        <HelpCircle size={16} />
                        <span>Quiz ({session.quiz.length})</span>
                      </button>

                      <button
                        className={`tab-btn ${suiteActiveTab === 'checklist' ? 'is-active' : ''}`}
                        onClick={() => setSuiteActiveTab('checklist')}
                      >
                        <CheckSquare size={16} />
                        <span>Key Concepts ({session.keyConcepts.length})</span>
                      </button>
                    </div>

                    {suiteActiveTab === 'flashcards' && (
                      <FlashcardDeck
                        cards={session.flashcards}
                        onUpdateCardStatus={handleUpdateCardStatus}
                      />
                    )}

                    {suiteActiveTab === 'quiz' && (
                      <QuizEngine
                        key={session.id}
                        initialQuestions={session.quiz}
                        onUpdateQuizProgress={handleUpdateQuizProgress}
                      />
                    )}

                    {suiteActiveTab === 'checklist' && (
                      <ConceptsChecklist
                        concepts={session.keyConcepts}
                        onToggleConcept={handleToggleConcept}
                      />
                    )}

                    {/* Refinement Loop */}
                    <div style={{ marginTop: '28px' }}>
                      <RefinementInput onRefine={(instruction) => refine(instruction, 'none')} isRefining={isRefining} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      {/* Saved Sessions Modal */}
      <SavedSessionsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={(sess) => {
          loadSession(sess);
          if (sess.flashcards && sess.flashcards.length > 0) {
            setActiveNav('flashcards');
          } else if (sess.quiz && sess.quiz.length > 0) {
            setActiveNav('quiz');
          }
        }}
      />

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        savedKeys={apiKeyOverride}
        onSaveKeys={saveApiKeys}
      />
    </div>
  );
}
