// ─── Path exclusions — backup/build folders excluded before categorization ───
//
// These are never real source code: build output, migration backups, VCS
// metadata and dependency trees. Left in, they get scanned/categorized as if
// they were real pages/components, duplicating entities and confusing which
// "module" a file belongs to. This filter runs at the very start of the
// pipeline (right after listing ZIP entries), before StructureAnalyzer ever
// sees a path — it is not a categorization rule.

const EXCLUDED_SEGMENTS = new Set([
  '.migration-backup',
  'dist-cloudflare',
  'dist',
  'build',
  '.git',
  'node_modules',
]);

/**
 * True when `path` starts with, or contains as a full path segment, one of
 * the excluded backup/build folder names (e.g. `dist/index.js`,
 * `src/dist/foo.ts`, `.migration-backup/pages/Old.tsx`). Matches whole
 * segments only — e.g. `src/distribution/x.ts` is NOT excluded.
 */
export function isExcludedPath(path: string): boolean {
  return path.split('/').some((segment) => EXCLUDED_SEGMENTS.has(segment));
}
