/**
 * dataService.ts
 *
 * Centralized read layer for all static JSON data sources.
 * Each function returns typed arrays and offers utility
 * helpers for filtering, searching and aggregation.
 *
 * Data is imported statically — Vite bundles the JSON at
 * build time. No network requests are made.
 */

import type {
  DocModule,
  DocPage,
  DocComponent,
  DocHook,
  DocApi,
  DocTable,
  DocStatus,
  RiskLevel,
  HttpMethod,
  ProjectStats,
  ModuleStats,
} from '@/types';

import rawModules    from '@/database/modules.json';
import rawPages      from '@/database/pages.json';
import rawComponents from '@/database/components.json';
import rawHooks      from '@/database/hooks.json';
import rawApis       from '@/database/apis.json';
import rawDatabase   from '@/database/database.json';

// ─── Typed raw casts ─────────────────────────────────────────────────────────

const modules    = rawModules    as DocModule[];
const pages      = rawPages      as DocPage[];
const components = rawComponents as DocComponent[];
const hooks      = rawHooks      as DocHook[];
const apis       = rawApis       as DocApi[];
const tables     = rawDatabase   as DocTable[];

// ─── Modules ─────────────────────────────────────────────────────────────────

export const moduleService = {
  /** All modules */
  getAll(): DocModule[] {
    return modules;
  },

  /** Find by ID */
  findById(id: string): DocModule | undefined {
    return modules.find((m) => m.id === id);
  },

  /** Find by slug */
  findBySlug(slug: string): DocModule | undefined {
    return modules.find((m) => m.slug === slug);
  },

  /** Filter by status */
  filterByStatus(status: DocStatus): DocModule[] {
    return modules.filter((m) => m.status === status);
  },

  /** Filter by risk level */
  filterByRisk(level: RiskLevel): DocModule[] {
    return modules.filter((m) => m.riskLevel === level);
  },

  /** Active modules (stable or beta) */
  getActive(): DocModule[] {
    return modules.filter((m) => m.status === 'stable' || m.status === 'beta');
  },

  /** Per-module aggregated stats (for charts) */
  getModuleStats(): ModuleStats[] {
    return modules.map((m) => ({
      slug:           m.slug,
      name:           m.name,
      componentCount: m.componentCount,
      apiCount:       m.apiCount,
      tableCount:     m.tableCount,
      hookCount:      m.hookCount,
    }));
  },
};

// ─── Pages ───────────────────────────────────────────────────────────────────

export const pageService = {
  /** All pages */
  getAll(): DocPage[] {
    return pages;
  },

  /** Find by ID */
  findById(id: string): DocPage | undefined {
    return pages.find((p) => p.id === id);
  },

  /** Filter by section */
  filterBySection(section: string): DocPage[] {
    return pages.filter((p) => p.section === section);
  },

  /** Filter by status */
  filterByStatus(status: DocStatus): DocPage[] {
    return pages.filter((p) => p.status === status);
  },

  /** Full-text search on title and description */
  search(query: string): DocPage[] {
    const q = query.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)),
    );
  },

  /** Pages updated after a given ISO date string */
  updatedAfter(isoDate: string): DocPage[] {
    return pages.filter((p) => p.lastUpdated >= isoDate);
  },
};

// ─── Components ──────────────────────────────────────────────────────────────

export const componentService = {
  /** All components */
  getAll(): DocComponent[] {
    return components;
  },

  /** Find by ID */
  findById(id: string): DocComponent | undefined {
    return components.find((c) => c.id === id);
  },

  /** Filter by module */
  filterByModule(module: string): DocComponent[] {
    return components.filter((c) => c.module === module);
  },

  /** Filter by category */
  filterByCategory(category: string): DocComponent[] {
    return components.filter((c) => c.category === category);
  },

  /** Filter by status */
  filterByStatus(status: DocStatus): DocComponent[] {
    return components.filter((c) => c.status === status);
  },

  /** Full-text search on name and description */
  search(query: string): DocComponent[] {
    const q = query.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  },

  /** Unique categories present in the data */
  getCategories(): string[] {
    return [...new Set(components.map((c) => c.category))];
  },

  /** Count per category */
  countByCategory(): Record<string, number> {
    return components.reduce<Record<string, number>>((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + 1;
      return acc;
    }, {});
  },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const hookService = {
  /** All hooks */
  getAll(): DocHook[] {
    return hooks;
  },

  /** Find by ID */
  findById(id: string): DocHook | undefined {
    return hooks.find((h) => h.id === id);
  },

  /** Find by hook name (e.g. "useAuth") */
  findByName(name: string): DocHook | undefined {
    return hooks.find((h) => h.name === name);
  },

  /** Filter by module */
  filterByModule(module: string): DocHook[] {
    return hooks.filter((h) => h.module === module);
  },

  /** Filter by status */
  filterByStatus(status: DocStatus): DocHook[] {
    return hooks.filter((h) => h.status === status);
  },

  /** Full-text search */
  search(query: string): DocHook[] {
    const q = query.toLowerCase();
    return hooks.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q),
    );
  },
};

