---
name: NicEmp Docs — Supabase persistence
description: Architecture decisions for the localStorage → Supabase migration (EPIC 09 equivalent). Covers sync strategy, table naming, auth model, and Cloudflare build quirk.
---

## Sync strategy: cache + write-through (NOT full async migration)
All repositories and pages remain synchronous (read from localStorage cache). Zero callsite changes were needed. On startup, `HydrationService.hydrate()` pulls all Supabase rows into localStorage before the app renders. Every write operation in `StorageService` fires an async write-through to `SupabaseBackend` in the background (fire-and-forget, never awaited at the callsite).

**Why:** Making StorageService fully async would require converting every page, repository and provider to useEffect+state — 18+ files of churn. The cache strategy achieves the same shared-data goal with zero callsite changes and negligible staleness (one page-load round-trip).

**How to apply:** Any new StorageService method must: (1) read/write localStorage synchronously first, (2) fire the corresponding SupabaseBackend call fire-and-forget. Never await SupabaseBackend inside a sync StorageService method.

## Table naming quirk
`StoreKey 'tables'` maps to Postgres table `database_tables` because `tables` is a reserved word in SQL. This mapping lives in `SupabaseBackend.ts` → `TABLE_NAME` record. Don't rename the StoreKey — only the Supabase table name differs.

## Auth model
- Supabase Auth email/password, no public sign-up
- Accounts created manually in Supabase Studio (Authentication → Users → Invite user)
- `AuthProvider` wraps the whole app; `AuthGate` shows `Login` page when Supabase configured + no session
- `HydrationGate` runs hydration after auth resolves, before showing the app
- Graceful fallback: when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are absent, `isSupabaseConfigured = false` and the app works in localStorage-only mode (no login required, no Supabase calls made)

## RLS policy
All 13 tables: authenticated users get full SELECT/INSERT/UPDATE/DELETE. No per-row owner. Shared database for all partners.

## Cloudflare build quirk (pre-existing)
`vite.config.ts` throws if `PORT` is not set, even during `vite build`. This breaks `pnpm -w run build:cloudflare` in CI environments that don't inject PORT. Solution: set `PORT=3000` (any valid port) as a build-time environment variable in Cloudflare Pages → Settings → Environment variables.

## Cloudflare Pages env vars required
- `VITE_SUPABASE_URL` — the Project URL (https://xxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` — the anon/public key
- `PORT` — any valid port (e.g. 3000) — required by vite.config.ts at build time
- `BASE_PATH` — the base path prefix used by Cloudflare routing

## Source code rule confirmation
All entity `description` fields default to `''` in the mapper. `location` stores file paths (not content). `InteractionEntity.handlerName` is a function name string. No field stores raw source code content. The `data jsonb` column in Supabase only ever receives serialised entity objects from `STORE_FILE_NAMES` stores.
