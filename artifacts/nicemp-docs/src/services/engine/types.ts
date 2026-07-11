// ─── Engine — Shared Types ────────────────────────────────────────────────────

// ── File categorization ───────────────────────────────────────────────────────

export type FileCategory =
  | 'page'
  | 'component'
  | 'hook'
  | 'context'
  | 'layout'
  | 'provider'
  | 'route'
  | 'api'
  | 'database'
  | 'schema'
  | 'script'
  | 'config'
  | 'asset'
  | 'style'
  | 'test'
  | 'other';

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  page:        'Pages',
  component:   'Components',
  hook:        'Hooks',
  context:     'Contexts',
  layout:      'Layouts',
  provider:    'Providers',
  route:       'Routes',
  api:         'API',
  database:    'Banco de Dados',
  schema:      'Schemas',
  script:      'Scripts',
  config:      'Configuração',
  asset:       'Assets',
  style:       'Estilos',
  test:        'Testes',
  other:       'Outros',
};

// ── Scanned file (raw content from ZIP) ──────────────────────────────────────

export interface ScannedFile {
  path: string;         // Full path inside the ZIP
  name: string;         // Filename only
  ext: string;          // Extension including dot (e.g. '.ts')
  size: number;         // Uncompressed size in bytes
  content: string;      // UTF-8 text content; '' for binary files
  isBinary: boolean;
}

// ── Categorized file (after StructureAnalyzer) ───────────────────────────────

export interface CategorizedFile extends ScannedFile {
  category: FileCategory;
  depth: number;          // Directory depth (0 = root-level)
}

// ── Directory tree ────────────────────────────────────────────────────────────

export interface DirectoryNode {
  name: string;
  path: string;
  depth: number;
  children: DirectoryNode[];
  files: CategorizedFile[];
  totalFiles: number;   // Recursive count
}

// ── Dependencies ─────────────────────────────────────────────────────────────

export interface PackageInfo {
  name: string;
  version: string;
  path: string;         // Path to the package.json inside the ZIP
}

export interface DependencyEntry {
  name: string;
  version: string;
  kind: 'prod' | 'dev' | 'peer';
}

export interface ImportEntry {
  from: string;         // Source file path
  module: string;       // The imported module/path
  kind: 'internal' | 'external' | 'builtin';
}

export interface DependencyMap {
  packages: PackageInfo[];
  dependencies: DependencyEntry[];
  devDependencies: DependencyEntry[];
  peerDependencies: DependencyEntry[];
  imports: ImportEntry[];
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
}

// ── Technology profile ────────────────────────────────────────────────────────

export interface DetectedTechnology {
  name: string;
  version?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface TechnologyProfile {
  languages:   DetectedTechnology[];
  frameworks:  DetectedTechnology[];
  styling:     DetectedTechnology[];
  backend:     DetectedTechnology[];
  database:    DetectedTechnology[];
  testing:     DetectedTechnology[];
  buildTools:  DetectedTechnology[];
  runtime:     DetectedTechnology[];
}

// ── Project stats ─────────────────────────────────────────────────────────────

export interface ProjectStats {
  totalFiles:  number;
  totalDirs:   number;
  totalSizeBytes: number;
  byCategory:  Record<FileCategory, number>;
  byExtension: Record<string, number>;
  maxDepth:    number;
}

// ── Interactions (EPIC 10 — "what happens when I click X") ──────────────────
//
// Heuristic, regex-based extraction — no AST parser. When nothing can be
// inferred with confidence, InteractionAnalyzer omits the interaction rather
// than inventing a description.

export interface InteractionEntry {
  id: string;             // `${filePath}:${matchIndex}` — stable within one analysis
  filePath: string;       // Source file path (page or component)
  module: string;         // Top-level module/feature folder
  handlerName: string;    // Detected handler function name, or '' if inline/unresolved
  label: string;          // Clickable element's visible text or aria-label/title
  callsApi: boolean;      // Whether a backend/API call was detected
  apiHint: string;        // e.g. "POST /api/pedidos", "navega para /login", or ''
  description: string;    // Plain-Portuguese sentence, e.g. "Botão 'Salvar' → executa handleSave → envia dados para POST /api/pedidos"
}

// ── Final project map ─────────────────────────────────────────────────────────

export interface ProjectMap {
  id: string;
  rootName: string;           // Detected project name (from package.json or folder)
  analyzedAt: string;         // ISO timestamp
  files: CategorizedFile[];
  tree: DirectoryNode;
  dependencies: DependencyMap;
  technology: TechnologyProfile;
  interactions: InteractionEntry[];
  stats: ProjectStats;
}
