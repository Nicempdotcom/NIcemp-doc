// ─── History Feature — Types ──────────────────────────────────────────────────
//
// HistoryEntry and HistoryEventKind are the canonical definitions from the
// storage layer. Re-exported here so feature code doesn't import from services.

export type {
  HistoryEntry,
  HistoryEventKind,
} from '@/services/storage';

export interface HistoryFilter {
  projectId?: string;
  kind?:      string;
  from?:      string;
  to?:        string;
  search?:    string;
}

export interface HistoryState {
  entries: import('@/services/storage').HistoryEntry[];
  filter:  HistoryFilter;
  loading: boolean;
  error:   string | null;
}
