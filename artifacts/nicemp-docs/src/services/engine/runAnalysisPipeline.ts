/**
 * runAnalysisPipeline
 *
 * The full ZIP → ProjectMap analysis pipeline, extracted so it can run
 * either inside the dedicated analysis Worker (preferred — keeps the UI
 * thread responsive) or directly on the main thread as a fallback when
 * Workers are unavailable (e.g. a restrictive iframe/CSP sandbox blocks
 * `new Worker(...)`). No artificial file/size limits are applied here —
 * the only ceiling is available memory.
 */

import JSZip from 'jszip';
import { StructureAnalyzer }    from './StructureAnalyzer';
import { DescriptionAnalyzer }  from './DescriptionAnalyzer';
import { DependencyAnalyzer }   from './DependencyAnalyzer';
import { TechnologyAnalyzer }   from './TechnologyAnalyzer';
import { InteractionAnalyzer }  from './InteractionAnalyzer';
import { ToolCategoryAnalyzer } from './ToolCategoryAnalyzer';
import { IntegrationAnalyzer }  from './IntegrationAnalyzer';
import type { ScannedFile, ProjectMap, FileCategory } from './types';
import { isExcludedPath } from './pathExclusions';

// ─── Live counts (kept in sync with src/workers/types.ts) ─────────────────────

export interface LiveCounts {
  filesScanned: number;
  filesTotal:   number;
  pages:        number;
  components:   number;
  hooks:        number;
  apis:         number;
  tables:       number;
}

export const EMPTY_COUNTS: LiveCounts = {
  filesScanned: 0, filesTotal: 0, pages: 0, components: 0, hooks: 0, apis: 0, tables: 0,
};

export class AnalysisCancelledError extends Error {
  constructor() { super('cancelled'); this.name = 'AnalysisCancelledError'; }
}

export interface RunPipelineCallbacks {
  onProgress: (pct: number, label: string, counts: LiveCounts) => void;
  /** Checked between steps; throw AnalysisCancelledError to abort cleanly. */
  isCancelled: () => boolean;
}

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp4', '.mp3', '.wav', '.ogg', '.avi', '.mov', '.mkv', '.webm',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pyc', '.class', '.o', '.a', '.db', '.sqlite', '.sqlite3',
]);

