/**
 * LiveSupabaseIntrospector
 *
 * Introspects the schema of the *analyzed project* Supabase using the anon key.
 * Tables are NOT auto-discovered — they must be provided manually by the user.
 *
 * Schema is inferred from a sample row (select * limit 1) instead of the
 * deprecated PostgREST OpenAPI endpoint (GET /rest/v1/), which now requires a
 * service_role key that we intentionally never use here.
 *
 * ALL operations are read-only (SELECT / GET). No insert / update / delete.
 * No credentials are ever logged or embedded in generated prompts.
 */

import { getAnalyzedSupabaseClient } from '@/lib/analyzedProjectSupabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LiveColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface LiveTableSchema {
  name: string;
  columns: LiveColumn[];
}

export interface LiveTableDescribeResult {
  schema: LiveTableSchema;
  /** Set when the table exists but has zero rows — columns cannot be inferred. */
  warning?: string;
  /** Set on error code 42501 (insufficient_privilege). Contains the Postgres hint
   *  (usually the exact GRANT command to run) when available. */
  permissionError?: string;
}

export interface TableSampleResult {
  rows: Record<string, unknown>[];
  rowCount: number | null;
  error: string | null;
  /** Postgres hint from the server (e.g. the GRANT command to run), when available. */
  hint?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T/;

/** Infer a human-readable PostgreSQL-ish type from a JS runtime value. */
function inferType(value: unknown): string {
  if (value === null || value === undefined) return 'unknown';
  const t = typeof value;
  if (t === 'boolean') return 'boolean';
  if (t === 'number')  return Number.isInteger(value) ? 'integer' : 'numeric';
  if (t === 'string') {
    if (UUID_RE.test(value as string))   return 'uuid';
    if (ISO_TS_RE.test(value as string)) return 'timestamptz';
    return 'text';
  }
  if (t === 'object') {
    if (Array.isArray(value)) return 'jsonb[]';
    return 'jsonb';
  }
  return 'unknown';
}

/** Extract the most actionable error string from a Supabase/Postgres error object. */
function extractHint(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e['hint'] === 'string' && e['hint']) return e['hint'] as string;
  }
  return undefined;
}

function isPermissionError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    (error.message ?? '').toLowerCase().includes('permission denied') ||
    (error.message ?? '').toLowerCase().includes('insufficient privilege')
  );
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const LiveSupabaseIntrospector = {
  /**
   * Describe a single table by inferring its columns from a sample row.
   *
   * - If ≥1 row is returned: columns are inferred from the keys of the first row.
   * - If 0 rows: schema is returned with empty columns + a warning.
   * - If error code 42501: permissionError is set with the Postgres hint (the
   *   exact GRANT command) when available.
   *
   * Never throws.
   */
  async describeTable(tableName: string): Promise<LiveTableDescribeResult> {
    const client = getAnalyzedSupabaseClient();
    if (!client) {
      return {
        schema: { name: tableName, columns: [] },
        permissionError: 'Conexão não configurada.',
      };
    }

    try {
      const { data, error } = await client.from(tableName).select('*').limit(1);

      if (error) {
        if (isPermissionError(error)) {
          const hint =
            extractHint(error) ??
            `GRANT SELECT ON public.${tableName} TO anon;`;
          return { schema: { name: tableName, columns: [] }, permissionError: hint };
        }
        return {
          schema: { name: tableName, columns: [] },
          permissionError: error.message,
        };
      }

      if (!data || data.length === 0) {
        return {
          schema: { name: tableName, columns: [] },
          warning: 'Tabela vazia — colunas não puderam ser inferidas.',
        };
      }

      const firstRow = data[0] as Record<string, unknown>;
      const columns: LiveColumn[] = Object.entries(firstRow).map(([name, value]) => ({
        name,
        type:     inferType(value),
        nullable: true, // cannot determine nullability without schema access
      }));

      return { schema: { name: tableName, columns } };
    } catch (err) {
      console.warn(`[LiveSupabaseIntrospector] Exceção em describeTable(${tableName}):`, err);
      return {
        schema: { name: tableName, columns: [] },
        permissionError: 'Erro inesperado ao descrever a tabela.',
      };
    }
  },

  /**
   * Fetch a sample of rows from the given table together with an exact row count.
   *
   * Returns `{ rows: [], rowCount: null, error: "<message>" }` when RLS blocks
   * access or any other error occurs — never throws.
   * When the Postgres server returns a hint (e.g. a GRANT command), it is
   * included in the `hint` field.
   */
  async getTableSample(tableName: string, limit = 10): Promise<TableSampleResult> {
    const client = getAnalyzedSupabaseClient();
    if (!client) {
      return { rows: [], rowCount: null, error: 'Conexão não configurada.' };
    }

    try {
      const { data, count, error } = await client
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(limit);

      if (error) {
        const hint = extractHint(error);
        if (isPermissionError(error)) {
          const msg =
            hint ??
            `Sem permissão de leitura. Rode no SQL Editor do Supabase: GRANT SELECT ON public.${tableName} TO anon;`;
          return { rows: [], rowCount: null, error: msg, hint };
        }
        return { rows: [], rowCount: null, error: 'Erro ao buscar dados: ' + error.message, hint };
      }

      return {
        rows:     (data ?? []) as Record<string, unknown>[],
        rowCount: count ?? null,
        error:    null,
      };
    } catch (err) {
      console.warn(`[LiveSupabaseIntrospector] Exceção em getTableSample(${tableName}):`, err);
      return { rows: [], rowCount: null, error: 'Erro inesperado ao buscar amostra.' };
    }
  },
};
