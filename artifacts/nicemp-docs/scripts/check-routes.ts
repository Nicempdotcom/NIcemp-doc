#!/usr/bin/env tsx
/**
 * check-routes.ts
 *
 * Verifies that every key defined in ROUTES (src/routes.tsx) has a
 * corresponding <Route path={ROUTES.xxx}> in src/App.tsx.
 *
 * Run:  pnpm --filter @workspace/nicemp-docs run check:routes
 *
 * Exits with code 1 (breaking build/typecheck pipeline) if any route
 * is declared in routes.tsx but missing from App.tsx.
 *
 * WHY THIS EXISTS:
 * App.tsx and Sidebar.tsx have been rewritten wholesale twice during
 * feature work, silently dropping Overview/Explorer/Glossario routes
 * each time. This script catches that class of regression before deploy.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── 1. Extract all keys from ROUTES in routes.tsx ────────────────────────────
const routesSrc = readFileSync(resolve(root, 'src/routes.tsx'), 'utf-8');

// Match:  someKey:   '/path',
const routeKeyRe = /^\s{2}(\w+)\s*:/gm;
const routeKeys: string[] = [];
let m: RegExpExecArray | null;
while ((m = routeKeyRe.exec(routesSrc)) !== null) {
  routeKeys.push(m[1]);
}

if (routeKeys.length === 0) {
  console.error('check-routes: could not parse any keys from src/routes.tsx');
  process.exit(1);
}

// ── 2. Check each key appears in App.tsx as path={ROUTES.xxx} ────────────────
const appSrc = readFileSync(resolve(root, 'src/App.tsx'), 'utf-8');

const missing: string[] = [];
for (const key of routeKeys) {
  // Accept both  path={ROUTES.key}  and  path={ ROUTES.key }
  const pattern = new RegExp(`path=\\{\\s*ROUTES\\.${key}\\s*\\}`);
  if (!pattern.test(appSrc)) {
    missing.push(key);
  }
}

// ── 3. Report ─────────────────────────────────────────────────────────────────
if (missing.length === 0) {
  console.log(`✅  check-routes: all ${routeKeys.length} routes are present in App.tsx`);
  process.exit(0);
} else {
  console.error(`\n❌  check-routes: ${missing.length} route(s) declared in routes.tsx but missing from App.tsx:\n`);
  for (const key of missing) {
    console.error(`    ROUTES.${key}  →  no matching <Route path={ROUTES.${key}}> found`);
  }
  console.error(`\nAdd the missing <Route> element(s) to src/App.tsx and re-run.\n`);
  process.exit(1);
}
