/**
 * mapper.ts
 *
 * Converts a ProjectMap (raw engine output) into typed documentation entities
 * ready to be persisted by the repositories.
 *
 * Rule: Source code content is NEVER stored — only structural metadata.
 */

import type { ProjectMap, CategorizedFile, DependencyMap, TechnologyProfile, InteractionEntry } from '@/services/engine';
import type {
  ProjectEntity,
  VersionEntity,
  PageEntity,
  ComponentEntity,
  HookEntity,
  ApiEntity,
  TableEntity,
  DependencyEntity,
  TechnologyEntity,
  InteractionEntity,
  ImportEdgeEntity,
  FileCategoryForGraph,
  HistoryEntry,
  RiskLevel,
  DocStatus,
  TechCategory,
  EntitySummary,
  VersionSnapshotEntity,
} from './types';

// ─── ID generation ────────────────────────────────────────────────────────────

/** Produces a stable, deterministic ID from kind + location. */
function stableId(kind: string, location: string): string {
  const slug = (kind + ':' + location)
    .toLowerCase()
    .replace(/[^a-z0-9:./\-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
  return slug;
}

function makeHistoryId(): string {
  return 'hist:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 6);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

/** Infer a URL-like route from a file path. */
function inferRoute(path: string): string {
  return '/' + path
    .replace(/^src\//, '')
    .replace(/\/index\.(tsx?|jsx?)$/, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/^pages\//, '')
    .replace(/^app\/pages\//, '')
    .replace(/^screens\//, '')
    .replace(/^views\//, '');
}

/** Derive the top-level module name from a file path. */
function inferModule(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // Skip common wrapper dirs
  const skip = new Set(['src', 'app', 'lib', 'features', 'pages', 'components', 'hooks']);
  for (const part of parts.slice(0, 3)) {
    if (!skip.has(part.toLowerCase())) return part;
  }
  return parts[0] ?? 'root';
}

/** Infer a risk level from a file category. */
function inferRisk(category: CategorizedFile['category']): RiskLevel {
  const riskMap: Partial<Record<CategorizedFile['category'], RiskLevel>> = {
    api:      'medium',
    database: 'high',
    schema:   'medium',
    route:    'low',
    provider: 'low',
    context:  'low',
    config:   'medium',
  };
  return riskMap[category] ?? 'low';
}

/** Guess component category from file path. */
function guessComponentCategory(path: string): string {
  const lower = path.toLowerCase();
  if (lower.includes('/ui/'))      return 'ui';
  if (lower.includes('/layout'))   return 'layout';
  if (lower.includes('/docs/'))    return 'docs';
  if (lower.includes('/common/'))  return 'common';
  if (lower.includes('/shared/'))  return 'shared';
  if (lower.includes('/feature'))  return 'feature';
  if (lower.includes('/form'))     return 'form';
  return 'general';
}

const STABLE_STATUS: DocStatus = 'stable';

// ─── Entity mappers ───────────────────────────────────────────────────────────

function toProjectEntity(map: ProjectMap): ProjectEntity {
  const ts = now();
  return {
    id:            stableId('project', map.rootName),
    kind:          'project',
    name:          map.rootName,
    description:   '',
    location:      '.',
    relationships: [],
    riskLevel:     'none',
    lastChanged:   ts,
    createdAt:     ts,
    projectId:     stableId('project', map.rootName),
    rootName:      map.rootName,
    packageManager: map.dependencies.packageManager,
    stats: {
      pages:        map.stats.byCategory['page']       ?? 0,
      components:   map.stats.byCategory['component']  ?? 0,
      hooks:        map.stats.byCategory['hook']        ?? 0,
      apis:         map.stats.byCategory['api']         ?? 0,
      tables:       map.stats.byCategory['database']    ?? 0,
      dependencies: map.dependencies.dependencies.length + map.dependencies.devDependencies.length,
      technologies: Object.values(map.technology).flat().length,
      totalFiles:   map.stats.totalFiles,
    },
  };
}

function toVersionEntity(map: ProjectMap, projectId: string): VersionEntity {
  const ts = now();
  // Try to find version from root package.json
  const rootPkg = map.dependencies.packages.find((p) => {
    const depth = p.path.split('/').length;
    return depth <= 2;
  });
  const semver = rootPkg?.version ?? '0.0.0';

  return {
    id:            stableId('version', projectId + ':' + semver + ':' + ts),
    kind:          'version',
    name:          `v${semver}`,
    description:   '',
    location:      '.',
    relationships: [projectId],
    riskLevel:     'none',
    lastChanged:   ts,
    createdAt:     ts,
    projectId,
    semver,
    status:        'stable',
    snapshotAt:    ts,
    changelog:     '',
    stats: {
      totalFiles: map.stats.totalFiles,
      pages:      map.stats.byCategory['page']      ?? 0,
      components: map.stats.byCategory['component'] ?? 0,
      hooks:      map.stats.byCategory['hook']       ?? 0,
      apis:       map.stats.byCategory['api']        ?? 0,
      tables:     map.stats.byCategory['database']   ?? 0,
    },
  };
}

function toPageEntities(files: CategorizedFile[], projectId: string): PageEntity[] {
  const ts = now();
  return files
    .filter((f) => f.category === 'page')
    .map((f) => ({
      id:            stableId('page', f.path),
      kind:          'page' as const,
      name:          f.name.replace(/\.(tsx?|jsx?)$/, ''),
      description:   '',
      location:      f.path,
      relationships: [],
      riskLevel:     'low' as RiskLevel,
      lastChanged:   ts,
      createdAt:     ts,
      projectId,
      route:         inferRoute(f.path),
      module:        inferModule(f.path),
      status:        STABLE_STATUS,
      components:    [],
      hooks:         [],
      apis:          [],
    }));
}

function toComponentEntities(files: CategorizedFile[], projectId: string): ComponentEntity[] {
  const ts = now();
  return files
    .filter((f) => f.category === 'component')
    .map((f) => ({
      id:            stableId('component', f.path),
      kind:          'component' as const,
      name:          f.name.replace(/\.(tsx?|jsx?)$/, ''),
      description:   '',
      location:      f.path,
      relationships: [],
      riskLevel:     'low' as RiskLevel,
      lastChanged:   ts,
      createdAt:     ts,
      projectId,
      module:        inferModule(f.path),
      category:      guessComponentCategory(f.path),
      status:        STABLE_STATUS,
      props:         [],
      usedIn:        [],
    }));
}

function toHookEntities(files: CategorizedFile[], projectId: string): HookEntity[] {
  const ts = now();
  return files
    .filter((f) => f.category === 'hook')
    .map((f) => ({
      id:            stableId('hook', f.path),
      kind:          'hook' as const,
      name:          f.name.replace(/\.(tsx?|jsx?)$/, ''),
      description:   '',
      location:      f.path,
      relationships: [],
      riskLevel:     'low' as RiskLevel,
      lastChanged:   ts,
      createdAt:     ts,
      projectId,
      module:        inferModule(f.path),
      status:        STABLE_STATUS,
      params:        [],
      returns:       'unknown',
      usedIn:        [],
    }));
}

function toApiEntities(files: CategorizedFile[], projectId: string): ApiEntity[] {
  const ts = now();
  return files
    .filter((f) => f.category === 'api')
    .map((f) => ({
      id:             stableId('api', f.path),
      kind:           'api' as const,
      name:           f.name.replace(/\.(tsx?|jsx?|ts?)$/, ''),
      description:    '',
      location:       f.path,
      relationships:  [],
      riskLevel:      'medium' as RiskLevel,
      lastChanged:    ts,
      createdAt:      ts,
      projectId,
      method:         'GET' as const,       // will be refined in future EPIC
      path:           inferRoute(f.path),
      module:         inferModule(f.path),
      status:         STABLE_STATUS,
      auth:           false,
      roles:          [],
      paramNames:     [],
      responseSchema: '',
    }));
}

function toTableEntities(files: CategorizedFile[], projectId: string): TableEntity[] {
  const ts = now();
  return files
    .filter((f) => f.category === 'database')
    .map((f) => ({
      id:            stableId('table', f.path),
      kind:          'table' as const,
      name:          f.name.replace(/\.(tsx?|jsx?|ts?)$/, ''),
      description:   '',
      location:      f.path,
      relationships: [],
      riskLevel:     'high' as RiskLevel,
      lastChanged:   ts,
      createdAt:     ts,
      projectId,
      tableName:     f.name.replace(/\.(tsx?|jsx?|ts?)$/, '').toLowerCase(),
      module:        inferModule(f.path),
      status:        'active' as const,
      columns:       [],
      indexes:       [],
      estimatedRows: 0,
    }));
}

function toInteractionEntities(interactions: InteractionEntry[], projectId: string): InteractionEntity[] {
  const ts = now();
  return interactions.map((entry) => ({
    id:            stableId('interaction', entry.id),
    kind:          'interaction' as const,
    name:          entry.label || entry.handlerName || 'Interação',
    description:   entry.description,
    location:      entry.filePath,
    relationships: [],
    riskLevel:     entry.callsApi ? ('medium' as RiskLevel) : ('low' as RiskLevel),
    lastChanged:   ts,
    createdAt:     ts,
    projectId,
    module:        entry.module,
    handlerName:   entry.handlerName,
    label:         entry.label,
    callsApi:      entry.callsApi,
    apiHint:       entry.apiHint,
  }));
}

// ─── Import edges (EPIC 11 — "Organograma" layered architecture diagram) ─────
//
// Resolves each internal `import`'s specifier to an actual project file so
// we know which layer (page/component/hook/api/database) it points at.
// Heuristic, best-effort — aliases other than `@/` and `~/` (tsconfig custom
// paths, monorepo package references, etc.) are not resolvable without
// reading tsconfig.json, so those edges are simply omitted.

const GRAPH_CATEGORIES = new Set<FileCategoryForGraph>(['page', 'component', 'hook', 'api', 'database']);

function normalizePath(path: string): string {
  const parts = path.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') { stack.pop(); continue; }
    stack.push(part);
  }
  return stack.join('/');
}

function dirnameOf(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

/** Resolve an import specifier from `fromPath` to a candidate file path, trying common extensions/index files. */
function resolveImportSpecifier(fromPath: string, specifier: string, fileSet: Set<string>): string | null {
  let base: string;
  if (specifier.startsWith('.')) {
    base = normalizePath(dirnameOf(fromPath) + '/' + specifier);
  } else if (specifier.startsWith('@/')) {
    base = normalizePath('src/' + specifier.slice(2));
  } else if (specifier.startsWith('~/')) {
    base = normalizePath(specifier.slice(2));
  } else {
    // Bare specifier that still slipped through as "internal" (e.g. subpath
    // import via package.json #imports) — nothing to resolve it against.
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`,
  ];
  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }
  return null;
}

function toImportEdgeEntities(files: CategorizedFile[], imports: ImportEntry[], projectId: string): ImportEdgeEntity[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const fileSet = new Set(files.map((f) => f.path));
  const seen = new Set<string>();
  const edges: ImportEdgeEntity[] = [];

  for (const entry of imports) {
    if (entry.kind !== 'internal') continue;
    const fromFile = byPath.get(entry.from);
    if (!fromFile) continue;

    const resolved = resolveImportSpecifier(entry.from, entry.module, fileSet);
    if (!resolved) continue;
    const toFile = byPath.get(resolved);
    if (!toFile) continue;
    if (!GRAPH_CATEGORIES.has(fromFile.category as FileCategoryForGraph)) continue;
    if (!GRAPH_CATEGORIES.has(toFile.category as FileCategoryForGraph)) continue;

    const dedupeKey = `${entry.from}=>${resolved}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    edges.push({
      id:           stableId('importedge', dedupeKey),
      projectId,
      fromPath:     fromFile.path,
      fromModule:   inferModule(fromFile.path),
      fromCategory: fromFile.category as FileCategoryForGraph,
      toPath:       toFile.path,
      toModule:     inferModule(toFile.path),
      toCategory:   toFile.category as FileCategoryForGraph,
    });
  }
  return edges;
}

function toDependencyEntities(deps: DependencyMap, projectId: string): DependencyEntity[] {
  const ts = now();
  const seen = new Set<string>();
  const result: DependencyEntity[] = [];

  const all = [
    ...deps.dependencies,
    ...deps.devDependencies,
    ...deps.peerDependencies,
  ];

  for (const d of all) {
    if (seen.has(d.name)) continue;
    seen.add(d.name);

    result.push({
      id:            stableId('dep', d.name),
      kind:          'dependency',
      name:          d.name,
      description:   '',
      location:      'package.json',
      relationships: [],
      riskLevel:     'low',
      lastChanged:   ts,
      createdAt:     ts,
      projectId,
      packageName:   d.name,
      version:       d.version,
      depKind:       d.kind,
      registry:      'npm',
      usedBy:        [],
    });
  }
  return result;
}

const TECH_CATEGORY_MAP: Record<string, TechCategory> = {
  languages:  'language',
  frameworks: 'framework',
  styling:    'styling',
  backend:    'backend',
  database:   'database',
  testing:    'testing',
  buildTools: 'build',
  runtime:    'runtime',
};

function toTechnologyEntities(tech: TechnologyProfile, projectId: string): TechnologyEntity[] {
  const ts      = now();
  const result: TechnologyEntity[] = [];
  const seen    = new Set<string>();

  for (const [group, items] of Object.entries(tech)) {
    const category = TECH_CATEGORY_MAP[group];
    if (!category) continue;

    for (const item of items as { name: string; version?: string; confidence: string }[]) {
      if (seen.has(item.name)) continue;
      seen.add(item.name);

      result.push({
        id:            stableId('tech', item.name),
        kind:          'technology',
        name:          item.name,
        description:   '',
        location:      '',
        relationships: [],
        riskLevel:     'none',
        lastChanged:   ts,
        createdAt:     ts,
        projectId,
        category,
        version:       item.version ?? '',
        confidence:    item.confidence as 'high' | 'medium' | 'low',
      });
    }
  }
  return result;
}

// ─── Version snapshot builder (for EPIC 05 — version comparison) ──────────────

/** Deterministic fingerprint of an entity's comparable fields (excludes id/timestamps). */
function signatureOf(fields: Record<string, unknown>): string {
  const sorted = Object.keys(fields).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = fields[k];
    return acc;
  }, {});
  return JSON.stringify(sorted);
}

function toSummary(e: { id: string; name: string; location: string }, module: string, extra: Record<string, unknown>): EntitySummary {
  return {
    id:        e.id,
    name:      e.name,
    location:  e.location,
    module,
    signature: signatureOf({ name: e.name, location: e.location, module, ...extra }),
  };
}

/** Build a lightweight, comparable snapshot of a version's entities for diffing. */
export function buildVersionSnapshot(
  projectId: string,
  versionId: string,
  entities: Pick<MappedEntities, 'pages' | 'components' | 'hooks' | 'apis' | 'tables'>,
): VersionSnapshotEntity {
  return {
    id:        versionId,
    projectId,
    versionId,
    createdAt: now(),
    pages:      entities.pages.map((p) => toSummary(p, p.module, { route: p.route, status: p.status })),
    components: entities.components.map((c) => toSummary(c, c.module, { category: c.category, status: c.status, props: c.props })),
    hooks:      entities.hooks.map((h) => toSummary(h, h.module, { status: h.status, params: h.params, returns: h.returns })),
    apis:       entities.apis.map((a) => toSummary(a, a.module, { method: a.method, path: a.path, status: a.status, auth: a.auth })),
    tables:     entities.tables.map((t) => toSummary(t, t.module, { tableName: t.tableName, status: t.status, columns: t.columns })),
  };
}

// ─── History entry builder ─────────────────────────────────────────────────────

export function buildAnalysisHistoryEntry(
  projectId: string,
  projectName: string,
  counts: Record<string, number>,
): HistoryEntry {
  return {
    id:          makeHistoryId(),
    kind:        'project_analyzed',
    label:       `Projeto "${projectName}" analisado`,
    description: Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(' · '),
    timestamp:   now(),
    projectId,
    entityId:    projectId,
    metadata:    counts,
  };
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

export interface MappedEntities {
  project:      ProjectEntity;
  version:      VersionEntity;
  pages:        PageEntity[];
  components:   ComponentEntity[];
  hooks:        HookEntity[];
  apis:         ApiEntity[];
  tables:       TableEntity[];
  dependencies: DependencyEntity[];
  technologies: TechnologyEntity[];
  interactions: InteractionEntity[];
  importEdges:  ImportEdgeEntity[];
  historyEntry: HistoryEntry;
}

/** Convert a full ProjectMap into all documentation entities. */
export function mapProjectMapToEntities(projectMap: ProjectMap): MappedEntities {
  const project      = toProjectEntity(projectMap);
  const projectId    = project.id;
  const version      = toVersionEntity(projectMap, projectId);
  const pages        = toPageEntities(projectMap.files, projectId);
  const components   = toComponentEntities(projectMap.files, projectId);
  const hooks        = toHookEntities(projectMap.files, projectId);
  const apis         = toApiEntities(projectMap.files, projectId);
  const tables       = toTableEntities(projectMap.files, projectId);
  const dependencies = toDependencyEntities(projectMap.dependencies, projectId);
  const technologies = toTechnologyEntities(projectMap.technology, projectId);
  const interactions = toInteractionEntities(projectMap.interactions, projectId);
  const importEdges  = toImportEdgeEntities(projectMap.files, projectMap.dependencies.imports, projectId);

  const historyEntry = buildAnalysisHistoryEntry(projectId, project.rootName, {
    páginas:       pages.length,
    componentes:   components.length,
    hooks:         hooks.length,
    apis:          apis.length,
    tabelas:       tables.length,
    dependências:  dependencies.length,
    tecnologias:   technologies.length,
    interações:    interactions.length,
  });

  return {
    project, version, pages, components,
    hooks, apis, tables, dependencies, technologies, interactions, importEdges,
    historyEntry,
  };
}
