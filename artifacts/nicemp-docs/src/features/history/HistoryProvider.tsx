import React, { createContext, useContext, useState } from 'react';
import type { HistoryState, HistoryEntry, HistoryFilter } from './types';

// ─── Context ─────────────────────────────────────────────────────────────────

interface HistoryContextValue extends HistoryState {
  addEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  setFilter: (filter: HistoryFilter) => void;
  filteredEntries: HistoryEntry[];
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HistoryState>({
    entries: [],
    filter: {},
    loading: false,
    error: null,
  });

  const addEntry = (entry: HistoryEntry) =>
    setState((prev) => ({ ...prev, entries: [entry, ...prev.entries] }));

  const clearHistory = () =>
    setState((prev) => ({ ...prev, entries: [] }));

  const setFilter = (filter: HistoryFilter) =>
    setState((prev) => ({ ...prev, filter }));

  /** Stub — filtering logic not yet implemented. */
  const filteredEntries = state.entries;

  return (
    <HistoryContext.Provider value={{ ...state, addEntry, clearHistory, setFilter, filteredEntries }}>
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
