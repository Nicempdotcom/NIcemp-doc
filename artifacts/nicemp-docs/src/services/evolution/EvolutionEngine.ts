/**
 * EvolutionEngine
 *
 * Decoupled module responsible for:
 *   1. Building a ProjectSnapshot from a ProjectMap after each analysis.
 *   2. Diffing the new snapshot against the previous one to identify
 *      added / removed / modified files.
 *   3. Persisting both artefacts via repositories.
 *
 * This module is intentionally decoupled from the parser pipeline and from
 * any React context — it operates purely on plain data and repositories.
 * Future integrations (CI, webhooks, scheduled re-analysis) can call
 * `EvolutionEngine.run()` without touching the UI layer.
 */

import type { ProjectMap }           from '@/services/engine';
import type {
  ProjectSnapshotEntity,
  ProjectChangeEntity,
  FileSnapshotEntry,
  ProjectChangeEntry,
  ChangeKind,
} from '@/services/storage/types';
import { ProjectSnapshotRepository } from '@/services/storage/repositories/ProjectSnapshotRepository';
import { ProjectChangesRepository }  from '@/services/storage/repositories/ProjectChangesRepository';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** djb2 hash — fast, deterministic, good enough for change detection. */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/** Derive the top-level module name from a file path (same logic as mapper.ts). */
function inferModule(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const skip  = new Set(['src', 'app', 'lib', 'features', 'pages', 'components', 'hooks']);
  for (const part of parts.slice(0, 3)) {
    if (!skip.has(part.toLowerCase())) return part;
  }
  return parts[0] ?? 'root';
}

// ─── Architectural score ──────────────────────────────────────────────────────

/**
 * Compute a 0–100 architectural score from a ProjectMap.
 * The score is a rough proxy for structural quality — not a correctness metric.
 */
