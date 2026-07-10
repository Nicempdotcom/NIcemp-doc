import React, { createContext, useContext, useState } from 'react';
import type { ImpactState, ImpactReport } from './types';

// ─── Context ─────────────────────────────────────────────────────────────────

interface ImpactContextValue extends ImpactState {
  generateReport: (triggerId: string, triggerName: string) => Promise<void>;
  clearReport: () => void;
}

const ImpactContext = createContext<ImpactContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ImpactProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImpactState>({
    report: null,
    loading: false,
    error: null,
  });

  /** Stub — impact graph traversal not yet implemented. */
  const generateReport = async (_triggerId: string, _triggerName: string): Promise<void> => {
    // TODO: integrate with services/graph and services/comparison
    setState((prev) => ({ ...prev, loading: true, error: null }));
  };

  const clearReport = () =>
    setState({ report: null, loading: false, error: null });

  return (
    <ImpactContext.Provider value={{ ...state, generateReport, clearReport }}>
      {children}
    </ImpactContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImpact(): ImpactContextValue {
  const ctx = useContext(ImpactContext);
  if (!ctx) throw new Error('useImpact must be used within ImpactProvider');
  return ctx;
}
