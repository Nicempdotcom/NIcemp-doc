/**
 * Supabase client for the *analyzed project* (nicemp.com).
 *
 * This is entirely separate from the NicEmp Docs own Supabase client
 * (lib/supabase.ts). The URL and anon key are stored in localStorage
 * by the user — never in env vars or Replit Secrets.
 *
 * The connection is read-only: no insert/update/delete is ever performed.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { maskSecret } from './supabase';

export { maskSecret };

const STORAGE_KEY = 'nicemp:analyzedSupabase:config';

export interface AnalyzedSupabaseConfig {
  url: string;
  anonKey: string;
}

/** Reads the config from localStorage. Returns null on any error. */
export function getAnalyzedSupabaseConfig(): AnalyzedSupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.url === 'string' && typeof parsed?.anonKey === 'string') {
      return { url: parsed.url, anonKey: parsed.anonKey };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves the config to localStorage.
 * Emits a console warning (non-blocking) if the URL looks wrong.
 */
export function saveAnalyzedSupabaseConfig(url: string, anonKey: string): void {
  if (!url.startsWith('https://') || !url.endsWith('.supabase.co')) {
    console.warn(
      '[analyzedProjectSupabase] A URL não começa com https:// ou não termina em .supabase.co. Salvando mesmo assim.',
    );
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, anonKey }));
}

/** Removes the config from localStorage. */
export function clearAnalyzedSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Creates and returns a Supabase client on demand using the stored config.
 * Returns null when no config is saved.
 *
 * NOT cached as a module singleton — the user may update the config at
 * runtime without a page reload, so we recreate the client each time.
 * createClient() is cheap and this path is not hot.
 */
export function getAnalyzedSupabaseClient(): SupabaseClient | null {
  const config = getAnalyzedSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey);
}

/** Returns true when a config has been saved in localStorage. */
export function isAnalyzedSupabaseConfigured(): boolean {
  return getAnalyzedSupabaseConfig() !== null;
}

// ─── Tracked table names ────────────────────────────────────────────────────────

const TABLES_STORAGE_KEY = 'nicemp:analyzedSupabase:tables';

/** Reads the list of manually-tracked table names from localStorage. */
export function getTrackedTableNames(): string[] {
  try {
    const raw = localStorage.getItem(TABLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    return [];
  } catch {
    return [];
  }
}

/** Saves the list of tracked table names (trims, deduplicates, removes empties). */
export function saveTrackedTableNames(names: string[]): void {
  const normalized = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(normalized));
}

/** Adds a single table name to the tracked list (no-op if already present). */
export function addTrackedTableName(name: string): void {
  const current = getTrackedTableNames();
  saveTrackedTableNames([...current, name]);
}

/** Removes a single table name from the tracked list. */
export function removeTrackedTableName(name: string): void {
  const current = getTrackedTableNames();
  saveTrackedTableNames(current.filter((n) => n !== name));
}
