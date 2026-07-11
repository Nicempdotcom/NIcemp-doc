/**
 * HydrationService
 *
 * On app startup (after successful Supabase auth) hydrates the localStorage
 * cache from Supabase so all repositories see up-to-date shared data.
 *
 * Strategy:
 *   1. Pull all stores from Supabase in parallel.
 *   2. Write each store to localStorage (overwrite).
 *   3. Return — all subsequent sync reads see fresh data.
 *
 * This runs once per page load. After that, StorageService's write-through
 * keeps localStorage and Supabase in sync.
 */

import { isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseBackend }       from './SupabaseBackend';
import { STORE_FILE_NAMES, type StoreKey } from './types';

const NAMESPACE = 'nicemp:db:';
const ALL_STORES = Object.keys(STORE_FILE_NAMES) as StoreKey[];

function lsKey(store: StoreKey): string {
  return NAMESPACE + store;
}

export const HydrationService = {
  /**
   * Load all Supabase stores into localStorage.
   * Returns true if hydration succeeded (or Supabase not configured),
   * false on unexpected error.
   */
  async hydrate(): Promise<boolean> {
    if (!isSupabaseConfigured) return true;   // localStorage-only mode — nothing to do

    try {
      const all = await SupabaseBackend.loadAll(ALL_STORES);
      for (const [store, data] of Object.entries(all) as [StoreKey, unknown[]][]) {
        try {
          localStorage.setItem(lsKey(store as StoreKey), JSON.stringify(data));
        } catch {
          // Quota exceeded for this store — skip silently
        }
      }
      return true;
    } catch (err) {
      console.error('[HydrationService] Hydration failed', err);
      return false;
    }
  },
} as const;
