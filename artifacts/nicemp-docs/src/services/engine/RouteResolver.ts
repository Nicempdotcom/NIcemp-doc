// ─── RouteResolver — real-route inference from the analyzed project's own ────
// routing files, instead of guessing from the file path.
//
// Some projects (e.g. nicemp.com) keep every page/tool flat under `src/pages/`
// with no folder-per-route structure, so `inferRoute()` (path-based guessing,
// see `src/services/storage/mapper.ts`) produces wrong results for them. This
// resolver instead reads the project's actual route declarations:
//
//   1. A route map file (routes.ts, constants/routes.ts, router.ts, ...)
//      exporting an object of `chave: "valor"` pairs.
//   2. Every `<Route ...>` JSX tag anywhere in the project, associating a
//      resolved path with the component it renders.
//
// It relies on the project convention that the page's file name matches its
// exported component name (e.g. `ROICalculator.tsx` exports `ROICalculator`),
// so page <-> route can be matched by name without a full AST parse — a
// pragmatic regex-based approach, same spirit as `scripts/check-routes.mjs`.

import type { CategorizedFile } from './types';

// ── 1. Route map files ────────────────────────────────────────────────────────

const ROUTE_CONFIG_FILE_NAMES = new Set([
  'routes.ts', 'routes.tsx', 'routes.js', 'routes.jsx',
  'router.ts', 'router.tsx',
  'routing.ts', 'routing.tsx',
  'navigation.ts', 'navigation.tsx',
]);

function isRouteConfigFile(file: CategorizedFile): boolean {
  const lowerName = file.name.toLowerCase();
  const lowerPath = file.path.toLowerCase();
  if (ROUTE_CONFIG_FILE_NAMES.has(lowerName)) return true;
  // Common nested location: src/constants/routes.ts
  if (/\/constants\/routes\.(ts|tsx|js|jsx)$/.test(lowerPath)) return true;
  return false;
}

/** Extracts `chave: "valor"` / `chave: 'valor'` pairs from a route map file's content. */
function extractRouteKeyMap(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const pairRe = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pairRe.exec(content)) !== null) {
    const [, key, value] = match;
    map.set(key, value);
  }
  return map;
}

function buildRouteKeyMap(files: CategorizedFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of files) {
    if (file.isBinary || !file.content) continue;
    if (!isRouteConfigFile(file)) continue;
    for (const [key, value] of extractRouteKeyMap(file.content)) {
      map.set(key, value);
    }
  }
  return map;
}

// ── 2. `<Route ...>` occurrences (any file, not just files categorized as "route") ──

/** Matches a full opening `<Route ...>` (or self-closing `<Route ... />`) tag. */
const ROUTE_TAG_RE = /<Route\b[^>]*>/g;

/** `path="/literal"` or `path='/literal'`. */
const PATH_LITERAL_RE = /path\s*=\s*["']([^"']+)["']/;
/** `path={algumaCoisa.chave}` — captures the `chave` part. */
const PATH_REF_RE = /path\s*=\s*\{\s*[\w$]+\.(\w+)\s*\}/;
/** `component={Nome}`. */
const COMPONENT_RE = /component\s*=\s*\{\s*(\w+)\s*\}/;
/** `element={<Nome .../>}` or `element={<Nome>...}`. */
const ELEMENT_RE = /element\s*=\s*\{\s*<\s*(\w+)\b/;

interface RouteOccurrence {
  componentName: string;
  /** Literal path string, when the route uses `path="/literal"`. */
  literalPath?: string;
  /** Key to resolve against the route key map, when the route uses `path={obj.chave}`. */
  pathKey?: string;
}

function extractRouteOccurrences(content: string): RouteOccurrence[] {
  const occurrences: RouteOccurrence[] = [];
  let tagMatch: RegExpExecArray | null;
  ROUTE_TAG_RE.lastIndex = 0;
  while ((tagMatch = ROUTE_TAG_RE.exec(content)) !== null) {
    const tag = tagMatch[0];

    const componentName = tag.match(COMPONENT_RE)?.[1] ?? tag.match(ELEMENT_RE)?.[1];
    if (!componentName) continue;

    const literalPath = tag.match(PATH_LITERAL_RE)?.[1];
    const pathKey = tag.match(PATH_REF_RE)?.[1];
    if (!literalPath && !pathKey) continue;

    occurrences.push({ componentName, literalPath, pathKey });
  }
  return occurrences;
}

/**
 * Builds a map of "component/file name" -> "real route", derived from the
 * project's own route map file(s) and `<Route>` declarations.
 *
 * Returns an empty map (never throws) when no route config or `<Route>` tags
 * are found — callers should fall back to path-based inference in that case.
 */
export function resolveRealRoutes(files: CategorizedFile[]): Map<string, string> {
  const routeKeyMap = buildRouteKeyMap(files);
  const resolved = new Map<string, string>();

  for (const file of files) {
    if (file.isBinary || !file.content) continue;
    if (!file.content.includes('<Route')) continue;

    for (const occurrence of extractRouteOccurrences(file.content)) {
      let route: string | undefined;
      if (occurrence.literalPath) {
        route = occurrence.literalPath;
      } else if (occurrence.pathKey) {
        route = routeKeyMap.get(occurrence.pathKey);
      }
      if (!route) continue;
      resolved.set(occurrence.componentName, route);
    }
  }

  return resolved;
}
