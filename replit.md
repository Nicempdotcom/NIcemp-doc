# NicEmp Docs

NicEmp Docs analyzes an uploaded project ZIP and generates/maintains living technical documentation (architecture, frontend, backend, DB, components, hooks, APIs, dependencies) for it, with versioning and comparison between analyses.

## Run & Operate

- `pnpm --filter @workspace/nicemp-docs run dev` — run the docs web app (artifact preview path `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, preview path `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already configured)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/nicemp-docs`), Radix UI, Tailwind
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nicemp-docs` — frontend (upload flow, docs viewer, comparison/history views)
- `artifacts/api-server` — Express API (ZIP upload/analysis endpoints)
- `lib/db` — Drizzle schema/migrations (source of truth for DB shape)
- `lib/api-spec` — OpenAPI spec (source of truth for API contracts)

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

NicEmp Docs lets a user upload a project as a ZIP, analyzes it, and produces browsable technical documentation (dashboard, architecture, frontend/backend/DB breakdowns, components, hooks, APIs, dependencies), plus version history and comparison between uploads.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
