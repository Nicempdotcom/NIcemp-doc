import React, {
  createContext, useContext, useCallback,
  useState, useRef, useEffect,
} from 'react';
import { EMPTY_COUNTS }                        from '@/workers/types';
import type { WorkerOutMsg, WorkerInMsg }      from '@/workers/types';
import { runAnalysisPipeline, AnalysisCancelledError } from '@/services/engine/runAnalysisPipeline';
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

  // Guards against a worker that fails asynchronously (e.g. 'error' event)
  // *after* it already reported completion/cancellation for this run.
  const runIdRef = useRef(0);

  /**
   * Fallback path: runs the exact same pipeline on the main thread.
   * Used when a dedicated Worker can't be created or crashes before
   * producing any output — e.g. a sandboxed/CSP-restricted preview iframe
   * that blocks module Workers. Slightly less smooth on huge projects
   * (UI may feel busier), but never silently fails to load the ZIP.
   */
  const runOnMainThread = useCallback((buffer: ArrayBuffer, fileName: string, runId: number) => {
    let cancelledLocal = false;
    cancelFlagRef.current = () => { cancelledLocal = true; };

    runAnalysisPipeline(buffer, fileName, {
      onProgress: (pct, label, counts) => {
        if (runIdRef.current !== runId) return;
        setState((s) => ({ ...s, pct, label, counts, phase: phasFromPct(pct) }));
      },
      isCancelled: () => cancelledLocal,
    }).then((projectMap) => {
      if (runIdRef.current !== runId) return;
      setState((s) => ({ ...s, phase: 'completed', pct: 100, label: 'Concluído', projectMap }));
    }).catch((err) => {
      if (runIdRef.current !== runId) return;
      if (err instanceof AnalysisCancelledError) {
        setState((s) => ({ ...s, phase: 'cancelled', label: 'Análise cancelada pelo usuário.' }));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro desconhecido durante a análise.';
      setState((s) => ({ ...s, phase: 'failed', label: msg, error: msg }));
    });
  }, []);

  const cancelFlagRef = useRef<(() => void) | null>(null);

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
    cancelFlagRef.current = null;
    const runId = ++runIdRef.current;

    setState({
      ...INITIAL,
      phase:    'scanning',
      label:    'Preparando análise…',
      fileName,
      fileSize,
    });

    // A fallback needs its own copy of the bytes — once we hand `buffer` to
    // postMessage as a Transferable it gets detached, so snapshot first.
    let bufferForFallback: ArrayBuffer | null = null;
    try {
      bufferForFallback = buffer.slice(0);
    } catch {
      bufferForFallback = null;
    }

    let worker: Worker;
    try {
      // Spawn worker — Vite detects `new URL(...)` and bundles it as a separate chunk
      worker = new Worker(
        new URL('../../workers/analysis.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      // `new Worker(...)` can throw synchronously in restrictive sandboxes
      // (e.g. CSP `worker-src` blocked inside the preview iframe).
      if (bufferForFallback) runOnMainThread(bufferForFallback, fileName, runId);
      else setState((s) => ({ ...s, phase: 'failed', label: 'Não foi possível iniciar a análise.', error: 'Não foi possível iniciar a análise.' }));
      return;
    }
    workerRef.current = worker;

    let workerProducedOutput = false;

    // ── Stall watchdog ──────────────────────────────────────────────────────
    // Some sandboxed preview environments let `new Worker(...)` construct
    // successfully and accept postMessage, but then silently never execute
    // the module (blocked script load, no 'error' event ever fires). Without
    // this, that looks exactly like the UI "stopping in the middle" forever.
    // If we go too long without hearing anything back, assume the worker is
    // dead and fall back to the main thread.
    let lastActivity = Date.now();
    const STALL_TIMEOUT_MS = 6000;
    const watchdog = window.setInterval(() => {
      if (runIdRef.current !== runId) { window.clearInterval(watchdog); return; }
      if (Date.now() - lastActivity > STALL_TIMEOUT_MS) {
        window.clearInterval(watchdog);
        worker.terminate();
        workerRef.current = null;
        if (!workerProducedOutput && bufferForFallback) {
          runOnMainThread(bufferForFallback, fileName, runId);
        } else if (!workerProducedOutput) {
          setState((s) => ({
            ...s, phase: 'failed',
            label: 'A análise travou (worker não respondeu). Tente novamente.',
            error: 'A análise travou (worker não respondeu). Tente novamente.',
          }));
        }
      }
    }, 1000);

    // ── Message handler ──────────────────────────────────────────────────
    worker.addEventListener('message', (e: MessageEvent<WorkerOutMsg>) => {
      if (runIdRef.current !== runId) return;
      lastActivity = Date.now();
      const msg = e.data;
      workerProducedOutput = true;

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
          window.clearInterval(watchdog);
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
          window.clearInterval(watchdog);
          setState((s) => ({ ...s, phase: 'cancelled', label: 'Análise cancelada pelo usuário.' }));
          worker.terminate();
          workerRef.current = null;
          break;

        case 'error':
          window.clearInterval(watchdog);
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

    // ── Error handler (worker crash / failed to load, e.g. CSP-blocked) ────
    worker.addEventListener('error', (e: ErrorEvent) => {
      if (runIdRef.current !== runId) return;
      window.clearInterval(watchdog);
      worker.terminate();
      workerRef.current = null;

      // If the worker never got to report anything, fall back to running
      // the same pipeline on the main thread instead of failing silently.
      if (!workerProducedOutput && bufferForFallback) {
        runOnMainThread(bufferForFallback, fileName, runId);
        return;
      }
      const msg = e.message || 'O worker de análise falhou inesperadamente.';
      setState((s) => ({ ...s, phase: 'failed', label: msg, error: msg }));
    });

    // ── Transfer buffer (zero-copy — detaches from main thread immediately) ─
    const startMsg: WorkerInMsg = { type: 'start', buffer, fileName };
    worker.postMessage(startMsg, [buffer]);
  }, [runOnMainThread]);

  // ── cancelAnalysis ────────────────────────────────────────────────────────
  const cancelAnalysis = useCallback(() => {
    if (workerRef.current) {
      const msg: WorkerInMsg = { type: 'cancel' };
      workerRef.current.postMessage(msg);
    }
    // Also signal the main-thread fallback runner, if that's what's active.
    cancelFlagRef.current?.();
  }, []);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    cancelFlagRef.current = null;
    runIdRef.current += 1; // invalidate any in-flight main-thread run
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
