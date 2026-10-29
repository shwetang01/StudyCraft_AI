'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StudySession,
  GenerateRequestBody,
  RefineRequestBody,
  ResilienceSimulationMode,
  ApiResponse,
} from '@/lib/types';

const STORAGE_KEY = 'studycraft_active_session_v1';
const HISTORY_KEY = 'studycraft_history_v1';

export function useAIGenerator() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
    details?: unknown;
    rawSnippet?: string;
    canAutoRepair?: boolean;
  } | null>(null);
  const [metaInfo, setMetaInfo] = useState<{
    modelUsed: string;
    durationMs: number;
    wasRepaired?: boolean;
    repairNotes?: string[];
  } | null>(null);

  // Stale Response Prevention: AbortController & Monotonic Request ID
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const lastSubmittedPromptRef = useRef<string>('');

  // API Key Override: Stored in localStorage and tracked in a ref to prevent stale closures
  const apiKeyOverrideRef = useRef<{
    gemini?: string;
    groq?: string;
    openai?: string;
  } | undefined>(undefined);

  const [apiKeyOverride, setApiKeyOverride] = useState<{
    gemini?: string;
    groq?: string;
    openai?: string;
  } | undefined>(undefined);

  // Load persisted session and API keys on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch {
      // Ignore corrupted local storage
    }

    try {
      const savedKeys = localStorage.getItem('studycraft_api_keys');
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        setApiKeyOverride(parsed);
        apiKeyOverrideRef.current = parsed;
      }
    } catch {
      // Ignore corrupted keys
    }
  }, []);

  const saveApiKeys = useCallback((keys: { gemini?: string; groq?: string; openai?: string }) => {
    setApiKeyOverride(keys);
    apiKeyOverrideRef.current = keys;
    try {
      localStorage.setItem('studycraft_api_keys', JSON.stringify(keys));
    } catch {
      // Ignored
    }
  }, []);

  // Save session updates to localStorage
  const updateSession = useCallback((updater: (prev: StudySession) => StudySession) => {
    setSession((prev) => {
      if (!prev) return null;
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Handle storage quota
      }
      return next;
    });
  }, []);

  // Persist session to history list
  const persistToHistory = useCallback((newSession: StudySession) => {
    try {
      const existingRaw = localStorage.getItem(HISTORY_KEY);
      const history: StudySession[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = history.filter((h) => h.id !== newSession.id);
      const updated = [newSession, ...filtered].slice(0, 15);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Quota limit safety
    }
  }, []);

  // Primary Generator Action
  const generate = useCallback(
    async (prompt: string, simulationMode: ResilienceSimulationMode = 'none') => {
      if (!prompt.trim()) return;

      lastSubmittedPromptRef.current = prompt;
      setError(null);
      setIsGenerating(true);

      // 1. Cancel previous pending request to prevent stale responses
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeAbortControllerRef.current = controller;

      // 2. Increment request ID
      const currentRequestId = ++latestRequestIdRef.current;

      try {
        const payload: GenerateRequestBody = {
          prompt,
          simulationMode,
          apiKeyOverride: apiKeyOverrideRef.current || apiKeyOverride,
        };

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // 3. Stale Response Check: If a newer request was dispatched while this was in flight, discard!
        if (currentRequestId !== latestRequestIdRef.current) {
          console.warn(`Discarded stale response from request #${currentRequestId}`);
          return;
        }

        const data: ApiResponse<StudySession> = await res.json();

        if (!data.success) {
          setError(data.error);
          return;
        }

        setSession(data.data);
        setMetaInfo(data.meta);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
        persistToHistory(data.data);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          // Request intentionally aborted by newer prompt
          return;
        }
        if (currentRequestId !== latestRequestIdRef.current) return;

        setError({
          code: 'NETWORK_FETCH_FAILED',
          message:
            'Failed to establish connection with study generation endpoint. Please check your network or try again.',
          details: (err as Error).message,
        });
      } finally {
        if (currentRequestId === latestRequestIdRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [persistToHistory]
  );

  // Refinement Action (Follow-up prompts)
  const refine = useCallback(
    async (refinementInstruction: string, simulationMode: ResilienceSimulationMode = 'none') => {
      if (!session || !refinementInstruction.trim()) return;

      setIsRefining(true);
      setError(null);

      const controller = new AbortController();
      activeAbortControllerRef.current = controller;
      const currentRequestId = ++latestRequestIdRef.current;

      try {
        const payload: RefineRequestBody = {
          currentSession: session,
          refinementInstruction,
          simulationMode,
          apiKeyOverride: apiKeyOverrideRef.current || apiKeyOverride,
        };

        const res = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (currentRequestId !== latestRequestIdRef.current) return;

        const data: ApiResponse<StudySession> = await res.json();

        if (!data.success) {
          setError(data.error);
          return;
        }

        setSession(data.data);
        setMetaInfo(data.meta);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
        persistToHistory(data.data);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        if (currentRequestId !== latestRequestIdRef.current) return;

        setError({
          code: 'REFINEMENT_FAILED',
          message: 'Unable to apply refinement instructions.',
          details: (err as Error).message,
        });
      } finally {
        if (currentRequestId === latestRequestIdRef.current) {
          setIsRefining(false);
        }
      }
    },
    [session, persistToHistory, apiKeyOverride]
  );

  const cancelGeneration = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsRefining(false);
  }, []);

  const retry = useCallback(() => {
    if (lastSubmittedPromptRef.current) {
      generate(lastSubmittedPromptRef.current);
    }
  }, [generate]);

  const clearSession = useCallback(() => {
    setSession(null);
    setError(null);
    setMetaInfo(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadSession = useCallback((saved: StudySession) => {
    setSession(saved);
    setError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, []);

  return {
    session,
    isGenerating,
    isRefining,
    error,
    metaInfo,
    apiKeyOverride,
    saveApiKeys,
    generate,
    refine,
    retry,
    cancelGeneration,
    clearSession,
    loadSession,
    updateSession,
    dismissError: () => setError(null),
  };
}
