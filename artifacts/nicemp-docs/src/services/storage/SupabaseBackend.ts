/**
 * SupabaseBackend
 *
 * Thin async wrapper over the Supabase PostgREST API that mirrors the same
 * "store-per-entity-type" model as localStorage.
 *
 * Schema (identical for every table):
 *   id         text PRIMARY KEY   — same id the entity already uses
 *   data       jsonb NOT NULL     — the full serialised entity object
 *   updated_at timestamptz        — default now(), auto-updated
 *
 * RULE: `data` must NEVER contain raw source code — only extracted
 * knowledge/metadata. The mapper already enforces this; this file just
 * persists what it produces.
 */

import { supabase } from '@/lib/supabase';
import type { StoreKey } from './types';

// ─── StoreKey → Postgres table name ──────────────────────────────────────────
// "tables" is a reserved word in SQL; every other store matches its key.

const TABLE_NAME: Record<StoreKey, string> = {
  projects:         'projects',
  versions:         'versions',
  versionSnapshots: 'version_snapshots',
  pages:            'pages',
  components:       'components',
  hooks:            'hooks',
  apis:             'apis',
  tables:           'database_tables',
  dependencies:     'dependencies',
  technologies:     'technologies',
  history:          'history',
  interactions:     'interactions',
  importEdges:      'import_edges',
  toolCategories:   'tool_categories',
  tableUsages:      'table_usages',
  annotations:      'annotations',
  projectSnapshots: 'project_snapshots',
  projectChanges:   'project_changes',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function table(store: StoreKey): string {
  return TABLE_NAME[store];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const SupabaseBackend = {
  /**
   * Pull all records for a store.
   * Returns [] when Supabase is not configured or the query fails.
   */
  async readAll<T>(store: StoreKey): Promise<T[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(table(store))
      .select('data');
    if (error) {
      console.warn('[SupabaseBackend] readAll error', store, error.message);
      return [];
    }
    return (data ?? []).map((row: { data: T }) => row.data);
  },

  /**
   * Upsert a single record (insert or replace by id).
   * Fire-and-forget safe — caller doesn't need to await.
   */
  async upsertOne<T extends { id: string }>(store: StoreKey, item: T): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from(table(store))
      .upsert({ id: item.id, data: item }, { onConflict: 'id' });
    if (error) console.warn('[SupabaseBackend] upsertOne error', store, error.message);
  },

  /**
   * Upsert many records in one call (batch).
   */
  async upsertMany<T extends { id: string }>(store: StoreKey, items: T[]): Promise<void> {
    if (!supabase || items.length === 0) return;
    const rows = items.map((item) => ({ id: item.id, data: item }));
    const { error } = await supabase
      .from(table(store))
      .upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[SupabaseBackend] upsertMany error', store, error.message);
  },

  /**
   * Delete a single record by id.
   */
  async deleteOne(store: StoreKey, id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from(table(store))
      .delete()
      .eq('id', id);
    if (error) console.warn('[SupabaseBackend] deleteOne error', store, error.message);
  },

  /**
   * Replace an entire store with the given array.
   * Deletes all existing rows then bulk-inserts.
   */
  async replaceStore<T extends { id: string }>(store: StoreKey, items: T[]): Promise<void> {
    if (!supabase) return;
    // Delete all
    const { error: delErr } = await supabase
      .from(table(store))
      .delete()
      .neq('id', '__NEVER_MATCHES__');   // delete-all workaround — RLS allows it
    if (delErr) {
      console.warn('[SupabaseBackend] replaceStore delete error', store, delErr.message);
      return;
    }
    if (items.length === 0) return;
    await this.upsertMany(store, items);
  },

  /**
   * Delete ALL rows in a store.
   */
  async clearStore(store: StoreKey): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from(table(store))
      .delete()
      .neq('id', '__NEVER_MATCHES__');
    if (error) console.warn('[SupabaseBackend] clearStore error', store, error.message);
  },

  /**
   * Load ALL stores from Supabase and return them as a plain object.
   * Used by HydrationService on app startup.
   */
  async loadAll(stores: StoreKey[]): Promise<Partial<Record<StoreKey, unknown[]>>> {
    if (!supabase) return {};
    const results = await Promise.allSettled(
      stores.map(async (s) => [s, await this.readAll(s)] as const),
    );
    const out: Partial<Record<StoreKey, unknown[]>> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const [store, data] = r.value;
        out[store] = data;
      }
    }
    return out;
  },
} as const;