const MAX_TEXT = 200_000; // bytes per file

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function quickCat(path: string, isBinary: boolean): keyof Pick<LiveCounts, 'pages' | 'components' | 'hooks' | 'apis' | 'tables'> | null {
  if (isBinary) return null;
  const p    = path.toLowerCase();
  const name = p.split('/').pop() ?? '';
  const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';

  if (/\/pages\/|\/screens\/|\/views\//.test(p)) return 'pages';
  if (/page\.(tsx?|jsx?)$/.test(name)) return 'pages';
  if (/\/components\/|\/ui\//.test(p) || (/^[a-z]/.test(name) === false && ['.tsx', '.jsx'].includes(ext))) return 'components';
  if (/\/hooks\//.test(p) || /^use[A-Z]/.test(path.split('/').pop() ?? '')) return 'hooks';
  if (/\/api\/|\/apis\/|\.controller\.|\.handler\.|\.route\./.test(p)) return 'apis';
  if (/\/database\/|\/db\/|\/migrations\/|\/prisma\//.test(p)) return 'tables';
  return null;
}

function detectPrefix(entries: [string, JSZip.JSZipObject][]): string {
  const paths = entries.map(([p]) => p).filter((p) => !p.endsWith('/'));
  if (paths.length === 0) return '';
  const heads = paths.map((p) => p.split('/')[0]);
  if (heads.every((h) => h === heads[0]) && paths.every((p) => p.includes('/'))) {
    return heads[0] + '/';
  }
  return '';
}

function scanLabel(c: LiveCounts): string {
  const parts: string[] = [];
  if (c.pages      > 0) parts.push(`${c.pages} página${c.pages      !== 1 ? 's' : ''}`);
  if (c.components > 0) parts.push(`${c.components} componente${c.components !== 1 ? 's' : ''}`);
  if (c.hooks      > 0) parts.push(`${c.hooks} hook${c.hooks      !== 1 ? 's' : ''}`);
  if (c.apis       > 0) parts.push(`${c.apis} API${c.apis       !== 1 ? 's' : ''}`);

  const summary = parts.slice(0, 2).join(' · ');
  const scanned = `${c.filesScanned}/${c.filesTotal}`;
  return summary
    ? `Identificando arquivos (${scanned}) — ${summary}`
    : `Lendo estrutura do projeto... (${scanned} arquivos)`;
}

/** Yields control back to the event loop — keeps the main thread responsive
 *  when the pipeline runs there instead of inside a Worker. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Runs the ZIP → ProjectMap pipeline to completion. No size cap — a project
 * with 50,000 files takes longer, not less thoroughly analyzed.
 */
export async function runAnalysisPipeline(
  buffer: ArrayBuffer,
  fileName: string,
  { onProgress, isCancelled }: RunPipelineCallbacks,
): Promise<ProjectMap> {
  const counts: LiveCounts = { ...EMPTY_COUNTS };
  const checkCancelled = () => { if (isCancelled()) throw new AnalysisCancelledError(); };

  // ── 1. Open ZIP ──────────────────────────────────────────────────────────
  onProgress(2, 'Preparando análise...', counts);

  let jszip: JSZip;
  try {
    jszip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Arquivo ZIP corrompido ou inválido. Verifique o arquivo e tente novamente.');
  }
  checkCancelled();

  const allEntries  = Object.entries(jszip.files);
  const prefix      = detectPrefix(allEntries);

  // Exclude backup/build folders (node_modules/, dist/, build/, .git/,
  // .migration-backup/, dist-cloudflare/) before any content is read or
  // categorized — they are copies, not real source code.
  const fileEntries = allEntries
    .filter(([, f]) => !f.dir)
    .filter(([rawPath]) => {
      const path = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;
      return path && !isExcludedPath(path);
    });

  if (fileEntries.length === 0) {
    throw new Error('O arquivo ZIP está vazio. Adicione arquivos ao projeto antes de enviar.');
  }

  counts.filesTotal = fileEntries.length;

  onProgress(5, `Lendo estrutura do ZIP… (${fileEntries.length} arquivos encontrados)`, counts);

  // ── 2. Scan files in batches — no limit on file count or ZIP size ─────────
  const scanned: ScannedFile[] = [];
  const BATCH = 30;

  for (let i = 0; i < fileEntries.length; i += BATCH) {
    checkCancelled();

    const batch   = fileEntries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async ([rawPath, zipObj]) => {
      const path = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;
      if (!path) return null;

      const nameParts = path.split('/');
      const name      = nameParts[nameParts.length - 1];
      const dotIdx    = name.lastIndexOf('.');
      const ext       = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : '';
      const isBinary  = BINARY_EXT.has(ext);
      const zipData = (zipObj as { _data?: { uncompressedSize?: number } })._data;
      const size: number = zipData?.uncompressedSize ?? 0;

      let content = '';
      if (!isBinary) {
        try {
          const text = await zipObj.async('string');
          content = text.length > MAX_TEXT
            ? text.slice(0, MAX_TEXT) + '\n/* [truncated] */'
            : text;
        } catch { /* treat as binary if text read fails */ }
      }

      return { path, name, ext, size, content, isBinary } satisfies ScannedFile;
    }));

    for (const r of results) {
      if (!r) continue;
      scanned.push(r);
      counts.filesScanned++;
      const cat = quickCat(r.path, r.isBinary);
      if (cat) counts[cat]++;
    }

    const pct = clamp(5 + Math.round(((i + BATCH) / fileEntries.length) * 55), 5, 60);
    onProgress(pct, scanLabel(counts), { ...counts });
    await tick();
  }

  checkCancelled();

  // ── 3. Categorize + build tree ────────────────────────────────────────────
  onProgress(62, 'Classificando arquivos por tipo...', counts);
  await tick();

  const structureAnalyzer = new StructureAnalyzer();
  const { categorized, tree } = structureAnalyzer.analyze(scanned);

  counts.pages      = categorized.filter((f) => f.category === 'page').length;
  counts.components = categorized.filter((f) => f.category === 'component').length;
  counts.hooks      = categorized.filter((f) => f.category === 'hook').length;
  counts.apis       = categorized.filter((f) => f.category === 'api').length;
  counts.tables     = categorized.filter((f) => f.category === 'database').length;

  checkCancelled();
  onProgress(65, 'Identificando páginas, componentes e hooks…', { ...counts });
  await tick();

  // ── 4. Dependency map ──────────────────────────────────────────────────────
  onProgress(68, 'Construindo mapa de dependências...', { ...counts });
  const depAnalyzer  = new DependencyAnalyzer();
  const dependencies = depAnalyzer.analyze(scanned);
  checkCancelled();
  await tick();

  // ── 5. Technology stack ─────────────────────────────────────────────────────
  onProgress(74, 'Detectando tecnologias e frameworks...', { ...counts });
  const techAnalyzer = new TechnologyAnalyzer();
  const technology   = techAnalyzer.analyze(scanned, dependencies);
  checkCancelled();
  await tick();

  // ── 5.5 Interactions — "o que este botão/tela faz" (EPIC 10) ──────────────
  onProgress(79, 'Analisando cliques e interações...', { ...counts });
  const interactionAnalyzer = new InteractionAnalyzer();
  const interactions = interactionAnalyzer.analyze(categorized);
  checkCancelled();
  await tick();

  // ── 5.6. Description generation (DescriptionAnalyzer) ────────────────────
  // Runs after categorisation + interactions so every subsequent step (mapper,
  // prompts, etc.) can read the plain-Portuguese description from the file.
  onProgress(83, 'Gerando descrições dos arquivos...', { ...counts });
  const descriptionAnalyzer = new DescriptionAnalyzer();
  const descriptions = descriptionAnalyzer.analyze(categorized);
  for (const f of categorized) {
    const d = descriptions.get(f.path);
    if (d) f.description = d;
  }
  checkCancelled();
  await tick();

  // ── 6. Assemble ProjectMap ───────────────────────────────────────────────────
  onProgress(93, 'Gerando mapa do projeto...', { ...counts });

  const byCategory = {} as Partial<Record<FileCategory, number>>;
  const byExtension: Record<string, number> = {};
  let   maxDepth = 0;

  for (const f of categorized) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    byExtension[f.ext]     = (byExtension[f.ext]     ?? 0) + 1;
    if (f.depth > maxDepth) maxDepth = f.depth;
  }

  const rootPkg  = dependencies.packages.find((p) => p.path.split('/').length <= 2);
  const rootName = (rootPkg?.name && rootPkg.name !== '(unnamed)')
    ? rootPkg.name
    : (dependencies.packages[0]?.name ?? fileName.replace(/\.zip$/i, ''));

  const stats = {
    totalFiles:     scanned.length,
    totalDirs:      allEntries.filter(([, f]) => f.dir).length,
    totalSizeBytes: scanned.reduce((s, f) => s + f.size, 0),
    byCategory:     byCategory as Record<FileCategory, number>,
    byExtension,
    maxDepth,
  };

  // ── 6.5. Tool category detection (ToolCategoryAnalyzer) ──────────────────────
  const toolCategoryAnalyzer = new ToolCategoryAnalyzer();
  const toolCategories = toolCategoryAnalyzer.analyze(scanned);

  // ── 6.6. Integration detection (IntegrationAnalyzer) ─────────────────────────
  onProgress(95, 'Detectando integrações externas...', { ...counts });
  const integrationAnalyzer = new IntegrationAnalyzer();
  const integrations = integrationAnalyzer.analyze(scanned, dependencies);
  checkCancelled();
  await tick();

  const projectMap: ProjectMap = {
    id:         Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    rootName,
    analyzedAt: new Date().toISOString(),
    files:      categorized,
    tree,
    dependencies,
    technology,
    interactions,
    integrations,
    toolCategories,
    stats,
  };

  onProgress(99, 'Finalizando...', { ...counts });
  await tick();
  checkCancelled();

  return projectMap;
}
