/**
 * ProjectAnalyzer
 *
 * Orchestrates the full analysis pipeline:
 *
 *   buffer → ProjectScanner → ScannedFile[]
 *          → StructureAnalyzer → CategorizedFile[] + DirectoryNode
 *          → DependencyAnalyzer → DependencyMap
 *          → TechnologyAnalyzer → TechnologyProfile
 *          → ProjectMap
 *
 * The ArrayBuffer is consumed by ProjectScanner and the JSZip instance
 * is released at the end of scan(). The caller is responsible for
 * nulling their reference to the buffer after calling analyze().
 */

import type { ProjectMap, ProjectStats, FileCategory } from './types';
import { ProjectScanner }          from './ProjectScanner';
import { StructureAnalyzer }       from './StructureAnalyzer';
import { DependencyAnalyzer }      from './DependencyAnalyzer';
import { TechnologyAnalyzer }      from './TechnologyAnalyzer';
import { InteractionAnalyzer }     from './InteractionAnalyzer';
import { ToolCategoryAnalyzer }    from './ToolCategoryAnalyzer';
import { IntegrationAnalyzer }     from './IntegrationAnalyzer';
import { LiveTableUsageAnalyzer }  from './LiveTableUsageAnalyzer';
import { TableUsageRepository }    from '@/services/storage/repositories/TableUsageRepository';
import type { TableUsageEntity }   from '@/services/storage/types';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function buildStats(map: Omit<ProjectMap, 'stats' | 'id' | 'analyzedAt'>): ProjectStats {
  const byCategory = {} as Record<FileCategory, number>;
  const byExtension: Record<string, number> = {};

  for (const file of map.files) {
    byCategory[file.category] = (byCategory[file.category] ?? 0) + 1;
    byExtension[file.ext]     = (byExtension[file.ext]     ?? 0) + 1;
  }

  let maxDepth = 0;
  function walk(node: typeof map.tree): void {
    if (node.depth > maxDepth) maxDepth = node.depth;
    node.children.forEach(walk);
  }
  walk(map.tree);

  return {
    totalFiles:     map.files.length,
    totalDirs:      map.tree.totalFiles - map.files.length, // approximation
    totalSizeBytes: map.files.reduce((s, f) => s + f.size, 0),
    byCategory,
    byExtension,
    maxDepth,
  };
}

function detectRootName(map: Pick<ProjectMap, 'dependencies' | 'files'>): string {
  // 1. Primary package.json name
  const root = map.dependencies.packages.find((p) => {
    const depth = p.path.split('/').length;
    return depth === 1 || (depth === 2 && p.path.endsWith('package.json'));
  });
  if (root?.name && root.name !== '(unnamed)') return root.name;

  // 2. Any package.json name
  if (map.dependencies.packages.length > 0) {
    const name = map.dependencies.packages[0].name;
    if (name !== '(unnamed)') return name;
  }

  // 3. Root folder name (first path segment)
  const firstFile = map.files[0];
  if (firstFile) {
    const parts = firstFile.path.split('/');
    if (parts.length > 1) return parts[0];
  }

  return 'projeto';
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/** Stable project ID — mirrors the formula in mapper.ts. Must stay in sync. */
function stableProjectId(rootName: string): string {
  return ('project:' + rootName)
    .toLowerCase()
    .replace(/[^a-z0-9:./\-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export class ProjectAnalyzer {
  private scanner       = new ProjectScanner();
  private structure     = new StructureAnalyzer();
  private dependency    = new DependencyAnalyzer();
  private technology    = new TechnologyAnalyzer();
  private interaction   = new InteractionAnalyzer();
  private toolCategory  = new ToolCategoryAnalyzer();
  private integration   = new IntegrationAnalyzer();
  private tableUsage    = new LiveTableUsageAnalyzer();

  /**
   * Run the full pipeline.
   * @param buffer  The ZIP ArrayBuffer — consumed and released internally.
   * @param onProgress  Callback receiving 0–100 progress values.
   */
  async analyze(
    buffer: ArrayBuffer,
    onProgress: (pct: number) => void,
  ): Promise<ProjectMap> {

    // ── Phase 1: Scan (0–60%) ─────────────────────────────────────────────
    const files = await this.scanner.scan(buffer, onProgress);
    onProgress(60);

    // ── Phase 2: Categorize + structure (60–75%) ──────────────────────────
    const { categorized, tree } = this.structure.analyze(files);
    onProgress(75);

    // ── Phase 3: Dependencies (75–85%) ────────────────────────────────────
    const dependencies = this.dependency.analyze(files);
    onProgress(85);

    // ── Phase 4: Technology (85–95%) ─────────────────────────────────────
    const technology = this.technology.analyze(files, dependencies);
    onProgress(95);

    // ── Phase 4.5: Interactions ("o que este botão/tela faz") ─────────────
    const interactions = this.interaction.analyze(categorized);

    // ── Phase 4.6: Tool categories (ToolCategoryAnalyzer) ─────────────────
    const toolCategories = this.toolCategory.analyze(files);

    // ── Phase 4.7: Integration detection (IntegrationAnalyzer) ────────────
    const integrations = this.integration.analyze(files, dependencies);

    // ── Phase 4.8: Table usages (LiveTableUsageAnalyzer) ──────────────────
    const tableUsageRaw = this.tableUsage.analyze(categorized);

    // ── Phase 5: Assemble (95–100%) ──────────────────────────────────────
    const partial = { files: categorized, tree, dependencies, technology, interactions, integrations, toolCategories };
    const rootName = detectRootName(partial);
    const stats    = buildStats({ ...partial, rootName });

    const projectMap: ProjectMap = {
      id:          makeId(),
      rootName,
      analyzedAt:  new Date().toISOString(),
      files:       categorized,
      tree,
      dependencies,
      technology,
      interactions,
      integrations,
      toolCategories,
      stats,
    };

    // ── Persist table usages (main-thread only — not in web worker) ───────
    if (tableUsageRaw.length > 0) {
      const projectId  = stableProjectId(rootName);
      const ts         = new Date().toISOString();
      const entities: TableUsageEntity[] = tableUsageRaw.map((raw) => ({
        id:        `table-usage:${projectId}:${raw.tableName}`,
        projectId,
        kind:      'table-usage' as const,
        tableName: raw.tableName,
        usages:    raw.usages,
        createdAt: ts,
      }));
      try {
        TableUsageRepository.saveForProject(projectId, entities);
      } catch {
        // localStorage may not be available in worker context — silently skip
      }
    }

    onProgress(100);
    return projectMap;
  }
}
