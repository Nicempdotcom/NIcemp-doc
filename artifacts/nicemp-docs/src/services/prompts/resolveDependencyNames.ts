// Resolves entity IDs (as stored in `relationships` / `usedIn`) into
// human-readable "Kind: Name" labels for display inside generated prompts.

import {
  PageRepository, ComponentRepository, HookRepository, ApiRepository,
} from '@/services/storage';

const KIND_LABEL: Record<'page' | 'component' | 'hook' | 'api', string> = {
  page: 'Página', component: 'Componente', hook: 'Hook', api: 'API',
};

/** Builds an id → "Kind: Name" lookup map for every cross-referenceable entity in a project. */
export function buildEntityNameIndex(projectId: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const p of PageRepository.findByProject(projectId)) index.set(p.id, `${KIND_LABEL.page}: ${p.name}`);
  for (const c of ComponentRepository.findByProject(projectId)) index.set(c.id, `${KIND_LABEL.component}: ${c.name}`);
  for (const h of HookRepository.findByProject(projectId)) index.set(h.id, `${KIND_LABEL.hook}: ${h.name}`);
  for (const a of ApiRepository.findByProject(projectId)) index.set(a.id, `${KIND_LABEL.api}: ${a.name}`);
  return index;
}

/** Resolves a list of entity IDs into display labels, falling back to the raw ID if unknown. */
export function resolveNames(ids: string[], index: Map<string, string>): string[] {
  return ids.map((id) => index.get(id) ?? id);
}
