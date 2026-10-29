'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

interface RefinementInputProps {
  onRefine: (instruction: string) => void;
  isRefining: boolean;
}

const REFINEMENT_PRESETS = [
  '⚡ Add 2 harder questions with edge cases',
  '💡 Include more practical real-world examples',
  '🎯 Focus on common pitfalls and misconceptions',
  '📖 Add cards explaining key terminology',
];

export function RefinementInput({ onRefine, isRefining }: RefinementInputProps) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim() && !isRefining) {
      onRefine(instruction.trim());
      setInstruction('');
    }
  };

  const handleSelectPreset = (preset: string) => {
    // Strip leading emoji
    const cleaned = preset.replace(/^[^\w]+/, '').trim();
    setInstruction(cleaned);
  };

  return (
    <div className="glass-card refinement-card" style={{ maxWidth: '820px', margin: '32px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Wand2 size={18} style={{ color: 'var(--accent-purple)' }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>AI Refinement Loop</h3>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        Modify, expand, or adjust the difficulty of this study session dynamically without losing your progress.
      </p>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0 14px' }}>
        {REFINEMENT_PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="preset-pill"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            onClick={() => handleSelectPreset(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="refinement-input-row">
        <input
          type="text"
          className="refinement-input"
          placeholder="E.g., 'Add a difficult question testing failure recovery' or 'Simplify flashcard #1'..."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={isRefining}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!instruction.trim() || isRefining}
          style={{ whiteSpace: 'nowrap', padding: '10px 18px' }}
        >
          {isRefining ? (
            <>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Refining...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Apply Refinement</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
