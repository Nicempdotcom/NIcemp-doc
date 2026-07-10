// ─── Web Worker — Shared Message Types ───────────────────────────────────────
//
// Used by both the worker file and the main-thread AnalyzerProvider.
// Do NOT import React or browser-only APIs here.

import type { ProjectMap } from '@/services/engine';

// ─── Live entity counts (updated as files are scanned) ───────────────────────

export interface LiveCounts {
  filesScanned: number;
  filesTotal:   number;   // 0 until ZIP is opened and entry list is known
  pages:        number;
  components:   number;
  hooks:        number;
  apis:         number;
  tables:       number;
}

export const EMPTY_COUNTS: LiveCounts = {
  filesScanned: 0,
  filesTotal:   0,
  pages:        0,
  components:   0,
  hooks:        0,
  apis:         0,
  tables:       0,
};

// ─── Messages: Main Thread → Worker ─────────────────────────────────────────

export type WorkerInMsg =
  | {
      type:     'start';
      buffer:   ArrayBuffer;    // Transferred (zero-copy) — detached in sender
      fileName: string;
    }
  | { type: 'cancel' };

// ─── Messages: Worker → Main Thread ─────────────────────────────────────────

export type WorkerOutMsg =
  | {
      type:   'progress';
      pct:    number;           // 0–100
      label:  string;           // Human-readable step label in Portuguese
      counts: LiveCounts;
    }
  | {
      type:       'completed';
      projectMap: ProjectMap;   // Full analysis result — source code NOT included
    }
  | {
      type:    'error';
      message: string;          // Friendly message in Portuguese
    }
  | { type: 'cancelled' };
