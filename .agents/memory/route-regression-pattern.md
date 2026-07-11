---
name: Route regression pattern — App.tsx / Sidebar.tsx
description: Overview, Explorer, and Glossario routes have been silently dropped twice when App.tsx or Sidebar.tsx were rewritten wholesale. Explains root cause and required safeguard.
---

## The pattern
Whenever App.tsx or Sidebar.tsx are **rewritten from scratch** (as opposed to surgically edited), the agent reconstructs them from context — and only includes routes/nav items it has active context for at that moment. Routes that were previously added by older tasks (Overview/Organograma, Explorer/Explorador ao vivo, Glossario/Glossário) are silently dropped because they aren't in the immediately visible working context.

**Why this happens:** Wholesale rewrites lose institutional memory. Surgical edits (Edit tool) cannot drop things that weren't in the old_string.

## The rule
Any task that touches `src/App.tsx` or `src/app/layouts/Sidebar.tsx` MUST:
1. Prefer surgical edits (Edit tool) over full rewrites.
2. If a full rewrite is unavoidable, read the existing file first and carry ALL existing routes/nav items forward.
3. Run `pnpm --filter @workspace/nicemp-docs run check:routes` after any edit to App.tsx. This script verifies every key in `src/routes.tsx` has a `<Route path={ROUTES.xxx}>` in App.tsx and exits 1 if anything is missing.

## Routes that have been dropped before (do not drop again)
- `ROUTES.overview` → `src/app/pages/Overview` — "Organograma" (Network icon), Plataforma group
- `ROUTES.explorer` → `src/app/pages/Explorer` — "Explorador ao vivo" (Search icon), Plataforma group  
- `ROUTES.glossario` → `src/app/pages/Glossario` — "Glossário" (BookOpen icon), Documentação group

## Breadcrumb coverage
`src/app/layouts/Breadcrumb.tsx` must have a `case ROUTES.xxx` label for every route. `explorer` was missing and has been added. Check this file too when adding new routes.
