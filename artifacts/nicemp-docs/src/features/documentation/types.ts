// ─── Documentation Feature — Types ───────────────────────────────────────────

export type DocEntryKind = 'page' | 'section' | 'snippet' | 'reference';

export type DocFormat = 'markdown' | 'json' | 'yaml';

export interface DocEntry {
  id: string;
  kind: DocEntryKind;
  title: string;
  slug: string;
  content: string;
  format: DocFormat;
  tags: string[];
  module: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocConfig {
  baseRoute: string;
  defaultFormat: DocFormat;
  enableSearch: boolean;
  enableVersioning: boolean;
}

export interface DocumentationState {
  entries: DocEntry[];
  activeEntry: DocEntry | null;
  config: DocConfig;
  loading: boolean;
  error: string | null;
}
