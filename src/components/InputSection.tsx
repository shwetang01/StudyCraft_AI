'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, BookOpen, Layers } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  hasActiveSession: boolean;
  onClearSession: () => void;
}

const PRESET_TOPICS = [
  {
    label: '🌿 Cellular Biology',
    prompt:
      'Photosynthesis and Cellular Respiration: Detail the light-dependent reactions in thylakoid membranes, Calvin cycle carbon fixation via RuBisCO, glycolysis in cytosol, and oxidative phosphorylation yielding ATP in mitochondria.',
  },
  {
    label: '⚡ Distributed Systems',
    prompt:
      'System Design & Caching Topologies: Cover CAP theorem tradeoffs, Write-Through vs Write-Back cache policies, cache stampede mitigation, consistent hashing rings with virtual nodes, and API idempotency keys.',
  },
  {
    label: '⚛️ Quantum Computing',
    prompt:
      'Quantum Computing Foundations: Explain qubits vs classical bits, superposition, quantum entanglement, no-cloning theorem, and Shor/Grover quantum algorithm speedups.',
  },
  {
    label: '🏛️ Roman History',
    prompt:
      'Transition from Roman Republic to Empire: Fall of the Republic, Julius Caesar crossing the Rubicon, the Augustan principate, Pax Romana, and governance restructuring.',
  },
];

export function InputSection({
  onGenerate,
  isLoading,
  hasActiveSession,
  onClearSession,
}: InputSectionProps) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onGenerate(inputText.trim());
    }
  };

  const handleSelectPreset = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <section className="hero-section">
      <div className="hero-tag">
        <Sparkles size={14} />
        <span>Structured AI Learning Engine</span>
      </div>

      <h1 className="hero-title">
        Transform Any Topic into an{' '}
        <span
          style={{
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Interactive Study Suite
        </span>
      </h1>

      <p className="hero-subtitle">
        Paste lecture notes, study materials, or enter any subject. The AI parses the concepts into
        interactive 3D flashcards, an adaptive self-testing quiz, and mastery checklists.
      </p>

      {/* Preset Pills */}
      <div className="preset-pills-row" style={{ justifyContent: 'center' }}>
        <span className="preset-label">Quick Presets:</span>
        {PRESET_TOPICS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            className="preset-pill"
            onClick={() => handleSelectPreset(preset.prompt)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'left' }}>
        <div className="input-textarea-wrapper">
          <textarea
            className="input-textarea"
            placeholder="Paste your raw notes, an article snippet, or describe any topic you want to study (e.g., 'Key concepts of microservices architecture')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            rows={4}
          />
          <div className="input-footer">
            <span className="input-char-count">{inputText.length} characters</span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {hasActiveSession && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClearSession}
                  disabled={isLoading}
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  <RefreshCw size={14} />
                  <span>Start New Topic</span>
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputText.trim() || isLoading}
                style={{ padding: '8px 20px' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Analyzing & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Study Suite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
