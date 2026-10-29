'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Moon, Sun, History, Key, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '@/lib/soundEffects';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenApiKey: () => void;
  hasCustomKey?: boolean;
  modelUsed?: string;
}

export function Header({
  onOpenHistory,
  onOpenApiKey,
  hasCustomKey,
  modelUsed,
}: HeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMuted, setIsMuted] = useState(false);

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
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">StudyCraft</span>
            <span className="brand-badge">Study Suite</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {modelUsed ? `Active: ${modelUsed}` : 'Interactive Flashcards & Adaptive Quizzes'}
          </div>
        </div>
      </div>

      <div className="header-actions">
        {/* API Key Modal Trigger */}
        <button
          className="btn btn-icon"
          onClick={onOpenApiKey}
          title={hasCustomKey ? 'Custom API Key Active' : 'API Key Settings'}
          aria-label="API Key Settings"
          style={hasCustomKey ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : undefined}
        >
          <Key size={18} />
        </button>

        {/* Sound Toggle */}
        <button
          className="btn btn-icon"
          onClick={toggleSound}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label="Toggle Sound Effects"
        >
          {isMuted ? <VolumeX size={18} style={{ color: 'var(--text-muted)' }} /> : <Volume2 size={18} style={{ color: 'var(--accent-cyan)' }} />}
        </button>

        {/* History Modal Trigger */}
        <button
          className="btn btn-icon"
          onClick={onOpenHistory}
          title="Saved Study Sessions"
          aria-label="View Saved Sessions"
        >
          <History size={18} />
        </button>

        {/* Dark / Light Toggle */}
        <button
          className="btn btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Color Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
