/**
 * StructureAnalyzer
 *
 * Categorizes every ScannedFile into a FileCategory and
 * builds a recursive DirectoryNode tree from the flat file list.
 */

import type { ScannedFile, CategorizedFile, DirectoryNode, FileCategory } from './types';

// ─── Categorization rules ────────────────────────────────────────────────────

const ASSET_DIRS = new Set(['assets', 'public', 'static', 'images', 'icons', 'media', 'fonts']);

function categorize(file: ScannedFile): FileCategory {
  const { path, name, ext, isBinary } = file;
  const lower  = path.toLowerCase();
  const lName  = name.toLowerCase();
  const parts  = lower.split('/').filter(Boolean);

  // ── Binary / Asset ────────────────────────────────────────────────────────
  if (isBinary) return 'asset';
  if (parts.some((p) => ASSET_DIRS.has(p))) return 'asset';

  // ── Config ────────────────────────────────────────────────────────────────
  const CONFIG_FILES = new Set([
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
    '.gitignore', '.gitattributes', '.npmrc', '.nvmrc', '.node-version',
    '.prettierrc', '.prettierignore', '.eslintrc', '.eslintignore',
    'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    '.editorconfig', '.browserslistrc',
  ]);
  if (CONFIG_FILES.has(lName)) return 'config';
  if (lName.startsWith('tsconfig')) return 'config';
  if (/^(vite|webpack|rollup|esbuild|jest|vitest|babel|postcss)\.config/.test(lName)) return 'config';
  if (lName.startsWith('.env')) return 'config';
  if (lName === 'drizzle.config.ts' || lName === 'drizzle.config.js') return 'config';

  // ── Style ─────────────────────────────────────────────────────────────────
  if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) return 'style';
  if (lName.endsWith('.styles.ts') || lName.endsWith('.styles.tsx') || lName.endsWith('.styled.ts')) return 'style';

  // ── Test ──────────────────────────────────────────────────────────────────
  if (lName.includes('.test.') || lName.includes('.spec.') || lName.includes('.e2e.')) return 'test';
  if (parts.some((p) => ['__tests__', '__mocks__', 'e2e', 'cypress', 'playwright'].includes(p))) return 'test';
  if (parts.length >= 2 && parts[parts.length - 2] === 'tests') return 'test';

  // ── Script ────────────────────────────────────────────────────────────────
  if (['.sh', '.bash', '.ps1', '.cmd', '.bat'].includes(ext)) return 'script';
  if (parts.includes('scripts') || parts.includes('cli')) return 'script';

  // ── Database ──────────────────────────────────────────────────────────────
  if (parts.some((p) => ['migrations', 'prisma', 'drizzle'].includes(p))) return 'database';
  if (parts.length >= 2 && ['db', 'database'].includes(parts[parts.length - 2])) return 'database';
  if (lName === 'schema.prisma' || lName.endsWith('.model.ts') || lName.endsWith('.entity.ts')) return 'database';

  // ── Schema ────────────────────────────────────────────────────────────────
  if (parts.includes('schemas') || parts.includes('schema')) return 'schema';
  if (lName.endsWith('.schema.ts') || lName.endsWith('.schema.js') || lName.endsWith('.schema.zod.ts')) return 'schema';

  // ── API / Backend routes ──────────────────────────────────────────────────
  if (lName.endsWith('.controller.ts') || lName.endsWith('.controller.js')) return 'api';
  if (lName.endsWith('.handler.ts') || lName.endsWith('.endpoint.ts')) return 'api';
  if (lName.endsWith('.route.ts') || lName.endsWith('.router.ts')) return 'api';
  if (parts.includes('controllers') || parts.includes('handlers') || parts.includes('endpoints')) return 'api';
  // /api/ in path AND not inside a pages directory (Next.js API routes)
  if (parts.includes('api') && !parts.includes('pages')) return 'api';
  if (parts.includes('apis')) return 'api';

  // ── Routes ────────────────────────────────────────────────────────────────
  const ROUTE_NAMES = new Set(['routes.ts', 'routes.tsx', 'router.ts', 'router.tsx', 'routing.ts', 'navigation.ts', 'navigation.tsx']);
  if (ROUTE_NAMES.has(lName)) return 'route';
  if (parts.includes('routes') || parts.includes('router') || parts.includes('navigation')) return 'route';

  // ── Hook ─────────────────────────────────────────────────────────────────
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && /^use[A-Z]/.test(name)) return 'hook';
  if (parts.includes('hooks')) return 'hook';

  // ── Context ──────────────────────────────────────────────────────────────
  if (lName.endsWith('context.ts') || lName.endsWith('context.tsx')) return 'context';
  if (parts.includes('contexts') || parts.includes('context')) return 'context';

  // ── Provider ─────────────────────────────────────────────────────────────
  if (lName.endsWith('provider.ts') || lName.endsWith('provider.tsx')) return 'provider';
  if (parts.includes('providers')) return 'provider';

  // ── Layout ───────────────────────────────────────────────────────────────
  if (lName.endsWith('layout.ts') || lName.endsWith('layout.tsx')) return 'layout';
  if (parts.includes('layouts') || parts.includes('layout')) return 'layout';

  // ── Page ─────────────────────────────────────────────────────────────────
  // Next.js: page.tsx / page.js at any depth under app/
  if (lName === 'page.tsx' || lName === 'page.ts' || lName === 'page.js') return 'page';
  if (lName.endsWith('page.tsx') || lName.endsWith('page.ts')) return 'page';
  if (lName.endsWith('screen.tsx') || lName.endsWith('view.tsx')) return 'page';
  if (parts.some((p) => ['pages', 'screens', 'views'].includes(p))) return 'page';

  // ── Component ─────────────────────────────────────────────────────────────
  if (parts.includes('components') || parts.includes('component') || parts.includes('ui')) return 'component';
  // PascalCase .tsx / .jsx at any depth → component
  if (['.tsx', '.jsx'].includes(ext) && /^[A-Z]/.test(name)) return 'component';

  return 'other';
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(files: CategorizedFile[]): DirectoryNode {
  const root: DirectoryNode = {
    name: '.',
    path: '',
    depth: 0,
    children: [],
    files: [],
    totalFiles: 0,
  };

  const dirMap = new Map<string, DirectoryNode>();
  dirMap.set('', root);

  function ensureDir(dirPath: string): DirectoryNode {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;

    const parts  = dirPath.split('/');
    const name   = parts[parts.length - 1];
    const parent = ensureDir(parts.slice(0, -1).join('/'));

    const node: DirectoryNode = {
      name,
      path: dirPath,
      depth: parts.length,
      children: [],
      files: [],
      totalFiles: 0,
    };
    parent.children.push(node);
    dirMap.set(dirPath, node);
    return node;
  }

  for (const file of files) {
    const pathParts = file.path.split('/');
    const dirPath   = pathParts.slice(0, -1).join('/');
    const dir       = ensureDir(dirPath);
    dir.files.push(file);
  }

  // Compute totalFiles recursively
  function sumFiles(node: DirectoryNode): number {
    const direct   = node.files.length;
    const indirect = node.children.reduce((acc, c) => acc + sumFiles(c), 0);
    node.totalFiles = direct + indirect;
    return node.totalFiles;
  }
  sumFiles(root);

  // Sort children alphabetically
  function sortNode(node: DirectoryNode): void {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortNode);
  }
  sortNode(root);

  return root;
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

export class StructureAnalyzer {
  analyze(files: ScannedFile[]): { categorized: CategorizedFile[]; tree: DirectoryNode } {
    const categorized: CategorizedFile[] = files.map((f) => ({
      ...f,
      category: categorize(f),
      depth:    f.path.split('/').length - 1,
    }));

    const tree = buildTree(categorized);
    return { categorized, tree };
  }
}