function computeArchitecturalScore(projectMap: ProjectMap): number {
  const { byCategory } = projectMap.stats;
  let score = 0;

  // Presence of distinct code layers (max 40 pts)
  if ((byCategory['page']      ?? 0) > 0) score += 10;
  if ((byCategory['component'] ?? 0) > 0) score += 10;
  if ((byCategory['hook']      ?? 0) > 0) score += 10;
  if ((byCategory['api']       ?? 0) > 0) score +=  5;
  if ((byCategory['database']  ?? 0) > 0) score +=  5;

  // Test coverage detected (max 15 pts)
  const testCount = byCategory['test'] ?? 0;
  if (testCount >= 20)      score += 15;
  else if (testCount >= 5)  score += 10;
  else if (testCount >= 1)  score +=  5;

  // Type-safety artefacts: .d.ts, types/, schema files (max 10 pts)
  const hasTypes  = projectMap.files.some((f) => f.ext === '.ts' && f.name.endsWith('.d.ts'));
  const hasSchema = (byCategory['schema'] ?? 0) > 0;
  if (hasTypes)  score += 5;
  if (hasSchema) score += 5;

  // Technology breadth (max 10 pts)
  const techCount = Object.values(projectMap.technology).flat().length;
  score += Math.min(10, Math.floor(techCount / 2));

  // Module separation — distinct top-level modules (max 25 pts)
  const modules = new Set(projectMap.files.map((f) => inferModule(f.path)));
  score += Math.min(25, modules.size * 3);

  return Math.min(100, score);
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

function buildSummary(
  projectMap: ProjectMap,
  projectId:  string,
  fileCount:  number,
  score:      number,
): string {
  const { byCategory } = projectMap.stats;
  const parts: string[] = [
    `${fileCount} arquivo${fileCount !== 1 ? 's' : ''}`,
    `score arquitetural ${score}/100`,
  ];
  if ((byCategory['page']      ?? 0) > 0) parts.push(`${byCategory['page']} páginas`);
  if ((byCategory['component'] ?? 0) > 0) parts.push(`${byCategory['component']} componentes`);
  if ((byCategory['api']       ?? 0) > 0) parts.push(`${byCategory['api']} APIs`);
  return `Projeto ${projectMap.rootName} — ${parts.join(' · ')}`;
}

export function buildSnapshot(
  projectMap: ProjectMap,
  projectId:  string,
  versionId:  string,
): ProjectSnapshotEntity {
  const files: FileSnapshotEntry[] = projectMap.files.map((f) => ({
    path:     f.path,
    size:     f.size,
    category: f.category,
    // hash = djb2 of "path:size:first200chars" — avoids storing source code
    hash: djb2(`${f.path}:${f.size}:${f.content.slice(0, 200)}`),
  }));

  const score     = computeArchitecturalScore(projectMap);
  const totalSize = projectMap.stats.totalSizeBytes;

  return {
    id:                 `evolution-snapshot:${projectId}:${versionId}`,
    projectId,
    versionId,
    createdAt:          new Date().toISOString(),
    fileCount:          files.length,
    totalSize,
    architecturalScore: score,
    summary:            buildSummary(projectMap, projectId, files.length, score),
    files,
  };
}

// ─── Diff engine ──────────────────────────────────────────────────────────────

export function computeDiff(
  prev:        ProjectSnapshotEntity,
  curr:        ProjectSnapshotEntity,
  fromVersion: string,
  toVersion:   string,
): ProjectChangeEntity {
  const prevMap = new Map(prev.files.map((f) => [f.path, f]));
  const currMap = new Map(curr.files.map((f) => [f.path, f]));

  const changes: ProjectChangeEntry[] = [];

  // Added files
  for (const [path, cf] of currMap) {
    if (!prevMap.has(path)) {
      changes.push({
        path,
        kind:      'added' as ChangeKind,
        category:  cf.category,
        module:    inferModule(path),
        sizeDelta: cf.size,
      });
    }
  }

  // Removed files
  for (const [path, pf] of prevMap) {
    if (!currMap.has(path)) {
      changes.push({
        path,
        kind:      'removed' as ChangeKind,
        category:  pf.category,
        module:    inferModule(path),
        sizeDelta: -pf.size,
      });
    }
  }

  // Modified files (same path, different hash)
  for (const [path, pf] of prevMap) {
    const cf = currMap.get(path);
    if (cf && cf.hash !== pf.hash) {
      changes.push({
        path,
        kind:      'modified' as ChangeKind,
        category:  cf.category,
        module:    inferModule(path),
        sizeDelta: cf.size - pf.size,
      });
    }
  }

  const added    = changes.filter((c) => c.kind === 'added').length;
  const removed  = changes.filter((c) => c.kind === 'removed').length;
  const modified = changes.filter((c) => c.kind === 'modified').length;

  const impactedModules = [...new Set(changes.map((c) => c.module))].sort();

  return {
    id:             `evolution-change:${curr.projectId}:${fromVersion}:${toVersion}`,
    projectId:      curr.projectId,
    fromVersionId:  fromVersion,
    toVersionId:    toVersion,
    fromSnapshotId: prev.id,
    toSnapshotId:   curr.id,
    createdAt:      new Date().toISOString(),
    added,
    removed,
    modified,
    impactedModules,
    changes,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Run the full Evolution Engine pipeline for a completed analysis.
 *
 * 1. Build a new snapshot from the projectMap.
 * 2. Find the most recent previous snapshot for this project.
 * 3. If a previous snapshot exists, compute and persist the diff.
 * 4. Persist the new snapshot.
 *
 * Returns the snapshot and, when applicable, the change record.
 */
export function runEvolutionEngine(
  projectMap: ProjectMap,
  projectId:  string,
  versionId:  string,
): { snapshot: ProjectSnapshotEntity; change: ProjectChangeEntity | null } {
  const newSnapshot = buildSnapshot(projectMap, projectId, versionId);

  // Find the most recent previous snapshot for this project
  const previous = ProjectSnapshotRepository.findLatestByProject(projectId);
  let change: ProjectChangeEntity | null = null;

  if (previous && previous.versionId !== versionId) {
    change = computeDiff(previous, newSnapshot, previous.versionId, versionId);
    ProjectChangesRepository.save(change);
  }

  ProjectSnapshotRepository.save(newSnapshot);

  return { snapshot: newSnapshot, change };
}

export const EvolutionEngine = { buildSnapshot, computeDiff, run: runEvolutionEngine } as const;
