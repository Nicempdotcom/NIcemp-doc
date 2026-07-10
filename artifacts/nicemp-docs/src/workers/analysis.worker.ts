/// <reference lib="webworker" />
/**
 * Analysis Worker
 *
 * Runs the full analysis pipeline off the main thread so the UI stays
 * responsive regardless of project size. No artificial size limits.
 *
 * Pipeline:
 *   ArrayBuffer → JSZip → scan files (batches) → categorize →
 *   dependency map → technology profile → ProjectMap → postMessage
 *
 * Source code is NEVER stored — only structural metadata is returned.
 */

import JSZip from 'jszip';
import { StructureAnalyzer }  from '@/services/engine/StructureAnalyzer';
import { DependencyAnalyzer } from '@/services/engine/DependencyAnalyzer';
import { TechnologyAnalyzer } from '@/services/engine/TechnologyAnalyzer';
import type { ScannedFile }   from '@/services/engine/types';
import type { LiveCounts, WorkerInMsg, WorkerOutMsg } from './types';
import { EMPTY_COUNTS }       from './types';

// ─── Cancellation flag (set by 'cancel' message) ─────────────────────────────

let cancelled = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function post(msg: WorkerOutMsg): void {
  (self as unknown as Worker).postMessage(msg);
}

function progress(pct: number, label: string, counts: LiveCounts): void {
  post({ type: 'progress', pct, label, counts: { ...counts } });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ─── Binary extension detection ───────────────────────────────────────────────

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

// ─── Quick pre-categorization for live count updates during scan ─────────────
// Less precise than StructureAnalyzer; refined after full categorization.

function quickCat(path: string, ext: string, isBinary: boolean): keyof Pick<LiveCounts, 'pages' | 'components' | 'hooks' | 'apis' | 'tables'> | null {
  if (isBinary) return null;
  const p   = path.toLowerCase();
  const name = p.split('/').pop() ?? '';

  if (/\/pages\/|\/screens\/|\/views\//.test(p)) return 'pages';
  if (/page\.(tsx?|jsx?)$/.test(name) || name === 'page.tsx') return 'pages';
  if (/\/components\/|\/ui\//.test(p) || (/^[a-z]/.test(name) === false && ['.tsx', '.jsx'].includes(ext))) return 'components';
  if (/\/hooks\//.test(p) || /^use[A-Z]/.test(path.split('/').pop() ?? '')) return 'hooks';
  if (/\/api\/|\/apis\/|\.controller\.|\.handler\.|\.route\./.test(p)) return 'apis';
  if (/\/database\/|\/db\/|\/migrations\/|\/prisma\//.test(p)) return 'tables';
  return null;
}

// ─── Root prefix stripping ────────────────────────────────────────────────────

function detectPrefix(entries: [string, JSZip.JSZipObject][]): string {
  const paths = entries.map(([p]) => p).filter((p) => !p.endsWith('/'));
  if (paths.length === 0) return '';
  const heads = paths.map((p) => p.split('/')[0]);
  if (heads.every((h) => h === heads[0]) && paths.every((p) => p.includes('/'))) {
    return heads[0] + '/';
  }
  return '';
}

// ─── Live label builder ───────────────────────────────────────────────────────

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

// ─── Main pipeline ────────────────────────────────────────────────────────────

async function runPipeline(buffer: ArrayBuffer, fileName: string): Promise<void> {
  const counts: LiveCounts = { ...EMPTY_COUNTS };

  // ── 1. Open ZIP ────────────────────────────────────────────────────────────
  progress(2, 'Preparando análise...', counts);

  let jszip: JSZip;
  try {
    jszip = await JSZip.loadAsync(buffer);
  } catch {
    post({ type: 'error', message: 'Arquivo ZIP corrompido ou inválido. Verifique o arquivo e tente novamente.' });
    return;
  }
  if (cancelled) { post({ type: 'cancelled' }); return; }

  const allEntries  = Object.entries(jszip.files);
  const fileEntries = allEntries.filter(([, f]) => !f.dir);

  if (fileEntries.length === 0) {
    post({ type: 'error', message: 'O arquivo ZIP está vazio. Adicione arquivos ao projeto antes de enviar.' });
    return;
  }

  counts.filesTotal = fileEntries.length;
  const prefix      = detectPrefix(allEntries);

  progress(5, `Lendo estrutura do ZIP… (${fileEntries.length} arquivos encontrados)`, counts);

  // ── 2. Scan files in batches ──────────────────────────────────────────────
  const scanned: ScannedFile[] = [];
  const BATCH = 30;

  for (let i = 0; i < fileEntries.length; i += BATCH) {
    if (cancelled) { post({ type: 'cancelled' }); return; }

    const batch   = fileEntries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async ([rawPath, zipObj]) => {
      const path = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;
      if (!path) return null;

      const nameParts = path.split('/');
      const name      = nameParts[nameParts.length - 1];
      const dotIdx    = name.lastIndexOf('.');
      const ext       = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : '';
      const isBinary  = BINARY_EXT.has(ext);
      const size: number = (zipObj as any)._data?.uncompressedSize ?? 0;

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
      const cat = quickCat(r.path, r.ext, r.isBinary);
      if (cat) counts[cat]++;
    }

    const pct = clamp(5 + Math.round(((i + BATCH) / fileEntries.length) * 55), 5, 60);
    progress(pct, scanLabel(counts), { ...counts });
  }

  if (cancelled) { post({ type: 'cancelled' }); return; }

  // ── 3. Categorize + build tree ────────────────────────────────────────────
  progress(62, 'Classificando arquivos por tipo...', counts);

  const structureAnalyzer = new StructureAnalyzer();
  const { categorized, tree } = structureAnalyzer.analyze(scanned);

  // Update to accurate values now that full categorization is done
  counts.pages      = categorized.filter((f) => f.category === 'page').length;
  counts.components = categorized.filter((f) => f.category === 'component').length;
  counts.hooks      = categorized.filter((f) => f.category === 'hook').length;
  counts.apis       = categorized.filter((f) => f.category === 'api').length;
  counts.tables     = categorized.filter((f) => f.category === 'database').length;

  if (cancelled) { post({ type: 'cancelled' }); return; }

  progress(70, `Identificando páginas, componentes e hooks…`, { ...counts });

  // ── 4. Dependency map ─────────────────────────────────────────────────────
  progress(76, 'Construindo mapa de dependências...', { ...counts });

  const depAnalyzer  = new DependencyAnalyzer();
  const dependencies = depAnalyzer.analyze(scanned);

  if (cancelled) { post({ type: 'cancelled' }); return; }

  // ── 5. Technology stack ───────────────────────────────────────────────────
  progress(86, 'Detectando tecnologias e frameworks...', { ...counts });

  const techAnalyzer = new TechnologyAnalyzer();
  const technology   = techAnalyzer.analyze(scanned, dependencies);

  if (cancelled) { post({ type: 'cancelled' }); return; }

  // ── 6. Assemble ProjectMap ────────────────────────────────────────────────
  progress(93, 'Gerando mapa do projeto...', { ...counts });

  const byCategory: Record<string, number> = {};
  const byExtension: Record<string, number> = {};
  let   maxDepth = 0;

  for (const f of categorized) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    byExtension[f.ext]     = (byExtension[f.ext]     ?? 0) + 1;
    if (f.depth > maxDepth) maxDepth = f.depth;
  }

  // Detect root project name
  const rootPkg  = dependencies.packages.find((p) => p.path.split('/').length <= 2);
  const rootName = (rootPkg?.name && rootPkg.name !== '(unnamed)')
    ? rootPkg.name
    : (dependencies.packages[0]?.name ?? fileName.replace(/\.zip$/i, ''));

  const stats = {
    totalFiles:     scanned.length,
    totalDirs:      allEntries.filter(([, f]) => f.dir).length,
    totalSizeBytes: scanned.reduce((s, f) => s + f.size, 0),
    byCategory:     byCategory as any,
    byExtension,
    maxDepth,
  };

  const projectMap = {
    id:          Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    rootName,
    analyzedAt:  new Date().toISOString(),
    files:       categorized,
    tree,
    dependencies,
    technology,
    stats,
  };

  progress(99, 'Finalizando...', { ...counts });
  await new Promise((r) => setTimeout(r, 200));

  if (cancelled) { post({ type: 'cancelled' }); return; }

  // Source code is NOT included in postMessage — only the ProjectMap metadata
  post({ type: 'completed', projectMap });
}

// ─── Message handler ─────────────────────────────────────────────────────────

(self as unknown as Worker).addEventListener('message', async (e: MessageEvent<WorkerInMsg>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type === 'start') {
    cancelled = false;
    try {
      await runPipeline(msg.buffer, msg.fileName);
    } catch (err) {
      if (cancelled) {
        post({ type: 'cancelled' });
      } else {
        const message = err instanceof Error ? err.message : 'Erro desconhecido durante a análise.';
        post({ type: 'error', message });
      }
    }
  }
});
