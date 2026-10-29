'use client';

import React, { useState } from 'react';
import { Key, X, ShieldCheck, Check, Sparkles } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedKeys?: { gemini?: string; groq?: string; openai?: string };
  onSaveKeys: (keys: { gemini?: string; groq?: string; openai?: string }) => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  savedKeys,
  onSaveKeys,
}: ApiKeyModalProps) {
  const [gemini, setGemini] = useState(savedKeys?.gemini || '');
  const [groq, setGroq] = useState(savedKeys?.groq || '');
  const [openai, setOpenai] = useState(savedKeys?.openai || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKeys({
      gemini: gemini.trim() || undefined,
      groq: groq.trim() || undefined,
      openai: openai.trim() || undefined,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setGemini('');
    setGroq('');
    setOpenai('');
    onSaveKeys({});
  };

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
        zIndex: 250,
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
          maxWidth: '520px',
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
            <Key size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>LLM API Settings</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          StudyCraft AI works <strong>100% out of the box</strong> using the built-in Intelligent Mock Engine. 
          If you want to test with live AI models, paste your key below. Keys are strictly routed through 
          server-side Next.js functions and never exposed to client-side bundles.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Google Gemini API Key (Free tier)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              className="refinement-input"
              style={{ width: '100%' }}
              value={gemini}
              onChange={(e) => setGemini(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              Groq API Key (Free tier / Llama 3.3)
            </label>
            <input
              type="password"
              placeholder="gsk_..."
              className="refinement-input"
              style={{ width: '100%' }}
              value={groq}
              onChange={(e) => setGroq(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              OpenAI API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="sk-..."
              className="refinement-input"
              style={{ width: '100%' }}
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
            />
          </div>

          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.74rem',
              color: '#c7d2fe',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>If all fields are blank, the app seamlessly defaults to the offline mock generator.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClear}
              style={{ fontSize: '0.82rem' }}
            >
              Clear Keys (Use Mock)
            </button>

            <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
              {isSaved ? (
                <>
                  <Check size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
