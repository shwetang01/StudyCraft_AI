'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Zap,
  ArrowRight,
  Trophy,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion } from '@/lib/types';
import { sounds } from '@/lib/soundEffects';

interface QuizEngineProps {
  initialQuestions: QuizQuestion[];
  onUpdateQuizProgress?: (questions: QuizQuestion[]) => void;
}

export function QuizEngine({ initialQuestions, onUpdateQuizProgress }: QuizEngineProps) {
  // Master list of questions
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  // Active questions being tested (could be all, or filtered to wrong answers only)
  const [activeSet, setActiveSet] = useState<QuizQuestion[]>(initialQuestions);
  const [isRetestingMode, setIsRetestingMode] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  const prevQuestionsRef = React.useRef(initialQuestions);

  // Sync only if questions array IDs or structure changes externally (e.g. from refinement)
  useEffect(() => {
    const prevIds = prevQuestionsRef.current.map((q) => q.id).join(',');
    const newIds = initialQuestions.map((q) => q.id).join(',');

    if (prevIds !== newIds) {
      prevQuestionsRef.current = initialQuestions;
      setQuestions(initialQuestions);
      setActiveSet(initialQuestions);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setIsQuizCompleted(false);
      setIsRetestingMode(false);
    }
  }, [initialQuestions]);

  const currentQ = activeSet[currentIndex] || activeSet[0];

  const handleNextQuestion = React.useCallback(() => {
    if (currentIndex + 1 < activeSet.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      setIsQuizCompleted(true);

      // Trigger celebration if high score
      const correctAnswers = activeSet.filter((q) => q.userAnswerIndex === q.correctAnswerIndex).length;
      if (correctAnswers / activeSet.length >= 0.7) {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignored
        }
      }
    }
  }, [currentIndex, activeSet]);

  const handleSelectOption = React.useCallback(
    (index: number) => {
      if (isAnswerRevealed || !currentQ) return; // Prevent changing after answer reveal
      setSelectedOption(index);
      setIsAnswerRevealed(true);

      const isCorrect = index === currentQ.correctAnswerIndex;

      // Update in active set
      const updatedActive = [...activeSet];
      updatedActive[currentIndex] = {
        ...currentQ,
        userAnswerIndex: index,
      };
      setActiveSet(updatedActive);

      // Also update in master questions list
      const updatedMaster = questions.map((q) => (q.id === currentQ.id ? updatedActive[currentIndex] : q));
      setQuestions(updatedMaster);
      onUpdateQuizProgress?.(updatedMaster);

      // Trigger feedback sounds and mini confetti on answer
      if (isCorrect) {
        sounds.playCorrect();
        try {
          confetti({
            particleCount: 25,
            spread: 40,
            origin: { y: 0.7 },
          });
        } catch {
          // Safe if canvas-confetti is not loaded
        }
      } else {
        sounds.playWrong();
      }
    },
    [isAnswerRevealed, currentQ, currentIndex, activeSet, questions, onUpdateQuizProgress]
  );

  // Keyboard navigation for quiz options (1-4, A-D) and advancing (Enter, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (isQuizCompleted) return;

      if (!isAnswerRevealed) {
        const key = e.key.toLowerCase();
        if (key === '1' || key === 'a') {
          e.preventDefault();
          handleSelectOption(0);
        } else if (key === '2' || key === 'b') {
          e.preventDefault();
          handleSelectOption(1);
        } else if (key === '3' || key === 'c') {
          e.preventDefault();
          handleSelectOption(2);
        } else if (key === '4' || key === 'd') {
          e.preventDefault();
          handleSelectOption(3);
        }
      } else {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, isQuizCompleted, handleSelectOption, handleNextQuestion]);

  // Re-Test Wrong Answers Mode (PDF Explicit Requirement!)
  const handleStartRetestWrongAnswers = () => {
    const wrongQuestions = activeSet
      .filter((q) => q.userAnswerIndex !== q.correctAnswerIndex)
      .map((q) => ({
        ...q,
        userAnswerIndex: undefined, // Reset previous answer
      }));

    if (wrongQuestions.length === 0) return;

    setActiveSet(wrongQuestions);
    setIsRetestingMode(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setIsQuizCompleted(false);
  };

  // Reset and retake all questions
  const handleRetakeFullQuiz = () => {
    const reset = questions.map((q) => ({ ...q, userAnswerIndex: undefined }));
    setQuestions(reset);
    setActiveSet(reset);
    setIsRetestingMode(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setIsQuizCompleted(false);
  };

  if (!currentQ) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px' }}>
        <p>No quiz questions available.</p>
      </div>
    );
  }

  // Quiz Results Summary Screen
  if (isQuizCompleted) {
    const total = activeSet.length;
    const correctCount = activeSet.filter((q) => q.userAnswerIndex === q.correctAnswerIndex).length;
    const wrongCount = total - correctCount;
    const scorePct = Math.round((correctCount / total) * 100);

    return (
      <div className="glass-card quiz-container quiz-summary-card">
        <div style={{ marginBottom: '16px' }}>
          <span className="brand-badge" style={{ fontSize: '0.8rem' }}>
            {isRetestingMode ? 'Re-Test Assessment Complete' : 'Quiz Complete'}
          </span>
        </div>

        <div
          className="score-circle"
          style={{ ['--score-pct' as unknown as string]: scorePct }}
        >
          <div className="score-circle-inner">
            <span className="score-number">{scorePct}%</span>
            <span className="score-label">{correctCount} of {total}</span>
          </div>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
          {scorePct === 100
            ? '🎉 Flawless Mastery!'
            : scorePct >= 75
            ? '🌟 Great Understanding!'
            : '📚 Good Effort — Time to Review Mistakes!'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px' }}>
          {wrongCount === 0
            ? 'You correctly answered every single question in this session.'
            : `You have ${wrongCount} concept${wrongCount > 1 ? 's' : ''} to reinforce. You can isolate and re-test them right now.`}
        </p>

        {/* Action Buttons */}
        <div className="quiz-summary-actions">
          {wrongCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleStartRetestWrongAnswers}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)',
              }}
            >
              <Zap size={16} />
              <span>Re-Test {wrongCount} Wrong Answer{wrongCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <button className="btn" onClick={handleRetakeFullQuiz}>
            <RotateCcw size={16} />
            <span>Retake Full Quiz</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Question Screen
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
  const progressPercent = Math.round(((currentIndex + 1) / activeSet.length) * 100);

  return (
    <div className="glass-card quiz-container">
      {/* Quiz Progress & Mode Indicator */}
      <div className="quiz-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Question {currentIndex + 1} of {activeSet.length}
          </span>
          {isRetestingMode && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              ⚡ Re-Testing Mistakes
            </span>
          )}
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {progressPercent}% Complete
        </span>
      </div>

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Question Card */}
      <div className="quiz-question-card">
        <h3 className="quiz-question-text">{currentQ.question}</h3>

        <div className="quiz-options-list">
          {currentQ.options.map((optionText, idx) => {
            let stateClass = '';
            let indicatorIcon = null;

            if (isAnswerRevealed) {
              if (idx === currentQ.correctAnswerIndex) {
                stateClass = 'is-correct';
                indicatorIcon = <CheckCircle size={18} style={{ color: 'var(--success)' }} />;
              } else if (selectedOption === idx) {
                stateClass = 'is-wrong';
                indicatorIcon = <XCircle size={18} style={{ color: 'var(--error)' }} />;
              }
            } else if (selectedOption === idx) {
              stateClass = 'is-selected';
            }

            return (
              <button
                key={idx}
                type="button"
                className={`quiz-option-item ${stateClass}`}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerRevealed}
              >
                <span className="quiz-option-letter">{optionLetters[idx] || idx + 1}</span>
                <span style={{ flex: 1 }}>{optionText}</span>
                {indicatorIcon}
              </button>
            );
          })}
        </div>

        {/* Explanation Card upon Answer */}
        {isAnswerRevealed && (
          <div className="quiz-explanation-box">
            <div
              style={{
                fontWeight: 700,
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color:
                  selectedOption === currentQ.correctAnswerIndex
                    ? 'var(--success)'
                    : 'var(--accent-primary)',
              }}
            >
              <AlertCircle size={16} />
              <span>
                {selectedOption === currentQ.correctAnswerIndex
                  ? 'Correct Answer!'
                  : 'Explanation & Concept Note'}
              </span>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
              {currentQ.explanation || 'Review the core notes for this question.'}
            </p>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleNextQuestion}>
                <span>{currentIndex + 1 === activeSet.length ? 'Finish Quiz' : 'Next Question'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '12px',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>1-4</kbd> or{' '}
          <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>A-D</kbd> Select Option
        </span>
        {isAnswerRevealed && (
          <span>
            <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>Enter</kbd> Next Question
          </span>
        )}
      </div>
    </div>
  );
}
