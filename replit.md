# NicEmp Docs

A Portuguese-language documentation and analysis platform for software projects. Users upload a ZIP of their codebase and the app parses it into structured entities (pages, components, hooks, APIs, database tables, etc.), displaying them via an interactive dashboard with glossary, history, comparison, org chart, and live explorer views.

## Stack

- **Frontend**: React + Vite + TypeScript (`artifacts/nicemp-docs`)
- **Backend**: Node.js API server (`artifacts/api-server`)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Persistence**: Supabase (PostgreSQL)

## How to run

All workflows are configured. Start from the Replit UI:
- **NicEmp Docs** (`artifacts/nicemp-docs: web`) — main React app, served at `/`
- **API Server** (`artifacts/api-server: API Server`) — backend API, served at `/api`

Dependencies: `pnpm install` at the root.

## Project structure

```
artifacts/
  nicemp-docs/    # React + Vite frontend
    src/
      app/        # Layouts, routing
      features/   # Feature modules
      services/   # Business logic, parsers, prompts
      database/   # Supabase client + queries
      hooks/      # Shared React hooks
      utils/      # Utility functions
      workers/    # Web workers
  api-server/     # Fastify API server
  mockup-sandbox/ # Component preview sandbox (Canvas)
```

## User preferences

<!-- Record user preferences here as they are confirmed -->
