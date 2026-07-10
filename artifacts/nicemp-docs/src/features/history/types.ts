// ─── History Feature — Types ──────────────────────────────────────────────────

export type HistoryEventKind =
  | 'upload'
  | 'analysis'
  | 'doc_created'
  | 'doc_updated'
  | 'doc_deleted'
  | 'comparison'
  | 'export';

export interface HistoryEntry {
  id: string;
  kind: HistoryEventKind;
  label: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface HistoryFilter {
  kinds?: HistoryEventKind[];
  from?: string;
  to?: string;
  search?: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  filter: HistoryFilter;
  loading: boolean;
  error: string | null;
}