// ─── APIs ────────────────────────────────────────────────────────────────────

export const apiService = {
  /** All endpoints */
  getAll(): DocApi[] {
    return apis;
  },

  /** Find by ID */
  findById(id: string): DocApi | undefined {
    return apis.find((a) => a.id === id);
  },

  /** Filter by module */
  filterByModule(module: string): DocApi[] {
    return apis.filter((a) => a.module === module);
  },

  /** Filter by HTTP method */
  filterByMethod(method: HttpMethod): DocApi[] {
    return apis.filter((a) => a.method === method);
  },

  /** Filter by status */
  filterByStatus(status: DocStatus): DocApi[] {
    return apis.filter((a) => a.status === status);
  },

  /** Only endpoints that require authentication */
  getAuthRequired(): DocApi[] {
    return apis.filter((a) => a.auth);
  },

  /** Filter by risk level */
  filterByRisk(level: RiskLevel): DocApi[] {
    return apis.filter((a) => a.riskLevel === level);
  },

  /** Full-text search on path, operationId and description */
  search(query: string): DocApi[] {
    const q = query.toLowerCase();
    return apis.filter(
      (a) =>
        a.path.toLowerCase().includes(q) ||
        a.operationId.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  },

  /** Count endpoints grouped by HTTP method */
  countByMethod(): Record<HttpMethod, number> {
    return apis.reduce<Record<string, number>>((acc, a) => {
      acc[a.method] = (acc[a.method] ?? 0) + 1;
      return acc;
    }, {}) as Record<HttpMethod, number>;
  },
};

// ─── Database ────────────────────────────────────────────────────────────────

export const tableService = {
  /** All tables */
  getAll(): DocTable[] {
    return tables;
  },

  /** Find by ID */
  findById(id: string): DocTable | undefined {
    return tables.find((t) => t.id === id);
  },

  /** Find by table name */
  findByName(name: string): DocTable | undefined {
    return tables.find((t) => t.name === name);
  },

  /** Filter by module */
  filterByModule(module: string): DocTable[] {
    return tables.filter((t) => t.module === module);
  },

  /** Filter by status */
  filterByStatus(status: 'active' | 'deprecated' | 'planned'): DocTable[] {
    return tables.filter((t) => t.status === status);
  },

  /** Full-text search on name and description */
  search(query: string): DocTable[] {
    const q = query.toLowerCase();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  },

  /** Total estimated rows across all tables */
  getTotalRows(): number {
    return tables.reduce((sum, t) => sum + t.estimatedRows, 0);
  },

  /** Tables sorted by estimated row count descending */
  sortBySize(): DocTable[] {
    return [...tables].sort((a, b) => b.estimatedRows - a.estimatedRows);
  },
};

// ─── Aggregated Stats ────────────────────────────────────────────────────────

export const statsService = {
  /**
   * Returns the global project stats object used in the Dashboard.
   * Counts are derived from the actual JSON data arrays.
   */
  getProjectStats(): ProjectStats {
    return {
      pages:      pages.length,
      components: components.length,
      hooks:      hooks.length,
      apis:       apis.length,
      tables:     tables.length,
      modules:    modules.length,
    };
  },

  /**
   * Last updated date across all data sources (ISO string).
   */
  getLastUpdated(): string {
    const allDates = [
      ...pages.map((p) => p.lastUpdated),
      ...components.map((c) => c.lastUpdated),
      ...hooks.map((h) => h.lastUpdated),
      ...apis.map((a) => a.lastUpdated),
      ...tables.map((t) => t.lastUpdated),
      ...modules.map((m) => m.lastUpdated),
    ];
    return allDates.sort().at(-1) ?? '';
  },

  /**
   * Returns entries updated within the last N days, newest first.
   */
  getRecentActivity(days = 7): Array<{
    type: string;
    name: string;
    module: string;
    lastUpdated: string;
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const entries = [
      ...pages.map((p)      => ({ type: 'Página',      name: p.title,         module: p.section,  lastUpdated: p.lastUpdated })),
      ...components.map((c) => ({ type: 'Componente',  name: c.name,          module: c.module,   lastUpdated: c.lastUpdated })),
      ...hooks.map((h)      => ({ type: 'Hook',         name: h.name,          module: h.module,   lastUpdated: h.lastUpdated })),
      ...apis.map((a)       => ({ type: 'API',          name: a.operationId,   module: a.module,   lastUpdated: a.lastUpdated })),
      ...tables.map((t)     => ({ type: 'Tabela',       name: t.name,          module: t.module,   lastUpdated: t.lastUpdated })),
    ];

    return entries
      .filter((e) => e.lastUpdated >= cutoffStr)
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  },
};
