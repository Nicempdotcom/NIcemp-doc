/**
 * buildNavigationFlow.ts
 *
 * Aba 1 — "Fluxo de Navegação": pages as boxes, connected by arrows labeled
 * with the button/action that triggers the navigation. Built from
 * InteractionEntity records whose apiHint encodes a `navigate(...)` /
 * `router.push(...)` call (produced by InteractionAnalyzer). Interactions
 * without a detectable navigation target are not drawn here — they belong
 * to Aba 2 (architecture) instead.
 */

import type { Edge, Node } from '@xyflow/react';
import type { PageEntity, InteractionEntity } from '@/services/storage';
import { matchPageByPath } from '@/services/exploration/urlMatch';
import { layoutByLevel, type FlowNodeData } from './diagramUtils';

const NAV_PREFIX = 'navega para ';

export interface NavigationFlow {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

export function buildNavigationFlow(pages: PageEntity[], interactions: InteractionEntity[]): NavigationFlow {
  const pageByLocation = new Map(pages.map((p) => [p.location, p]));

  const rawEdges: { source: string; target: string; label: string }[] = [];
  const usedPageIds = new Set<string>();

  for (const interaction of interactions) {
    if (!interaction.apiHint.startsWith(NAV_PREFIX)) continue;

    const sourcePage = pageByLocation.get(interaction.location);
    if (!sourcePage) continue;

    const targetRoute = interaction.apiHint.slice(NAV_PREFIX.length).trim();
    if (!targetRoute) continue;

    const match = matchPageByPath(targetRoute, pages);
    const targetPage = match.exact ?? match.suggestions[0]?.page;
    if (!targetPage) continue;

    const label = interaction.label || interaction.handlerName || 'ação';
    rawEdges.push({ source: sourcePage.id, target: targetPage.id, label });
    usedPageIds.add(sourcePage.id);
    usedPageIds.add(targetPage.id);
  }

  // Only show pages that actually participate in a navigation flow — an
  // isolated page with no detected navigation edges adds noise, not signal.
  const flowNodes = pages
    .filter((p) => usedPageIds.has(p.id))
    .map((p) => ({ id: p.id, data: { name: p.name, path: p.location, module: p.module, category: 'page' as const } }));

  const positioned = layoutByLevel(flowNodes, rawEdges);

  const nodes: Node<FlowNodeData>[] = positioned.map((p) => ({
    id: p.id,
    type: 'diagram',
    position: { x: p.x, y: p.y },
    data: p.data,
    draggable: true,
  }));

  const dedup = new Map<string, { source: string; target: string; labels: Set<string> }>();
  for (const e of rawEdges) {
    const key = `${e.source}=>${e.target}`;
    const existing = dedup.get(key);
    if (existing) existing.labels.add(e.label);
    else dedup.set(key, { source: e.source, target: e.target, labels: new Set([e.label]) });
  }

  const edges: Edge[] = [...dedup.entries()].map(([key, e]) => ({
    id: key,
    source: e.source,
    target: e.target,
    label: [...e.labels].slice(0, 2).join(' · '),
    animated: false,
    style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
    labelStyle: { fontSize: 11, fill: 'hsl(var(--foreground))' },
    labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    markerEnd: { type: 'arrowclosed' as const, width: 16, height: 16 },
  }));

  return { nodes, edges };
}
