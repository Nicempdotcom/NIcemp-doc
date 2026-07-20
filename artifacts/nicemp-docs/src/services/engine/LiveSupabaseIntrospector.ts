/**
 * LiveSupabaseIntrospector
 *
 * Introspects the schema of the *analyzed project* Supabase (nicemp.com) using
 * the PostgREST OpenAPI endpoint — no service_role key needed, only the anon key.
 *
 * ALL operations are read-only (SELECT / GET). No insert / update / delete.
 * No credentials are ever logged or embedded in generated prompts.
 */

import { getAnalyzedSupabaseConfig, getAnalyzedSupabaseClient } from '@/lib/analyzedProjectSupabase';

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

export interface TableSampleResult {
  rows: Record<string, unknown>[];
  rowCount: number | null;
  error: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Map a PostgREST OpenAPI property to a human-readable type string. */
function resolveType(prop: Record<string, unknown>): string {
  const format = prop['format'] as string | undefined;
  const type   = prop['type']   as string | undefined;
  if (format) return format;
  if (type)   return type;
  return 'unknown';
}

/**
 * Parse the PostgREST OpenAPI response (supports both v2 `definitions` and
 * v3 `components.schemas`).
 */
function parseOpenApiSchema(json: Record<string, unknown>): LiveTableSchema[] {
  // OpenAPI 2 style
  const defs = (json['definitions'] ?? (json['components'] as Record<string, unknown> | undefined)?.['schemas']) as
    | Record<string, unknown>
    | undefined;
  if (!defs) return [];

  const tables: LiveTableSchema[] = [];

  for (const [tableName, rawSchema] of Object.entries(defs)) {
    // Skip internal PostgREST types (e.g. prefixed with '_')
    if (tableName.startsWith('_')) continue;

    const schema    = rawSchema as Record<string, unknown>;
    const props     = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
    const required  = new Set<string>((schema['required'] as string[] | undefined) ?? []);

    const columns: LiveColumn[] = props
      ? Object.entries(props).map(([colName, colDef]) => ({
          name:     colName,
          type:     resolveType(colDef),
          nullable: !required.has(colName),
        }))
      : [];

    tables.push({ name: tableName, columns });
  }

  return tables.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const LiveSupabaseIntrospector = {
  /**
   * List all tables (and their columns) exposed by the analyzed project's
   * PostgREST API.
   *
   * Returns [] when the connection is not configured or the request fails.
   * Never throws.
   */
  async listTables(): Promise<LiveTableSchema[]> {
    const config = getAnalyzedSupabaseConfig();
    if (!config) {
      console.warn('[LiveSupabaseIntrospector] Supabase do projeto analisado não configurado.');
      return [];
    }

    try {
      const response = await fetch(`${config.url}/rest/v1/`, {
        headers: {
          apikey:        config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Accept:        'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[LiveSupabaseIntrospector] Erro ao buscar schema: HTTP ${response.status}`);
        return [];
      }

      const json = (await response.json()) as Record<string, unknown>;
      return parseOpenApiSchema(json);
    } catch (err) {
      console.warn('[LiveSupabaseIntrospector] Exceção ao buscar schema:', err);
      return [];
    }
  },

  /**
   * Fetch a sample of rows from the given table together with an exact row count.
   *
   * Returns `{ rows: [], rowCount: null, error: "<message>" }` when RLS blocks
   * access or any other error occurs — never throws.
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
        // Translate common RLS / permission errors to user-friendly messages
        const msg = error.message?.toLowerCase() ?? '';
        if (msg.includes('rls') || msg.includes('permission') || msg.includes('policy')) {
          return { rows: [], rowCount: null, error: 'Sem permissão de leitura nesta tabela (RLS ativo).' };
        }
        return { rows: [], rowCount: null, error: 'Erro ao buscar dados: ' + error.message };
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
