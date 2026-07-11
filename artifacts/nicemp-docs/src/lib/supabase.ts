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
