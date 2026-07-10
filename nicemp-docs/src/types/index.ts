// ─── Enums & Primitives ──────────────────────────────────────────────────────

export type DocStatus =
  | 'stable'
  | 'beta'
  | 'wip'
  | 'experimental'
  | 'deprecated'
  | 'planned';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ColumnType =
  | 'uuid'
  | 'varchar'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'boolean'
  | 'timestamp'
  | 'jsonb'
  | 'decimal'
  | 'date';

export type ParamLocation = 'query' | 'body' | 'path' | 'header';

export type TableStatus = 'active' | 'deprecated' | 'planned';

// ─── Module ──────────────────────────────────────────────────────────────────

export interface DocModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: DocStatus;
  version: string;
  dependencies: string[];
  componentCount: number;
  apiCount: number;
  tableCount: number;
  hookCount: number;
  author: string;
  riskLevel: RiskLevel;
  lastUpdated: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export interface DocPage {
  id: string;
  title: string;
  route: string;
  section: string;
  status: DocStatus;
  description: string;
  author: string;
  lastUpdated: string;
  tags: string[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface DocComponent {
  id: string;
  name: string;
  category: string;
  module: string;
  status: DocStatus;
  description: string;
  props: ComponentProp[];
  usedIn: string[];
  filePath: string;
  lastUpdated: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface HookParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface DocHook {
  id: string;
  name: string;
  description: string;
  params: HookParam[];
  returns: string;
  status: DocStatus;
  module: string;
  usedIn: string[];
  filePath: string;
  lastUpdated: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  in: ParamLocation;
  description: string;
}

export interface DocApi {
  id: string;
  method: HttpMethod;
  path: string;
  operationId: string;
  description: string;
  module: string;
  status: DocStatus;
  auth: boolean;
  roles: string[];
  params: ApiParam[];
  responseSchema: string;
  riskLevel: RiskLevel;
  lastUpdated: string;
}

// ─── Database ────────────────────────────────────────────────────────────────

export interface TableColumn {
  name: string;
  type: ColumnType;
  nullable: boolean;
  primary?: boolean;
  unique?: boolean;
  foreignKey?: string;
  description: string;
}

export interface DocTable {
  id: string;
  name: string;
  description: string;
  module: string;
  status: TableStatus;
  columns: TableColumn[];
  indexes: string[];
  estimatedRows: number;
  lastUpdated: string;
}

// ─── Aggregated Stats ────────────────────────────────────────────────────────

export interface ProjectStats {
  pages: number;
  components: number;
  hooks: number;
  apis: number;
  tables: number;
  modules: number;
}

export interface ModuleStats {
  slug: string;
  name: string;
  componentCount: number;
  apiCount: number;
  tableCount: number;
  hookCount: number;
}
