import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HistoryRepository } from '@/services/storage';
import type { HistoryState, HistoryEntry, HistoryFilter } from './types';

// ─── Context ─────────────────────────────────────────────────────────────────

interface HistoryContextValue extends HistoryState {
  addEntry:       (entry: HistoryEntry) => void;
  clearHistory:   () => void;
  setFilter:      (filter: HistoryFilter) => void;
  filteredEntries: HistoryEntry[];
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HistoryState>({
    entries: [],
    filter:  {},
    loading: false,
    error:   null,
  });

  // ── Load persisted history on mount ────────────────────────────────────────
  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const persisted = HistoryRepository.findAll();
      setState((prev) => ({ ...prev, entries: persisted, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // ── addEntry — persists to localStorage + updates React state ──────────────
  const addEntry = useCallback((entry: HistoryEntry) => {
    HistoryRepository.append(entry);
    setState((prev) => ({
      ...prev,
      entries: [entry, ...prev.entries].slice(0, 500),
    }));
  }, []);

  // ── clearHistory — wipes localStorage + clears state ──────────────────────
  const clearHistory = useCallback(() => {
    HistoryRepository.clear();
    setState((prev) => ({ ...prev, entries: [] }));
  }, []);

  const setFilter = useCallback((filter: HistoryFilter) => {
    setState((prev) => ({ ...prev, filter }));
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredEntries = React.useMemo(() => {
    const { projectId, kind } = state.filter as { projectId?: string; kind?: string };
    return state.entries.filter((e) => {
      if (projectId && e.projectId !== projectId) return false;
      if (kind      && e.kind      !== kind)      return false;
      return true;
    });
  }, [state.entries, state.filter]);

  return (
    <HistoryContext.Provider
      value={{ ...state, addEntry, clearHistory, setFilter, filteredEntries }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
