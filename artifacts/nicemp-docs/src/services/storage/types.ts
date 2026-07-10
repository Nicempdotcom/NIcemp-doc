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
  | 'history';

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
  | TechnologyEntity;
