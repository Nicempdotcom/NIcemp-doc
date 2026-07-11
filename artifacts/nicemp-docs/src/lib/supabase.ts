/**
 * Supabase client — singleton.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.
 * When either variable is missing the client is null and the app falls
 * back to localStorage-only mode (no data is lost, just not shared).
 *
 * Rule: NEVER store source code in Supabase — only entity metadata/summaries.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase is properly configured (env vars present). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnon);

/**
 * The Supabase client, or null when env vars are not set.
 * Always guard usage: `if (!supabase) return;`
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnon!)
  : null;

/** The configured Supabase project URL, or null when not configured. Safe to display — it's a public endpoint. */
export const supabaseProjectUrl: string | null = supabaseUrl ?? null;

/** Masks a secret so only the first 6 and last 4 characters are visible (e.g. for the anon key). */
export function maskSecret(value: string): string {
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 6)}${'•'.repeat(8)}${value.slice(-4)}`;
}

/** The anon key, pre-masked for display — the raw value is never exported from this module. */
export const supabaseAnonKeyMasked: string | null = supabaseAnon ? maskSecret(supabaseAnon) : null;
