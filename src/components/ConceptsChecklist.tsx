'use client';

import React from 'react';
import { Check, BookOpen, Layers } from 'lucide-react';
import { KeyConcept } from '@/lib/types';

interface ConceptsChecklistProps {
  concepts: KeyConcept[];
  onToggleConcept: (id: string) => void;
}

export function ConceptsChecklist({ concepts, onToggleConcept }: ConceptsChecklistProps) {
  const masteredCount = concepts.filter((c) => c.mastered).length;
  const progressPct =
    concepts.length > 0 ? Math.round((masteredCount / concepts.length) * 100) : 0;

  if (concepts.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px' }}>
        <p>No key concepts recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header & Progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Key Concepts & Principles</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Check off key takeaways as you internalize them to track topic mastery.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {masteredCount} / {concepts.length}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {progressPct}% Mastered
          </div>
        </div>
      </div>

      <div className="quiz-progress-bar" style={{ marginBottom: '24px' }}>
        <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Concept Items */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {concepts.map((item) => (
          <div
            key={item.id}
            className={`concept-item ${item.mastered ? 'is-checked' : ''}`}
            onClick={() => onToggleConcept(item.id)}
            role="checkbox"
            aria-checked={item.mastered}
            tabIndex={0}
          >
            <div className="concept-checkbox">
              {item.mastered && <Check size={14} />}
            </div>

            <div style={{ flex: 1 }}>
              <div
                className="concept-title"
                style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px' }}
              >
                {item.concept}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.summary}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
