// ─── Documentation Database — Entity Types ───────────────────────────────────
//
// Rule: NEVER store source code. Only extracted knowledge is persisted.
// All entities are serialisable plain objects (JSON-safe).

// ─── Primitives ───────────────────────────────────────────────────────────────

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type DocStatus =
  | 'stable'
  | 'beta'
  | 'wip'
  | 'experimental'
  | 'deprecated'
  | 'planned';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type DepKind = 'prod' | 'dev' | 'peer';

export type TechCategory =
  | 'language'
  | 'framework'
  | 'styling'
  | 'backend'
  | 'database'
  | 'testing'
  | 'build'
  | 'runtime';

// ─── Store keys ───────────────────────────────────────────────────────────────

export type StoreKey =
  | 'projects'
  | 'versions'
  | 'versionSnapshots'
  | 'pages'
  | 'components'
  | 'hooks'
  | 'apis'
  | 'tables'
  | 'dependencies'
  | 'technologies'
  | 'history'
  | 'interactions'
  | 'importEdges'
  | 'toolCategories'
  | 'tableUsages'
  | 'annotations'
  | 'projectSnapshots'
  | 'projectChanges';

/** Maps StoreKey → the logical JSON filename it corresponds to. */
export const STORE_FILE_NAMES: Record<StoreKey, string> = {
  projects:         'projects.json',
  versions:         'versions.json',
  versionSnapshots: 'version-snapshots.json',
  pages:            'pages.json',
  components:       'components.json',
  hooks:            'hooks.json',
  apis:             'apis.json',
  tables:           'database.json',
  dependencies:     'dependencies.json',
  technologies:     'technologies.json',
  history:          'history.json',
  interactions:     'interactions.json',
  importEdges:      'import-edges.json',
  toolCategories:   'tool-categories.json',
  tableUsages:      'table-usages.json',
  annotations:      'annotations.json',
  projectSnapshots: 'project-snapshots.json',
  projectChanges:   'project-changes.json',
};

// ─── Base entity ──────────────────────────────────────────────────────────────

