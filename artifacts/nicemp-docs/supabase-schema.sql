-- ─────────────────────────────────────────────────────────────────────────────
-- NicEmp Docs — Supabase Schema
--
-- Run this entire script in Supabase Studio → SQL Editor.
-- Each table stores one "store" from the documentation database.
-- Schema: id (text PK), data (jsonb), updated_at (auto-timestamp).
-- Rule: `data` must NEVER contain raw source code — only entity metadata.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS versions (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS version_snapshots (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS components (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hooks (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apis (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- NOTE: "tables" is a reserved word in SQL — uses database_tables instead.
CREATE TABLE IF NOT EXISTS database_tables (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dependencies (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technologies (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS history (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_edges (
  id         text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ── 2. updated_at triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects','versions','version_snapshots','pages','components','hooks',
    'apis','database_tables','dependencies','technologies','history',
    'interactions','import_edges'
  ] LOOP
    EXECUTE format('
      CREATE OR REPLACE TRIGGER %I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl, tbl);
  END LOOP;
END $$;

-- ── 3. Row Level Security ─────────────────────────────────────────────────────
-- Any authenticated user can read and write all rows.
-- No per-row ownership: it is a fully shared database for all partners.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects','versions','version_snapshots','pages','components','hooks',
    'apis','database_tables','dependencies','technologies','history',
    'interactions','import_edges'
  ] LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- SELECT
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS %I ON %I
      FOR SELECT TO authenticated USING (true);
    ', tbl || '_select', tbl);

    -- INSERT
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS %I ON %I
      FOR INSERT TO authenticated WITH CHECK (true);
    ', tbl || '_insert', tbl);

    -- UPDATE
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS %I ON %I
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    ', tbl || '_update', tbl);

    -- DELETE
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS %I ON %I
      FOR DELETE TO authenticated USING (true);
    ', tbl || '_delete', tbl);
  END LOOP;
END $$;
