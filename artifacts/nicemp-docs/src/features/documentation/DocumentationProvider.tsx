import React, { createContext, useContext, useState } from 'react';
import type { DocumentationState, DocEntry, DocConfig } from './types';

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DocConfig = {
  baseRoute: '/docs',
  defaultFormat: 'markdown',
  enableSearch: true,
  enableVersioning: false,
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface DocumentationContextValue extends DocumentationState {
  setActiveEntry: (entry: DocEntry | null) => void;
  addEntry: (entry: DocEntry) => void;
  updateEntry: (id: string, patch: Partial<DocEntry>) => void;
  removeEntry: (id: string) => void;
}

const DocumentationContext = createContext<DocumentationContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DocumentationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DocumentationState>({
    entries: [],
    activeEntry: null,
    config: DEFAULT_CONFIG,
    loading: false,
    error: null,
  });

  const setActiveEntry = (entry: DocEntry | null) =>
    setState((prev) => ({ ...prev, activeEntry: entry }));

  const addEntry = (entry: DocEntry) =>
    setState((prev) => ({ ...prev, entries: [...prev.entries, entry] }));

  const updateEntry = (id: string, patch: Partial<DocEntry>) =>
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const removeEntry = (id: string) =>
    setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));

  return (
    <DocumentationContext.Provider
      value={{ ...state, setActiveEntry, addEntry, updateEntry, removeEntry }}
    >
      {children}
    </DocumentationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentation(): DocumentationContextValue {
  const ctx = useContext(DocumentationContext);
  if (!ctx) throw new Error('useDocumentation must be used within DocumentationProvider');
  return ctx;
}