/** Every entity in the documentation database extends this. */
export interface BaseDocEntity {
  /** Stable deterministic ID derived from kind + location. */
  id:            string;
  /** Human-readable name (file name, package name, route, etc.). */
  name:          string;
  /** Auto-generated or user-edited description. Empty until content analysis runs. */
  description:   string;
  /** File path, route, or module reference — never source code. */
  location:      string;
  /** IDs of other entities this one is related to. */
  relationships: string[];
  /** Estimated risk of changing this entity. */
  riskLevel:     RiskLevel;
  /** ISO timestamp of last detected change. */
  lastChanged:   string;
  /** ISO timestamp of first insertion into the database. */
  createdAt:     string;
  /** ID of the project this entity belongs to. */
  projectId:     string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectEntity extends BaseDocEntity {
  kind:           'project';
  rootName:       string;
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  stats: {
    pages:        number;
    components:   number;
    hooks:        number;
    apis:         number;
    tables:       number;
    dependencies: number;
    technologies: number;
    totalFiles:   number;
  };
}

// ─── Version ──────────────────────────────────────────────────────────────────

export interface VersionEntity extends BaseDocEntity {
  kind:        'version';
  semver:      string;
  status:      DocStatus;
  snapshotAt:  string;    // ISO — when this version snapshot was taken
  changelog:   string;    // Empty initially
  /** Counts captured at analysis time — powers the Histórico Inteligente timeline (EPIC 06). */
  stats: {
    totalFiles:  number;
    pages:       number;
    components:  number;
    hooks:       number;
    apis:        number;
    tables:      number;
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface PageEntity extends BaseDocEntity {
  kind:      'page';
  route:     string;      // Inferred URL route
  module:    string;      // Top-level module/feature folder
  status:    DocStatus;
  /** IDs of components detected in this page (populated in future EPIC). */
  components: string[];
  /** IDs of hooks detected in this page (populated in future EPIC). */
  hooks:      string[];
  /** IDs of APIs called from this page (populated in future EPIC). */
  apis:       string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PropDefinition {
  name:         string;
  type:         string;
  required:     boolean;
  defaultValue: string;
  description:  string;
}

export interface ComponentEntity extends BaseDocEntity {
  kind:     'component';
  module:   string;
  category: string;       // ui / layout / feature / docs / etc.
  status:   DocStatus;
  /** Detected prop signatures (populated in future EPIC). */
  props:    PropDefinition[];
  /** Page IDs that use this component. */
  usedIn:   string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ParamDefinition {
  name:        string;
  type:        string;
  required:    boolean;
  description: string;
}

export interface HookEntity extends BaseDocEntity {
  kind:     'hook';
  module:   string;
  status:   DocStatus;
  /** Detected parameter signatures (populated in future EPIC). */
  params:   ParamDefinition[];
  returns:  string;
  /** Entity IDs that use this hook. */
  usedIn:   string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiEntity extends BaseDocEntity {
  kind:           'api';
  method:         HttpMethod;
  path:           string;     // URL path (e.g. /users/:id)
  module:         string;
  status:         DocStatus;
  auth:           boolean;
  roles:          string[];
  /** Request parameter names (populated in future EPIC). */
  paramNames:     string[];
  responseSchema: string;
}

// ─── Database Table ───────────────────────────────────────────────────────────

export type ColumnType =
  | 'uuid' | 'varchar' | 'text' | 'integer' | 'bigint'
  | 'boolean' | 'timestamp' | 'jsonb' | 'decimal' | 'date' | 'unknown';

export interface ColumnDefinition {
  name:        string;
  type:        ColumnType;
  nullable:    boolean;
  primary:     boolean;
  unique:      boolean;
  foreignKey:  string;    // Referenced table.column or ''
  description: string;
}

export interface TableEntity extends BaseDocEntity {
  kind:    'table';
  tableName: string;
  module:  string;
  status:  'active' | 'deprecated' | 'planned';
  /** Detected column names (populated in future EPIC). */
  columns: ColumnDefinition[];
  indexes: string[];
  estimatedRows: number;
}

// ─── Dependency ───────────────────────────────────────────────────────────────

export interface DependencyEntity extends BaseDocEntity {
  kind:        'dependency';
  packageName: string;
  version:     string;
  depKind:     DepKind;
  registry:    string;    // 'npm' | 'jsr' | 'github' | 'local' | ''
  /** File paths that import this package (populated in future EPIC). */
  usedBy:      string[];
}

// ─── Technology ───────────────────────────────────────────────────────────────

export interface TechnologyEntity extends BaseDocEntity {
  kind:       'technology';
  category:   TechCategory;
  version:    string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Interaction (EPIC 10 — "o que este botão/tela faz") ─────────────────────
//
// Heuristically detected from onClick handlers in page/component source.
// `description` (from BaseDocEntity) holds the full plain-Portuguese sentence.

export interface InteractionEntity extends BaseDocEntity {
  kind:        'interaction';
  module:      string;
  handlerName: string;    // '' when the handler couldn't be resolved to a name
  label:       string;    // Clickable element's visible text or aria-label/title
  callsApi:    boolean;
  apiHint:     string;    // e.g. "POST /api/pedidos", "navega para /login", or ''
}

// ─── Import edge (EPIC 11 — "Organograma" / arquitetura por trás) ────────────
//
// A resolved internal `import` relationship between two files, used to draw
// the "Páginas → Componentes → Hooks/APIs → Banco de Dados" layered diagram.
// Only edges whose target resolves to a known file AND a layer-relevant
// category (page/component/hook/api/database) are kept — anything else is
// omitted rather than guessed, matching the InteractionAnalyzer convention.
// Does not extend BaseDocEntity: it is a relation record, not a doc entity.

export interface ImportEdgeEntity {
  id:           string;   // stable id derived from from+to paths
  projectId:    string;
  fromPath:     string;
  fromModule:   string;
  fromCategory: FileCategoryForGraph;
  toPath:       string;
  toModule:     string;
  toCategory:   FileCategoryForGraph;
}

/** The subset of FileCategory values relevant to the layered architecture diagram. */
export type FileCategoryForGraph = 'page' | 'component' | 'hook' | 'api' | 'database';

// ─── History entry ────────────────────────────────────────────────────────────

export type HistoryEventKind =
  | 'project_analyzed'
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'db_cleared'
  | 'version_snapshot';

export interface HistoryEntry {
  id:          string;
  kind:        HistoryEventKind;
  label:       string;
  description: string;
  timestamp:   string;
  projectId:   string;
  entityId:    string;    // The entity this event relates to, or ''
  metadata:    Record<string, unknown>;
  /** The authenticated user who triggered this event, or null/undefined when Supabase auth is not configured/used. */
  uploadedBy?: { id: string; email: string } | null;
}

// ─── Version snapshot (for comparison / diffing) ─────────────────────────────
//
// A lightweight, comparable fingerprint of every entity that existed at the
// time a version was analyzed. Stored alongside VersionEntity so the
// Comparador de Versões (EPIC 05) can diff any two versions of a project
// without needing to re-run analysis.

export interface EntitySummary {
  id:        string;
  name:      string;
  location:  string;
  module:    string;
  /** Deterministic JSON fingerprint of the comparable fields — used to detect "changed". */
  signature: string;
}

export interface VersionSnapshotEntity {
  /** Same as versionId — 1:1 with a VersionEntity. */
  id:         string;
  projectId:  string;
  versionId:  string;
  createdAt:  string;
  pages:      EntitySummary[];
  components: EntitySummary[];
  hooks:      EntitySummary[];
  apis:       EntitySummary[];
  tables:     EntitySummary[];
}

// ─── Tool Category ────────────────────────────────────────────────────────────
//
// Represents a distinct tool/calculator category detected from an allTools
// catalog (e.g. ToolsHome.tsx in the nicemp.com project). Stored per-project
// so CreateToolPromptDialog can show the real category list instead of a
// hardcoded fallback.

export interface ToolCategoryEntity {
  /** Stable id derived from projectId + category name. */
  id:         string;
  projectId:  string;
  kind:       'tool-category';
  name:       string;
  /** Number of tools found in this category during analysis. */
  toolCount:  number;
  createdAt:  string;
}

// ─── Table Usage (cross-reference: which entities reference each Supabase table) ─

export interface TableUsageEntryRecord {
  kind:     'page' | 'component' | 'api';
  entityId: string;
  /** Human-readable file/component name. */
  label:    string;
}

export interface TableUsageEntity {
  /** Stable id: `table-usage:{projectId}:{tableName}` */
  id:        string;
  projectId: string;
  kind:      'table-usage';
  tableName: string;
  usages:    TableUsageEntryRecord[];
  createdAt: string;
}

// ─── Evolution Engine — Snapshot & Change types ───────────────────────────────

/** Lightweight fingerprint of a single file at snapshot time. */
export interface FileSnapshotEntry {
  /** File path inside the ZIP / project root. */
  path:     string;
  /** Uncompressed size in bytes. */
  size:     number;
  /** FileCategory label (e.g. 'page', 'component', 'hook', …). */
  category: string;
  /** djb2 hash of path+size+content-prefix — detects changes without storing code. */
  hash:     string;
}

/**
 * A complete structural fingerprint of a project at the time of one analysis run.
 * Stored in the `projectSnapshots` store.
 */
export interface ProjectSnapshotEntity {
  /** Stable id: `evolution-snapshot:{projectId}:{versionId}` */
  id:                 string;
  projectId:          string;
  versionId:          string;
  /** ISO timestamp of when this snapshot was created. */
  createdAt:          string;
  /** Total number of files in the snapshot. */
  fileCount:          number;
  /** Total uncompressed size of all files in bytes. */
  totalSize:          number;
  /** 0–100 architectural quality score computed at analysis time. */
  architecturalScore: number;
  /** One-sentence human-readable summary of the snapshot. */
  summary:            string;
  /** Per-file fingerprints used by the Diff Engine. */
  files:              FileSnapshotEntry[];
}

/** Whether a file was added, removed, or modified between two snapshots. */
export type ChangeKind = 'added' | 'removed' | 'modified';

/** A single file-level change detected by the Diff Engine. */
export interface ProjectChangeEntry {
  path:       string;
  kind:       ChangeKind;
  category:   string;
  module:     string;
  /** Size difference in bytes (positive = grew, negative = shrank). */
  sizeDelta:  number;
}

/**
 * The result of diffing two consecutive snapshots.
 * Stored in the `projectChanges` store.
 */
export interface ProjectChangeEntity {
  /** Stable id: `evolution-change:{projectId}:{fromVersionId}:{toVersionId}` */
  id:              string;
  projectId:       string;
  fromVersionId:   string;
  toVersionId:     string;
  fromSnapshotId:  string;
  toSnapshotId:    string;
  createdAt:       string;
  /** Count of files added in this diff. */
  added:           number;
  /** Count of files removed in this diff. */
  removed:         number;
  /** Count of files modified in this diff. */
  modified:        number;
  /** Top-level module names that had at least one change. */
  impactedModules: string[];
  /** Full list of per-file changes. */
  changes:         ProjectChangeEntry[];
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type AnyDocEntity =
  | ProjectEntity
  | VersionEntity
  | PageEntity
  | ComponentEntity
  | HookEntity
  | ApiEntity
  | TableEntity
  | DependencyEntity
  | TechnologyEntity
  | InteractionEntity
  | ToolCategoryEntity
  | TableUsageEntity;
