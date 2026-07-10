/**
 * StorageService
 *
 * Low-level JSON persistence layer backed by localStorage.
 * Each logical "file" (pages.json, components.json, …) maps to
 * a distinct localStorage key prefixed with NAMESPACE.
 *
 * Rule: NEVER store source code — only serialisable entity objects.
 */

import type { StoreKey, STORE_FILE_NAMES } from './types';

const NAMESPACE = 'nicemp:db:';

type ReadonlyStoreFileNames = typeof STORE_FILE_NAMES;

function key(store: StoreKey): string {
  return NAMESPACE + store;
}

// ─── Core operations ─────────────────────────────────────────────────────────

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
    // Quota exceeded or security error — fail silently in prod
    console.warn('[StorageService] Write failed for store:', store, err);
  }
}

function clearStore(store: StoreKey): void {
  localStorage.removeItem(key(store));
}

function clearAll(): void {
  const stores: StoreKey[] = [
    'projects', 'versions', 'pages', 'components', 'hooks',
    'apis', 'tables', 'dependencies', 'technologies', 'history',
  ];
  stores.forEach(clearStore);
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * StorageService — static methods only; no instantiation needed.
 *
 * @example
 * const pages = StorageService.read<PageEntity>('pages');
 * StorageService.write<PageEntity>('pages', [...pages, newPage]);
 */
export const StorageService = {
  /** Return all records from a store, or [] if empty/missing. */
  read,

  /** Overwrite an entire store with the given array. */
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
    write(store, all);
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
    write(store, [...map.values()]);
  },

  /** Remove a record by id. No-op if not found. */
  remove(store: StoreKey, id: string): void {
    const all = read<{ id: string }>(store).filter((r) => r.id !== id);
    write(store, all);
  },

  /** Clear a single store. */
  clearStore,

  /** Clear ALL stores (full database wipe). */
  clearAll,

  /**
   * Returns total number of records across all documentation stores.
   */
  countAll(): Record<StoreKey, number> {
    const stores: StoreKey[] = [
      'projects', 'versions', 'pages', 'components', 'hooks',
      'apis', 'tables', 'dependencies', 'technologies', 'history',
    ];
    return Object.fromEntries(
      stores.map((s) => [s, read(s).length]),
    ) as Record<StoreKey, number>;
  },

  /**
   * Export a snapshot of all stores as a plain object.
   * Useful for debugging — never expose this to end users without review.
   */
  exportSnapshot(): Record<StoreKey, unknown[]> {
    const stores: StoreKey[] = [
      'projects', 'versions', 'pages', 'components', 'hooks',
      'apis', 'tables', 'dependencies', 'technologies', 'history',
    ];
    return Object.fromEntries(
      stores.map((s) => [s, read(s)]),
    ) as Record<StoreKey, unknown[]>;
  },
} as const;
