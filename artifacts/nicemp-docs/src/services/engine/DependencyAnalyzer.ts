/**
 * DependencyAnalyzer
 *
 * Parses all package.json files in the project and extracts import
 * statements from TypeScript/JavaScript source files to build a
 * complete dependency map.
 */

import type { ScannedFile, DependencyMap, DependencyEntry, ImportEntry, PackageInfo } from './types';

// ─── Node.js built-in module list ─────────────────────────────────────────────

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers',
  'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'wasi',
  'worker_threads', 'zlib',
]);

function isBuiltin(mod: string): boolean {
  const base = mod.startsWith('node:') ? mod.slice(5) : mod;
  return NODE_BUILTINS.has(base);
}

function isInternal(mod: string): boolean {
  return mod.startsWith('.') || mod.startsWith('@/') || mod.startsWith('~/') || mod.startsWith('#');
}

// ─── Package manager detection ────────────────────────────────────────────────

function detectPackageManager(files: ScannedFile[]): DependencyMap['packageManager'] {
  const names = new Set(files.map((f) => f.name.toLowerCase()));
  if (names.has('pnpm-lock.yaml') || names.has('.npmrc')) {
    // .npmrc alone isn't conclusive; pnpm-lock.yaml is
    if (names.has('pnpm-lock.yaml')) return 'pnpm';
  }
  if (names.has('bun.lockb')) return 'bun';
  if (names.has('yarn.lock')) return 'yarn';
  if (names.has('package-lock.json')) return 'npm';
  return 'unknown';
}

// ─── Import extractor ─────────────────────────────────────────────────────────

const IMPORT_RE = /(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_RE = /(?:^|\n)\s*(?:const|let|var)\s+[^=]+=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function extractImports(file: ScannedFile): ImportEntry[] {
  if (file.isBinary || !file.content) return [];
  const ext = file.ext.toLowerCase();
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return [];

  const imports: ImportEntry[] = [];
  const seen = new Set<string>();

  const addImport = (mod: string) => {
    if (seen.has(mod)) return;
    seen.add(mod);
    imports.push({
      from: file.path,
      module: mod,
      kind: isInternal(mod) ? 'internal' : isBuiltin(mod) ? 'builtin' : 'external',
    });
  };

  for (const re of [IMPORT_RE, REQUIRE_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content)) !== null) {
      addImport(m[1]);
    }
  }

  return imports;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export class DependencyAnalyzer {
  analyze(files: ScannedFile[]): DependencyMap {
    const packages: PackageInfo[]      = [];
    const dependencies: DependencyEntry[]    = [];
    const devDependencies: DependencyEntry[] = [];
    const peerDependencies: DependencyEntry[] = [];
    const imports: ImportEntry[]       = [];

    // ── Parse package.json files ───────────────────────────────────────────
    for (const file of files) {
      if (file.name.toLowerCase() !== 'package.json' || file.isBinary) continue;

      let pkg: Record<string, any>;
      try {
        pkg = JSON.parse(file.content);
      } catch {
        continue;
      }

      const info: PackageInfo = {
        name:    typeof pkg.name    === 'string' ? pkg.name    : '(unnamed)',
        version: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
        path:    file.path,
      };
      packages.push(info);

      const push = (
        deps: Record<string, string> | undefined,
        kind: DependencyEntry['kind'],
        target: DependencyEntry[],
      ) => {
        if (!deps || typeof deps !== 'object') return;
        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === 'string') {
            target.push({ name, version, kind });
          }
        }
      };

      push(pkg.dependencies,     'prod', dependencies);
      push(pkg.devDependencies,  'dev',  devDependencies);
      push(pkg.peerDependencies, 'peer', peerDependencies);
    }

    // ── Extract imports from source files ──────────────────────────────────
    for (const file of files) {
      imports.push(...extractImports(file));
    }

    return {
      packages,
      dependencies,
      devDependencies,
      peerDependencies,
      imports,
      packageManager: detectPackageManager(files),
    };
  }
}
