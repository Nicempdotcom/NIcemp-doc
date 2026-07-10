/// <reference lib="webworker" />
/**
 * Analysis Worker
 *
 * Thin message-passing wrapper around the shared pipeline
 * (@/services/engine/runAnalysisPipeline). Runs the full analysis off the
 * main thread so the UI stays responsive regardless of project size — no
 * artificial size limits.
 *
 * Source code is NEVER stored — only structural metadata is returned.
 */

import { runAnalysisPipeline, AnalysisCancelledError, EMPTY_COUNTS } from '@/services/engine/runAnalysisPipeline';
import type { LiveCounts } from '@/services/engine/runAnalysisPipeline';
import type { WorkerInMsg, WorkerOutMsg } from './types';

let cancelled = false;

function post(msg: WorkerOutMsg): void {
  (self as unknown as Worker).postMessage(msg);
}

(self as unknown as Worker).addEventListener('message', async (e: MessageEvent<WorkerInMsg>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type === 'start') {
    cancelled = false;
    try {
      const projectMap = await runAnalysisPipeline(msg.buffer, msg.fileName, {
        onProgress: (pct, label, counts: LiveCounts) => post({ type: 'progress', pct, label, counts: { ...counts } }),
        isCancelled: () => cancelled,
      });
      post({ type: 'completed', projectMap });
    } catch (err) {
      if (err instanceof AnalysisCancelledError || cancelled) {
        post({ type: 'cancelled' });
      } else {
        const message = err instanceof Error ? err.message : 'Erro desconhecido durante a análise.';
        post({ type: 'error', message });
      }
    }
  }
});

// Referenced so TS doesn't tree-shake the import used only for its type re-export.
void EMPTY_COUNTS;
