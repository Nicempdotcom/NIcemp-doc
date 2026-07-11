/**
 * ProjectScanner
 *
 * Receives a raw ZIP ArrayBuffer, extracts all entries into memory,
 * reads text content for non-binary files, then releases the JSZip
 * instance so the ZIP buffer can be garbage-collected.
 *
 * The buffer is NEVER stored — it is consumed once and discarded.
 */

import JSZip from 'jszip';
import type { ScannedFile } from './types';
import { isExcludedPath } from './pathExclusions';

// ─── Binary detection ─────────────────────────────────────────────────────────

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp4', '.mp3', '.wav', '.ogg', '.avi', '.mov', '.mkv', '.webm',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pyc', '.class', '.o', '.a',
  '.db', '.sqlite', '.sqlite3',
]);

function isBinaryExt(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext.toLowerCase());
}

// Max bytes to read per text file (prevents OOM on huge generated files)
const MAX_TEXT_BYTES = 200_000;

// ─── Root-prefix stripping ────────────────────────────────────────────────────

/**
 * Many ZIPs wrap everything in a top-level folder (e.g. `my-project/src/...`).
 * Detect that prefix and strip it so paths start at the project root.
 */
function detectAndStripRoot(entries: [string, JSZip.JSZipObject][]): string {
  const paths = entries.map(([p]) => p).filter((p) => !p.endsWith('/'));
  if (paths.length === 0) return '';

  const firstParts = paths.map((p) => p.split('/')[0]);
  const allSame = firstParts.every((p) => p === firstParts[0]);

  if (allSame && paths.every((p) => p.includes('/'))) {
    return firstParts[0] + '/';
  }
  return '';
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

export class ProjectScanner {
  /**
   * Scan the ZIP buffer and return typed ScannedFile[].
   * After this method returns, the JSZip instance and all intermediate
   * buffers are released; the caller should null out their ArrayBuffer ref.
   */
  async scan(
    buffer: ArrayBuffer,
    onProgress: (pct: number) => void,
  ): Promise<ScannedFile[]> {
    onProgress(2);

    // 1. Load ZIP (consumes buffer; we don't keep a reference)
    const jszip = await JSZip.loadAsync(buffer);
    onProgress(10);

    const allEntries = Object.entries(jszip.files);
    const prefix     = detectAndStripRoot(allEntries);

    // 2. Filter to non-directory entries, excluding backup/build folders
    // (node_modules/, dist/, build/, .git/, .migration-backup/, dist-cloudflare/)
    // before any content is read or categorized.
    const fileEntries = allEntries
      .filter(([, f]) => !f.dir)
      .filter(([rawPath]) => {
        const path = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;
        return path && !isExcludedPath(path);
      });
    const total       = fileEntries.length;
    onProgress(12);

    // 3. Read content in parallel batches
    const BATCH = 20;
    const results: ScannedFile[] = [];

    for (let i = 0; i < fileEntries.length; i += BATCH) {
      const batch = fileEntries.slice(i, i + BATCH);

      const batchResults = await Promise.all(
        batch.map(async ([rawPath, zipObj]) => {
          const path = rawPath.startsWith(prefix)
            ? rawPath.slice(prefix.length)
            : rawPath;

          if (!path) return null; // was the root folder itself

          const nameParts = path.split('/');
          const name      = nameParts[nameParts.length - 1];
          const dotIdx    = name.lastIndexOf('.');
          const ext       = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : '';
          const binary    = isBinaryExt(ext);
          const rawSize: number = (zipObj as any)._data?.uncompressedSize ?? 0;

          let content = '';
          if (!binary) {
            try {
              const text = await zipObj.async('string');
              content    = text.length > MAX_TEXT_BYTES
                ? text.slice(0, MAX_TEXT_BYTES) + '\n/* [truncated] */'
                : text;
            } catch {
              // If reading as string fails, treat as binary
            }
          }

          return { path, name, ext, size: rawSize, content, isBinary: binary } satisfies ScannedFile;
        }),
      );

      for (const r of batchResults) {
        if (r) results.push(r);
      }

      // Progress: 12 → 60 during scan phase
      const scanPct = 12 + Math.round(((i + BATCH) / total) * 48);
      onProgress(Math.min(60, scanPct));
    }

    return results;
  }
}
