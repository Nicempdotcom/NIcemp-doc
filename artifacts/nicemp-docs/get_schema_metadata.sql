-- =============================================================================
-- get_schema_metadata()
--
-- Retorna o schema completo do banco (tabelas, colunas, PKs, FKs) em JSON.
-- Roda com SECURITY DEFINER para acessar information_schema mesmo que o
-- caller (anon / authenticated) não tenha acesso direto a esses catálogos.
--
-- Como usar:
--   1. Cole este script no SQL Editor do Supabase e execute.
--   2. O GRANT ao final já libera a chamada via anon key — sem precisar
--      expor information_schema nas configurações de API.
--   3. No painel NicEmp Docs, vá em Banco de Dados → Live (Supabase) e
--      clique em "Sincronizar". A auto-detecção chamará a função via RPC.
--
-- Para revogar o acesso externo (se necessário):
--   REVOKE EXECUTE ON FUNCTION public.get_schema_metadata() FROM anon, authenticated;
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_schema_metadata()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_agg(t ORDER BY t.name)
  FROM (
    SELECT
      tbl.table_name AS name,

      -- ── Colunas ────────────────────────────────────────────────────────────
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name',          col.column_name,
            -- Preferir udt_name para enums/tipos customizados; senão data_type
            'type',          CASE
                               WHEN col.udt_name IS NOT NULL
                                AND col.udt_name NOT LIKE '\_%'
                               THEN col.udt_name
                               ELSE col.data_type
                             END,
            'nullable',      col.is_nullable = 'YES',
            'is_primary_key', EXISTS (
              SELECT 1
              FROM   information_schema.table_constraints tc
              JOIN   information_schema.key_column_usage  kcu
                     ON  kcu.constraint_name = tc.constraint_name
                     AND kcu.constraint_schema = tc.constraint_schema
              WHERE  tc.constraint_type  = 'PRIMARY KEY'
              AND    tc.table_schema     = col.table_schema
              AND    tc.table_name       = col.table_name
              AND    kcu.column_name     = col.column_name
            ),
            -- "referenced_table.referenced_column" ou null
            'foreign_key',   (
              SELECT ref_tbl.table_name || '.' || ref_kcu.column_name
              FROM   information_schema.table_constraints     fk_tc
              JOIN   information_schema.key_column_usage      fk_kcu
                     ON  fk_kcu.constraint_name  = fk_tc.constraint_name
                     AND fk_kcu.constraint_schema = fk_tc.constraint_schema
              JOIN   information_schema.referential_constraints rc
                     ON  rc.constraint_name   = fk_tc.constraint_name
                     AND rc.constraint_schema = fk_tc.constraint_schema
              JOIN   information_schema.table_constraints     ref_tc
                     ON  ref_tc.constraint_name   = rc.unique_constraint_name
                     AND ref_tc.constraint_schema  = rc.unique_constraint_schema
              JOIN   information_schema.key_column_usage      ref_kcu
                     ON  ref_kcu.constraint_name   = ref_tc.constraint_name
                     AND ref_kcu.constraint_schema  = ref_tc.constraint_schema
                     AND ref_kcu.ordinal_position   = fk_kcu.position_in_unique_constraint
              JOIN   information_schema.tables                ref_tbl
                     ON  ref_tbl.table_name   = ref_tc.table_name
                     AND ref_tbl.table_schema  = ref_tc.constraint_schema
              WHERE  fk_tc.constraint_type = 'FOREIGN KEY'
              AND    fk_tc.table_schema    = col.table_schema
              AND    fk_tc.table_name      = col.table_name
              AND    fk_kcu.column_name    = col.column_name
              LIMIT  1
            )
          )
          ORDER BY col.ordinal_position
        )
        FROM information_schema.columns col
        WHERE col.table_schema = tbl.table_schema
          AND col.table_name   = tbl.table_name
      ) AS columns

    FROM information_schema.tables tbl
    WHERE tbl.table_schema = 'public'
      AND tbl.table_type   = 'BASE TABLE'
  ) t;
$$;

-- Permite que clientes com anon key ou authenticated key chamem via RPC.
-- A função roda com os privilégios do owner (SECURITY DEFINER),
-- então o anon só vê o resultado final — não tem acesso direto ao catálogo.
GRANT EXECUTE ON FUNCTION public.get_schema_metadata() TO anon, authenticated;
