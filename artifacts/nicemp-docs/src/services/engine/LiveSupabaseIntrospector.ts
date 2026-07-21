/**
 * LiveSupabaseIntrospector
 *
 * Introspects the schema of the *analyzed project* Supabase using the anon key.
 *
 * Auto-discovery: queries information_schema via PostgREST using the
 * Accept-Profile header. Falls back gracefully when the schema is not exposed.
 *
 * For tables not covered by auto-discovery, schema is inferred from a sample
 * row (select * limit 1) as a fallback — no service_role key is ever used.
 *
 * ALL operations are read-only (SELECT / GET). No insert / update / delete.
 * No credentials are ever logged or embedded in generated prompts.
 */

import { getAnalyzedSupabaseClient, getAnalyzedSupabaseConfig } from '@/lib/analyzedProjectSupabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LiveColumn {
  name: string;
  type: string;
  nullable: boolean;
  /** True when this column is part of the primary key. */
  isPrimaryKey?: boolean;
  /** "referenced_table.referenced_column" when this column is a foreign key. */
  foreignKey?: string;
}

export interface LiveTableSchema {
  name: string;
  columns: LiveColumn[];
}

// ─── Auto-discovery types ──────────────────────────────────────────────────────

export interface DiscoveredTable {
  name: string;
  columns: LiveColumn[];
}

export type DiscoverTablesMethod = 'information_schema' | 'none';

export interface DiscoverTablesResult {
  tables: DiscoveredTable[];
  method: DiscoverTablesMethod;
  /** Present when auto-discovery failed — explains why and what to do. */
  error?: string;
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

// ─── RPC response types ────────────────────────────────────────────────────────

/** Shape of each column object returned by get_schema_metadata() */
interface RpcColumn {
  name:          string;
  type:          string;
  nullable:      boolean;
  is_primary_key: boolean;
  foreign_key:   string | null;
}

/** Shape of each table object returned by get_schema_metadata() */
interface RpcTable {
  name:    string;
  columns: RpcColumn[];
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** SQL to create the get_schema_metadata() function. Shown in the UI when the RPC is missing. */
export const GET_SCHEMA_METADATA_SQL_HINT =
  'Execute o script get_schema_metadata.sql no SQL Editor do Supabase para habilitar a auto-detecção.';

export const LiveSupabaseIntrospector = {
  /**
   * Auto-discover all tables in the public schema via the get_schema_metadata() RPC.
   *
   * The RPC must exist in the target Supabase project (see get_schema_metadata.sql).
   * It runs with SECURITY DEFINER so the anon key can call it without needing
   * direct access to information_schema.
   *
   * Returns method='none' with a descriptive error when the function is missing
   * or the connection is not configured — callers should fall back to manual entry.
   *
   * Never throws.
   */
  async discoverTables(): Promise<DiscoverTablesResult> {
    const client = getAnalyzedSupabaseClient();
    if (!client) {
      return { tables: [], method: 'none', error: 'Conexão não configurada.' };
    }

    try {
      const { data, error } = await client.rpc('get_schema_metadata');

      if (error) {
        // PGRST202 = function not found; 42883 = undefined function (Postgres)
        const isMissing =
          (error as { code?: string }).code === 'PGRST202' ||
          (error as { code?: string }).code === '42883' ||
          error.message?.toLowerCase().includes('could not find the function') ||
          error.message?.toLowerCase().includes('function') && error.message?.toLowerCase().includes('does not exist');

        if (isMissing) {
          return {
            tables: [],
            method: 'none',
            error:
              'Função get_schema_metadata() não encontrada no banco. ' +
              GET_SCHEMA_METADATA_SQL_HINT,
          };
        }

        return {
          tables: [],
          method: 'none',
          error: `Erro ao chamar RPC: ${error.message}`,
        };
      }

      // The RPC returns jsonb — Supabase JS deserialises it to a JS value.
      const rpcTables = (data ?? []) as RpcTable[];

      const tables: DiscoveredTable[] = rpcTables.map((t) => ({
        name: t.name,
        columns: (t.columns ?? []).map((col) => ({
          name:         col.name,
          type:         col.type,
          nullable:     col.nullable,
          isPrimaryKey: col.is_primary_key || undefined,
          foreignKey:   col.foreign_key ?? undefined,
        })),
      }));

      return { tables, method: 'information_schema' };
    } catch (err) {
      console.warn('[LiveSupabaseIntrospector] Exceção em discoverTables():', err);
      return {
        tables: [],
        method: 'none',
        error: 'Erro inesperado ao chamar RPC de descoberta.',
      };
    }
  },

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
