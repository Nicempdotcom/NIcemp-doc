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

// ─── Auto-discovery helpers ────────────────────────────────────────────────────

/** Raw row from information_schema.columns */
interface ISColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string; // 'YES' | 'NO'
  udt_name: string;
}

/** Raw row from information_schema.key_column_usage (joined with table_constraints) */
interface ISKeyColumn {
  table_name: string;
  column_name: string;
  constraint_name: string;
  constraint_type: string; // 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE'
}

/** Raw row from information_schema.referential_constraints joined with key_column_usage */
interface ISForeignKey {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

/**
 * Fetch a JSON array from information_schema via PostgREST's Accept-Profile header.
 * Returns null when the schema is not exposed (non-2xx) or on network error.
 */
async function fetchInfoSchema<T>(
  baseUrl: string,
  anonKey: string,
  path: string,
): Promise<T[] | null> {
  try {
    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Accept-Profile': 'information_schema',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const LiveSupabaseIntrospector = {
  /**
   * Auto-discover all tables in the public schema using information_schema.
   *
   * Uses PostgREST's Accept-Profile header to switch to information_schema.
   * Includes column types (real Postgres types), nullability, primary keys,
   * and foreign key relationships.
   *
   * Returns method='none' with an error message when information_schema is not
   * accessible — callers should fall back to manual entry.
   *
   * Never throws.
   */
  async discoverTables(): Promise<DiscoverTablesResult> {
    const config = getAnalyzedSupabaseConfig();
    if (!config) {
      return { tables: [], method: 'none', error: 'Conexão não configurada.' };
    }

    try {
      // 1. Fetch all user tables in public schema
      const tableRows = await fetchInfoSchema<{ table_name: string }>(
        config.url,
        config.anonKey,
        "tables?table_schema=eq.public&table_type=eq.BASE TABLE&select=table_name&order=table_name",
      );

      if (!tableRows) {
        return {
          tables: [],
          method: 'none',
          error:
            'information_schema não acessível via PostgREST. Para habilitar, adicione ' +
            '"information_schema" na lista de schemas expostos no Supabase (API Settings → Extra search path). ' +
            'Use a adição manual de tabelas como alternativa.',
        };
      }

      const tableNames = tableRows.map((r) => r.table_name);
      if (tableNames.length === 0) {
        return { tables: [], method: 'information_schema' };
      }

      // 2. Fetch columns for all public tables
      const [columnRows, keyRows, fkRows] = await Promise.all([
        fetchInfoSchema<ISColumn>(
          config.url,
          config.anonKey,
          "columns?table_schema=eq.public&select=table_name,column_name,data_type,is_nullable,udt_name&order=table_name,ordinal_position",
        ),
        fetchInfoSchema<ISKeyColumn>(
          config.url,
          config.anonKey,
          "table_constraints?table_schema=eq.public&constraint_type=in.(PRIMARY KEY,FOREIGN KEY)&select=table_name,constraint_name,constraint_type" +
          "&key_column_usage(table_name,column_name,constraint_name)",
        ),
        // Fetch FK mappings via referential_constraints + key_column_usage join
        fetchInfoSchema<{ constraint_name: string; unique_constraint_name: string }>(
          config.url,
          config.anonKey,
          "referential_constraints?constraint_schema=eq.public&select=constraint_name,unique_constraint_name",
        ),
      ]);

      // Build PK set: tableName -> Set<columnName>
      const pkCols = new Map<string, Set<string>>();
      // Build FK map: "tableName.colName" -> "refTable.refCol"
      const fkMap = new Map<string, string>();

      // Query key_column_usage directly (simpler, no join needed)
      const [kcuPK, kcuFK, kcuRefFK] = await Promise.all([
        fetchInfoSchema<{ table_name: string; column_name: string; constraint_name: string }>(
          config.url,
          config.anonKey,
          "key_column_usage?table_schema=eq.public&select=table_name,column_name,constraint_name" +
          "&table_constraints(constraint_type=eq.PRIMARY KEY)&order=table_name,ordinal_position",
        ),
        fetchInfoSchema<{ table_name: string; column_name: string; constraint_name: string }>(
          config.url,
          config.anonKey,
          "key_column_usage?table_schema=eq.public&select=table_name,column_name,constraint_name&order=table_name,ordinal_position",
        ),
        // Get referenced columns for FK constraints
        fetchInfoSchema<{ table_name: string; column_name: string; constraint_name: string }>(
          config.url,
          config.anonKey,
          "key_column_usage?constraint_schema=eq.public&select=table_name,column_name,constraint_name&order=ordinal_position",
        ),
      ]);

      // Simpler approach: fetch pk and fk constraint names via table_constraints, then look up columns
      const tcRows = await fetchInfoSchema<{ table_name: string; constraint_name: string; constraint_type: string }>(
        config.url,
        config.anonKey,
        "table_constraints?table_schema=eq.public&constraint_type=in.(PRIMARY KEY,FOREIGN KEY)&select=table_name,constraint_name,constraint_type",
      );

      const pkConstraintNames = new Set<string>();
      const fkConstraintNames = new Set<string>();

      if (tcRows) {
        for (const tc of tcRows) {
          if (tc.constraint_type === 'PRIMARY KEY') pkConstraintNames.add(tc.constraint_name);
          if (tc.constraint_type === 'FOREIGN KEY') fkConstraintNames.add(tc.constraint_name);
        }
      }

      // Map constraint_name -> FK ref (from referential_constraints + unique_constraint_name -> table)
      // Build: fkConstraintName -> uniqueConstraintName (which holds the referenced table/col)
      const fkToRefConstraint = new Map<string, string>();
      if (fkRows) {
        for (const row of fkRows) {
          fkToRefConstraint.set(row.constraint_name, row.unique_constraint_name);
        }
      }

      // key_column_usage: all rows (kcuFK is all public kcu rows)
      const allKcu = kcuFK ?? [];
      const kcuByConstraint = new Map<string, { table_name: string; column_name: string }[]>();
      for (const row of allKcu) {
        if (!kcuByConstraint.has(row.constraint_name)) kcuByConstraint.set(row.constraint_name, []);
        kcuByConstraint.get(row.constraint_name)!.push(row);
      }

      // Build PK set
      for (const cn of pkConstraintNames) {
        const cols = kcuByConstraint.get(cn) ?? [];
        for (const c of cols) {
          if (!pkCols.has(c.table_name)) pkCols.set(c.table_name, new Set());
          pkCols.get(c.table_name)!.add(c.column_name);
        }
      }

      // Build FK map
      for (const [fkCn, refCn] of fkToRefConstraint) {
        const fromCols = kcuByConstraint.get(fkCn) ?? [];
        const toCols = kcuByConstraint.get(refCn) ?? [];
        // Usually 1:1 column pairs
        for (let i = 0; i < fromCols.length; i++) {
          const from = fromCols[i];
          const to = toCols[i];
          if (from && to) {
            fkMap.set(`${from.table_name}.${from.column_name}`, `${to.table_name}.${to.column_name}`);
          }
        }
      }

      // Build final table list
      const colsByTable = new Map<string, ISColumn[]>();
      if (columnRows) {
        for (const col of columnRows) {
          if (!colsByTable.has(col.table_name)) colsByTable.set(col.table_name, []);
          colsByTable.get(col.table_name)!.push(col);
        }
      }

      const tables: DiscoveredTable[] = tableNames.map((tName) => {
        const cols = colsByTable.get(tName) ?? [];
        const pk = pkCols.get(tName) ?? new Set();
        const columns: LiveColumn[] = cols.map((col) => {
          const fk = fkMap.get(`${tName}.${col.column_name}`);
          // Prefer udt_name for enum/custom types, fallback to data_type
          const pgType = col.udt_name && !col.udt_name.startsWith('_')
            ? col.udt_name
            : col.data_type;
          return {
            name:         col.column_name,
            type:         pgType,
            nullable:     col.is_nullable === 'YES',
            isPrimaryKey: pk.has(col.column_name) || undefined,
            foreignKey:   fk,
          };
        });
        return { name: tName, columns };
      });

      return { tables, method: 'information_schema' };
    } catch (err) {
      console.warn('[LiveSupabaseIntrospector] Exceção em discoverTables():', err);
      return {
        tables: [],
        method: 'none',
        error: 'Erro inesperado ao descobrir tabelas.',
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
