/**
 * StorageService
 *
 * Low-level JSON persistence layer.
 *
 * PRIMARY store: localStorage (synchronous — all reads are instant).
 * SECONDARY store: Supabase (async write-through — keeps shared data in sync).
 *
 * Strategy:
 *  • Reads always come from localStorage (cache).
 *  • Writes go to localStorage immediately (sync) and then fire an async
 *    write-through to Supabase in the background (no await needed at call site).
 *  • On app startup, HydrationService pulls Supabase data into localStorage so
 *    the cache is fresh before any read runs.
 *
 * Rule: NEVER store source code — only serialisable entity metadata objects.
 */

import { STORE_FILE_NAMES, type StoreKey } from './types';
import { SupabaseBackend } from './SupabaseBackend';

const NAMESPACE = 'nicemp:db:';

const ALL_STORES = Object.keys(STORE_FILE_NAMES) as StoreKey[];

function key(store: StoreKey): string {
  return NAMESPACE + store;
}

// ─── Core sync operations (localStorage) ─────────────────────────────────────

function read<T>(store: StoreKey): T[] {
  try {
    const raw = localStorage.getItem(key(store));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(store: StoreKey, data: T[]): void {
  try {
    localStorage.setItem(key(store), JSON.stringify(data));
  } catch (err) {
    console.warn('[StorageService] Write failed for store:', store, err);
    return;   // don't fire Supabase if localStorage itself failed
  }
  // Async write-through — fire-and-forget; errors are logged inside SupabaseBackend
  SupabaseBackend.replaceStore(store, data as Array<{ id: string }>).catch(console.warn);
}

function clearStore(store: StoreKey): void {
  localStorage.removeItem(key(store));
  SupabaseBackend.clearStore(store).catch(console.warn);
}

function clearAll(): void {
  ALL_STORES.forEach(clearStore);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const StorageService = {
  /** Return all records from a store, or [] if empty/missing. */
  read,

  /** Overwrite an entire store with the given array (localStorage + Supabase). */
  write,

  /**
   * Upsert a single record by id.
   * Inserts if not found, replaces if found.
   */
  upsert<T extends { id: string }>(store: StoreKey, item: T): void {
    const all = read<T>(store);
    const idx = all.findIndex((r) => r.id === item.id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.push(item);
    }
    // Write full store to localStorage; also directly upsert the single item
    // to Supabase (cheaper than replace-all for large stores).
    try {
      localStorage.setItem(key(store), JSON.stringify(all));
    } catch (err) {
      console.warn('[StorageService] upsert write failed', store, err);
      return;
    }
    SupabaseBackend.upsertOne(store, item).catch(console.warn);
  },

  /**
   * Upsert many records at once (batch, single write per store).
   */
  upsertMany<T extends { id: string }>(store: StoreKey, items: T[]): void {
    if (items.length === 0) return;
    const all  = read<T>(store);
    const map  = new Map(all.map((r) => [r.id, r]));
    for (const item of items) {
      map.set(item.id, item);
    }
    const next = [...map.values()];
    try {
      localStorage.setItem(key(store), JSON.stringify(next));
    } catch (err) {
      console.warn('[StorageService] upsertMany write failed', store, err);
      return;
    }
    SupabaseBackend.upsertMany(store, items).catch(console.warn);
  },

  /** Remove a record by id. No-op if not found. */
  remove(store: StoreKey, id: string): void {
    const all = read<{ id: string }>(store).filter((r) => r.id !== id);
    try {
      localStorage.setItem(key(store), JSON.stringify(all));
    } catch { /* ignore */ }
    SupabaseBackend.deleteOne(store, id).catch(console.warn);
  },

  /** Clear a single store (localStorage + Supabase). */
  clearStore,

  /** Clear ALL stores (full database wipe — localStorage + Supabase). */
  clearAll,

  /**
   * Returns total number of records across all documentation stores.
   */
  countAll(): Record<StoreKey, number> {
    return Object.fromEntries(
      ALL_STORES.map((s) => [s, read(s).length]),
    ) as Record<StoreKey, number>;
  },

  /**
   * Export a snapshot of all stores as a plain object.
   * Useful for debugging — never expose this to end users without review.
   */
  exportSnapshot(): Record<StoreKey, unknown[]> {
    return Object.fromEntries(
      ALL_STORES.map((s) => [s, read(s)]),
    ) as Record<StoreKey, unknown[]>;
  },
} as const;
