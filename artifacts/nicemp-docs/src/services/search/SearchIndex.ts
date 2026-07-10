/**
 * SearchIndex
 *
 * Builds the flat, searchable index behind the global "Pesquisa Global"
 * (Cmd+K) — every project, page, component, hook, API, table, dependency
 * and technology currently in the documentation database, each pointing at
 * the doc page where it's rendered (EPIC 08 Portal Oficial).
 */

import {
  ProjectRepository,
  PageRepository,
  ComponentRepository,
  HookRepository,
  ApiRepository,
  TableRepository,
  DependencyRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';

export type SearchResultKind =
  | 'project' | 'page' | 'component' | 'hook' | 'api' | 'table' | 'dependency';

export interface SearchResultItem {
  id:       string;
  kind:     SearchResultKind;
  title:    string;
  subtitle: string;
  href:     string;
}

const KIND_LABELS: Record<SearchResultKind, string> = {
  project:    'Projeto',
  page:       'Página',
  component:  'Componente',
  hook:       'Hook',
  api:        'API',
  table:      'Tabela',
  dependency: 'Dependência',
};

export { KIND_LABELS };

export const SearchIndex = {
  /** Build the full index for a project. Falls back to the most recent project when omitted. */
  build(projectId?: string): SearchResultItem[] {
    const project = projectId ? ProjectRepository.findById(projectId) : ProjectRepository.findLatest();
    if (!project) return [];
    const pid = project.id;

    const items: SearchResultItem[] = [
      { id: project.id, kind: 'project', title: project.rootName, subtitle: 'Visão geral do projeto', href: `${ROUTES.project}?id=${pid}` },
    ];

    for (const p of PageRepository.findByProject(pid)) {
      items.push({ id: p.id, kind: 'page', title: p.name, subtitle: p.route || p.location, href: `${ROUTES.frontend}?q=${encodeURIComponent(p.name)}` });
    }
    for (const c of ComponentRepository.findByProject(pid)) {
      items.push({ id: c.id, kind: 'component', title: c.name, subtitle: c.module || c.location, href: `${ROUTES.components}?q=${encodeURIComponent(c.name)}` });
    }
    for (const h of HookRepository.findByProject(pid)) {
      items.push({ id: h.id, kind: 'hook', title: h.name, subtitle: h.module || h.location, href: `${ROUTES.hooks}?q=${encodeURIComponent(h.name)}` });
    }
    for (const a of ApiRepository.findByProject(pid)) {
      items.push({ id: a.id, kind: 'api', title: a.name, subtitle: `${a.method} ${a.path}`, href: `${ROUTES.apis}?q=${encodeURIComponent(a.name)}` });
    }
    for (const t of TableRepository.findByProject(pid)) {
      items.push({ id: t.id, kind: 'table', title: t.name, subtitle: t.tableName || t.module, href: `${ROUTES.database}?q=${encodeURIComponent(t.name)}` });
    }
    for (const d of DependencyRepository.findByProject(pid)) {
      items.push({ id: d.id, kind: 'dependency', title: d.name, subtitle: `${d.version} · ${d.depKind}`, href: `${ROUTES.dependencies}?q=${encodeURIComponent(d.name)}` });
    }

    return items;
  },
};
