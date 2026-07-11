/**
 * urlMatch.ts
 *
 * Best-effort matching between a live URL pasted by the user and a
 * detected PageEntity in the documentation database (EPIC 10 —
 * "Explorador ao vivo"). Approximate by design: it works well for
 * conventional file/folder routing (pages/, app/.../page.tsx, screens/,
 * views/) and will not resolve custom routers, dynamic rewrites, or
 * server-side redirects.
 */

import type { PageEntity } from '@/services/storage/types';

/** Extract just the path (no origin, no trailing slash, no query/hash) from a URL string. */
export function extractPathFromUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return '/';

  let path: string;
  try {
    // New URL() requires a protocol; add one if the user pasted a bare domain/path.
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    path = url.pathname;
  } catch {
    // Not a parseable URL — treat the input itself as a path.
    path = raw.startsWith('/') ? raw : `/${raw}`;
  }

  path = path.replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** Normalize a route string the same way, for consistent comparison. */
function normalizeRoute(route: string): string {
  if (!route) return '/';
  const withSlash = route.startsWith('/') ? route : `/${route}`;
  const trimmed = withSlash.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** Score similarity between the requested path and a candidate route (0–1). */
function similarity(path: string, route: string): number {
  const a = normalizeRoute(path).split('/').filter(Boolean);
  const b = normalizeRoute(route).split('/').filter(Boolean);
  if (a.length === 0 && b.length === 0) return 1;

  const maxLen = Math.max(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].toLowerCase() === b[i].toLowerCase()) matches += 1;
    // Dynamic segments (e.g. ":id", "[id]") count as a soft match against anything.
    else if (/^(:|\[)/.test(b[i]) || /^(:|\[)/.test(a[i])) matches += 0.5;
  }
  return matches / maxLen;
}

export interface UrlMatchResult {
  path:  string;
  exact: PageEntity | null;
  /** Similar pages sorted by descending score, only populated when there's no exact match. */
  suggestions: { page: PageEntity; score: number }[];
}

/** Match a live URL's path against the project's detected pages. */
export function matchPageByPath(rawUrl: string, pages: PageEntity[]): UrlMatchResult {
  const path = extractPathFromUrl(rawUrl);
  const normalizedPath = normalizeRoute(path);

  const exact = pages.find((p) => normalizeRoute(p.route) === normalizedPath) ?? null;
  if (exact) {
    return { path, exact, suggestions: [] };
  }

  const suggestions = pages
    .map((page) => ({ page, score: similarity(path, page.route) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { path, exact: null, suggestions };
}
