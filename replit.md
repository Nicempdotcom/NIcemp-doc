# NicEmp Docs

A Portuguese-language documentation and analysis platform for software projects. Users upload a ZIP of their codebase (or connect directly via GitHub) and the app parses it into structured entities (pages, components, hooks, APIs, database tables, etc.), displaying them via an interactive dashboard with glossary, history, comparison, org chart, and live explorer views.

## Stack

- **Frontend**: React + Vite + TypeScript (`artifacts/nicemp-docs`)
- **Backend**: Node.js + Express API server (`artifacts/api-server`)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Persistence**: Supabase (PostgreSQL)

## How to run

1. Install dependencies (first time only): `pnpm install` at the workspace root.
2. Start the workflows from the Replit UI:
   - **`artifacts/nicemp-docs: web`** — main React app, served at `/`
   - **`artifacts/api-server: API Server`** — backend API, served at `/api`

## Required secrets

Set these in Replit's Secrets panel before using the corresponding features:

| Secret | Required for | How to obtain |
|---|---|---|
| `GITHUB_CLIENT_ID` | GitHub import (Device Flow) | Create a GitHub OAuth App — see below |
| `GITHUB_CLIENT_SECRET` | GitHub import (Device Flow) | Same OAuth App |
| `SUPABASE_URL` | Persistent storage | Supabase project settings → API |
| `SUPABASE_ANON_KEY` | Persistent storage | Supabase project settings → API |
| `SESSION_SECRET` | Session signing | Any long random string |

### Creating a GitHub OAuth App (for "Importar do GitHub")

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: NicEmp Docs (or any name)
   - **Homepage URL**: your Replit app URL
   - **Authorization callback URL**: leave blank (Device Flow does not use it)
3. Check **"Enable Device Flow"**
4. Click **Register application**
5. Copy the **Client ID** → set as `GITHUB_CLIENT_ID`
6. Click **Generate a new client secret** → set as `GITHUB_CLIENT_SECRET`

## Project structure

```
artifacts/
  nicemp-docs/    # React + Vite frontend
    src/
      app/        # Layouts, routing (App.tsx, Sidebar.tsx)
      features/   # Feature modules (per page)
      services/   # Business logic, parsers, GitHub provider
      database/   # Supabase client + queries
      hooks/      # Shared React hooks
      utils/      # Utility functions
      workers/    # Web workers (analysis pipeline)
    worker.ts     # Cloudflare Worker (production only) — proxies GitHub OAuth
  api-server/     # Express API server
    src/routes/   # API route handlers (github.ts, etc.)
  mockup-sandbox/ # Component preview sandbox (Canvas)
lib/
  db/             # Drizzle ORM schema + migrations
  api-client-react/ # Typed API client (React Query)
  api-spec/       # OpenAPI spec
  api-zod/        # Zod validation schemas
```

## API routing

- In **Replit dev**, browser requests to `/api/*` are routed by Replit's reverse proxy directly to the `api-server` artifact — the Vite proxy in `vite.config.ts` is a local-dev fallback only.
- In **Cloudflare production**, `artifacts/nicemp-docs/worker.ts` handles `/api/github/*` routes inline; all other requests serve the Vite static build.

## User preferences

<!-- Record user preferences here as they are confirmed -->
