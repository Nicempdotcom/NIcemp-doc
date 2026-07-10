import React, { createContext, useContext, useCallback, useState } from 'react';
import { ProjectAnalyzer } from '@/services/engine';
import type { AnalyzerState, AnalysisPhase, ProjectMap } from './types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface AnalyzerContextValue extends AnalyzerState {
  /**
   * Run the full analysis pipeline on a ZIP ArrayBuffer.
   * The buffer is consumed and released internally — never stored.
   */
  startAnalysis: (buffer: ArrayBuffer) => Promise<void>;
  reset: () => void;
}

const AnalyzerContext = createContext<AnalyzerContextValue | undefined>(undefined);

// ─── Progress → phase mapping ─────────────────────────────────────────────────

function phaseFromProgress(pct: number): AnalysisPhase {
  if (pct < 12)  return 'scanning';
  if (pct < 60)  return 'scanning';
  if (pct < 75)  return 'categorizing';
  if (pct < 85)  return 'dependencies';
  if (pct < 95)  return 'technology';
  if (pct < 100) return 'building';
  return 'completed';
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const INITIAL: AnalyzerState = {
  phase: 'idle', progress: 0, projectMap: null, error: null,
};

export function AnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyzerState>(INITIAL);

  const startAnalysis = useCallback(async (buffer: ArrayBuffer) => {
    setState({ phase: 'scanning', progress: 0, projectMap: null, error: null });

    const analyzer = new ProjectAnalyzer();

    try {
      const projectMap = await analyzer.analyze(buffer, (pct) => {
        setState((s) => ({
          ...s,
          progress: pct,
          phase:    phaseFromProgress(pct),
        }));
      });

      setState({ phase: 'completed', progress: 100, projectMap, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido durante a análise.';
      setState({ phase: 'failed', progress: 0, projectMap: null, error: message });
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return (
    <AnalyzerContext.Provider value={{ ...state, startAnalysis, reset }}>
      {children}
    </AnalyzerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error('useAnalyzer must be used within AnalyzerProvider');
  return ctx;
}
