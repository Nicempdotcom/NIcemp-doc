/**
 * buildNavigationFlow.ts
 *
 * Aba 1 — "Fluxo de Navegação": pages as boxes, connected by arrows labeled
 * with the button/action that triggers the navigation. Built from
 * InteractionEntity records whose apiHint encodes a navigation action
 * (produced by InteractionAnalyzer — now includes <Link to>, <NavLink to>,
 * <a href>, navigate(), and router.push()).
 *
 * Layout uses dagre (TB direction) for a clean hierarchical flow that scales
 * well when many navigation edges are present. Only pages that participate in
 * at least one navigation edge are shown — isolated pages belong to the
 * "Visão Simples" tab where they appear in their module group regardless.
 */

import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { PageEntity, InteractionEntity } from '@/services/storage';
import { matchPageByPath } from '@/services/exploration/urlMatch';
import { moduleColor, type FlowNodeData } from './diagramUtils';

const NAV_PREFIX = 'navega para ';

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W    = 260;
const NODE_H    = 80;
const NODE_SEP  = 40;
const RANK_SEP  = 80;
const MARGIN    = 40;

export interface NavigationFlow {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

export function buildNavigationFlow(
  pages: PageEntity[],
  interactions: InteractionEntity[],
): NavigationFlow {
  const pageByLocation = new Map(pages.map((p) => [p.location, p]));

  // ── Collect raw nav edges ─────────────────────────────────────────────────
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

  // Only include pages that participate in at least one navigation edge
  const flowPages = pages.filter((p) => usedPageIds.has(p.id));

  if (flowPages.length === 0) return { nodes: [], edges: [] };

  // ── Dagre layout ──────────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir:  'TB',
    nodesep:  NODE_SEP,
    ranksep:  RANK_SEP,
    marginx:  MARGIN,
    marginy:  MARGIN,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const p of flowPages) {
    g.setNode(p.id, { width: NODE_W, height: NODE_H });
  }

  // Dedup edges before passing to dagre (avoids duplicate-edge issues)
  const dedup = new Map<string, { source: string; target: string; labels: Set<string> }>();
  for (const e of rawEdges) {
    if (e.source === e.target) continue;               // skip self-loops
    if (!usedPageIds.has(e.source) || !usedPageIds.has(e.target)) continue;
    const key = `${e.source}=>${e.target}`;
    const existing = dedup.get(key);
    if (existing) existing.labels.add(e.label);
    else dedup.set(key, { source: e.source, target: e.target, labels: new Set([e.label]) });
  }

  // Add edges to dagre graph (one per unique pair)
  for (const e of dedup.values()) {
    try { g.setEdge(e.source, e.target); } catch (_) { /* ignore */ }
  }

  dagre.layout(g);

  // ── Build React Flow nodes ────────────────────────────────────────────────
  const nodes: Node<FlowNodeData>[] = flowPages.map((p) => {
    const n = g.node(p.id);
    return {
      id:       p.id,
      type:     'diagram',
      position: {
        x: (n?.x ?? 0) - NODE_W / 2,
        y: (n?.y ?? 0) - NODE_H / 2,
      },
      data: {
        name:        p.name,
        path:        p.location,
        module:      p.module,
        category:    'page' as const,
        description: p.description,
      },
      draggable: true,
      style: {
        // Tint node border with module color for visual grouping
        border: `1.5px solid ${moduleColor(p.module)}44`,
      },
    };
  });

  // ── Build React Flow edges ────────────────────────────────────────────────
  const edges: Edge[] = [...dedup.entries()].map(([key, e]) => ({
    id:     key,
    source: e.source,
    target: e.target,
    label:  [...e.labels].slice(0, 2).join(' · '),
    animated:  false,
    style:     { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
    labelStyle:   { fontSize: 11, fill: 'hsl(var(--foreground))' },
    labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    markerEnd: { type: 'arrowclosed' as const, width: 16, height: 16 },
  }));

  return { nodes, edges };
}
