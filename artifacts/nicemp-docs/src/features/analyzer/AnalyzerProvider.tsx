import React, {
  createContext, useContext, useCallback,
  useState, useRef, useEffect,
} from 'react';
import { EMPTY_COUNTS }                        from '@/workers/types';
import type { WorkerOutMsg, WorkerInMsg }      from '@/workers/types';
import type { AnalyzerState, AnalysisPhase }  from './types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface AnalyzerContextValue extends AnalyzerState {
  /**
   * Hand the ZIP buffer to the worker for full analysis.
   * The buffer is *transferred* (zero-copy, Transferable) — the caller's
   * reference becomes detached immediately after this call.
   */
  startAnalysis: (buffer: ArrayBuffer, fileName: string, fileSize: number) => void;
  /** Send a cancel signal to the running worker. */
  cancelAnalysis: () => void;
  /** Terminate worker (if running) and reset to idle. */
  reset: () => void;
}

const AnalyzerContext = createContext<AnalyzerContextValue | undefined>(undefined);

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL: AnalyzerState = {
  phase:      'idle',
  pct:        0,
  label:      '',
  counts:     { ...EMPTY_COUNTS },
  projectMap: null,
  error:      null,
  fileName:   '',
  fileSize:   0,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyzerState>(INITIAL);
  const workerRef         = useRef<Worker | null>(null);

  // ── Terminate worker on unmount ───────────────────────────────────────────
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // ── startAnalysis ─────────────────────────────────────────────────────────
  const startAnalysis = useCallback((
    buffer:   ArrayBuffer,
    fileName: string,
    fileSize: number,
  ) => {
    // Kill any previous worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setState({
      ...INITIAL,
      phase:    'scanning',
      label:    'Preparando análise…',
      fileName,
      fileSize,
    });

    // Spawn worker — Vite detects `new URL(...)` and bundles it as a separate chunk
    const worker = new Worker(
      new URL('../../workers/analysis.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    // ── Message handler ──────────────────────────────────────────────────
    worker.addEventListener('message', (e: MessageEvent<WorkerOutMsg>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'progress':
          setState((s) => ({
            ...s,
            pct:    msg.pct,
            label:  msg.label,
            counts: msg.counts,
            phase:  phasFromPct(msg.pct),
          }));
          break;

        case 'completed':
          setState((s) => ({
            ...s,
            phase:      'completed',
            pct:        100,
            label:      'Concluído',
            projectMap: msg.projectMap,
          }));
          worker.terminate();
          workerRef.current = null;
          break;

        case 'cancelled':
          setState((s) => ({ ...s, phase: 'cancelled', label: 'Análise cancelada pelo usuário.' }));
          worker.terminate();
          workerRef.current = null;
          break;

        case 'error':
          setState((s) => ({
            ...s,
            phase: 'failed',
            label: msg.message,
            error: msg.message,
          }));
          worker.terminate();
          workerRef.current = null;
          break;
      }
    });

    // ── Error handler (worker crash) ──────────────────────────────────────
    worker.addEventListener('error', (e: ErrorEvent) => {
      const msg = e.message || 'O worker de análise falhou inesperadamente.';
      setState((s) => ({ ...s, phase: 'failed', label: msg, error: msg }));
      worker.terminate();
      workerRef.current = null;
    });

    // ── Transfer buffer (zero-copy — detaches from main thread immediately) ─
    const startMsg: WorkerInMsg = { type: 'start', buffer, fileName };
    worker.postMessage(startMsg, [buffer]);
  }, []);

  // ── cancelAnalysis ────────────────────────────────────────────────────────
  const cancelAnalysis = useCallback(() => {
    if (workerRef.current) {
      const msg: WorkerInMsg = { type: 'cancel' };
      workerRef.current.postMessage(msg);
    }
  }, []);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState(INITIAL);
  }, []);

  return (
    <AnalyzerContext.Provider value={{ ...state, startAnalysis, cancelAnalysis, reset }}>
      {children}
    </AnalyzerContext.Provider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function phasFromPct(pct: number): AnalysisPhase {
  if (pct < 10)  return 'scanning';
  if (pct < 62)  return 'scanning';
  if (pct < 76)  return 'categorizing';
  if (pct < 86)  return 'dependencies';
  if (pct < 93)  return 'technology';
  if (pct < 100) return 'building';
  return 'completed';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error('useAnalyzer must be used within AnalyzerProvider');
  return ctx;
}
