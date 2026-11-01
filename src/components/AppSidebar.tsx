'use client';

import React from 'react';
import {
  BookOpen,
  Search,
  Layers,
  HelpCircle,
  Sparkles,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Library,
  GraduationCap,
  X,
} from 'lucide-react';

export type MainNavId = 'ask' | 'books' | 'flashcards' | 'quiz' | 'suite';

interface AppSidebarProps {
  activeNav: MainNavId;
  onSelectNav: (id: MainNavId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenHistory: () => void;
  onOpenApiKey: () => void;
  booksCount?: number;
  cardsCount?: number;
  quizCount?: number;
}

export function AppSidebar({
  activeNav,
  onSelectNav,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenHistory,
  onOpenApiKey,
  booksCount = 0,
  cardsCount = 0,
  quizCount = 0,
}: AppSidebarProps) {
  const handleNavClick = (id: MainNavId) => {
    onSelectNav(id);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`studycraft-sidebar ${isCollapsed ? 'is-collapsed' : ''} ${
          isMobileOpen ? 'is-mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <GraduationCap size={20} />
            </div>
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-name">StudyCraft AI</span>
                <span className="sidebar-brand-tag">Concept Mastery</span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          {isMobileOpen && (
            <button
              className="btn btn-icon"
              onClick={onCloseMobile}
              style={{ width: '32px', height: '32px' }}
              aria-label="Close navigation drawer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Primary Study Navigation */}
        <nav className="sidebar-nav">
          {!isCollapsed && <div className="sidebar-nav-heading">Study Workspace</div>}

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'ask' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('ask')}
            title="Ask the Book (AI Study Workspace)"
          >
            <div className="sidebar-nav-icon">
              <Search size={18} />
            </div>
            {!isCollapsed && <span>Ask the Book</span>}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'books' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('books')}
            title="My Books (Textbook Library)"
          >
            <div className="sidebar-nav-icon">
              <Library size={18} />
            </div>
            {!isCollapsed && <span>My Books</span>}
            {!isCollapsed && booksCount > 0 && (
              <span className="sidebar-nav-badge">{booksCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'flashcards' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('flashcards')}
            title="Flashcards (Active Recall & Diagrams)"
          >
            <div className="sidebar-nav-icon">
              <Layers size={18} />
            </div>
            {!isCollapsed && <span>Flashcards</span>}
            {!isCollapsed && cardsCount > 0 && (
              <span className="sidebar-nav-badge">{cardsCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'quiz' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('quiz')}
            title="Adaptive Quizzes"
          >
            <div className="sidebar-nav-icon">
              <HelpCircle size={18} />
            </div>
            {!isCollapsed && <span>Quizzes</span>}
            {!isCollapsed && quizCount > 0 && (
              <span className="sidebar-nav-badge">{quizCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'suite' ? 'is-active' : ''}`}
            onClick={() => handleNavClick('suite')}
            title="Topic Suite Generator (Raw Notes / Lectures)"
          >
            <div className="sidebar-nav-icon">
              <Sparkles size={18} />
            </div>
            {!isCollapsed && <span>Study Suite</span>}
          </button>

          {/* Secondary Utilities */}
          {!isCollapsed && <div className="sidebar-nav-heading" style={{ marginTop: '16px' }}>Library & Tools</div>}

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onOpenHistory();
              if (isMobileOpen) onCloseMobile();
            }}
            title="Study History"
          >
            <div className="sidebar-nav-icon">
              <History size={18} />
            </div>
            {!isCollapsed && <span>Study History</span>}
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onOpenApiKey();
              if (isMobileOpen) onCloseMobile();
            }}
            title="Settings & API Keys"
          >
            <div className="sidebar-nav-icon">
              <Settings size={18} />
            </div>
            {!isCollapsed && <span>Settings</span>}
          </button>
        </nav>

        {/* Sidebar Footer with Collapse Toggle on Desktop */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={onToggleCollapse}
            style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <div className="sidebar-nav-icon">
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </div>
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

