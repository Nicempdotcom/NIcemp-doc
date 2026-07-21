/**
 * buildSimpleFlow.ts
 *
 * "Visão Simples" — builds a ReactFlow graph with:
 *   - One `moduleGroup` node per module (labeled colored background rectangle)
 *   - One `diagram` child node per page, laid out with dagre inside the group
 *   - Navigation edges for ALL pages (intra- and cross-module)
 *
 * Unlike buildNavigationFlow, ALL pages are included so the map is complete —
 * pages with no detected nav edges still appear inside their module group.
 *
 * Module groups are arranged in a 2-D grid (MAX_COLS per row) so the canvas
 * doesn't degenerate into one very wide horizontal strip.
 */

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { PageEntity, InteractionEntity } from '@/services/storage';
import { matchPageByPath } from '@/services/exploration/urlMatch';
import { moduleColor, type FlowNodeData } from './diagramUtils';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PAGE_W        = 260;
const PAGE_H        = 80;
const NODE_SEP      = 36;    // horizontal gap between nodes in the same rank
const RANK_SEP      = 54;    // vertical gap between ranks
const GROUP_PAD_X   = 24;    // left/right padding inside module group
const GROUP_PAD_TOP = 52;    // space reserved for the module header label
const GROUP_PAD_BOT = 24;    // bottom padding inside module group
const MODULE_GAP_X  = 48;    // horizontal gap between module groups in same row
const MODULE_GAP_Y  = 56;    // vertical gap between module rows
const MAX_COLS      = 4;     // how many module groups per row before wrapping

const NAV_PREFIX = 'navega para ';

function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').toLowerCase().trim();
}

export interface SimpleFlow {
  nodes: Node[];
  edges: Edge[];
}

export function buildSimpleFlow(
  pages: PageEntity[],
  interactions: InteractionEntity[],
  selectedModule: string,
): SimpleFlow {
  const ALL = '__all__';

  const filteredPages = selectedModule === ALL
    ? pages
    : pages.filter(p => p.module === selectedModule);

  if (filteredPages.length === 0) return { nodes: [], edges: [] };

  // ── Group pages by module (preserve insertion order) ─────────────────────
  const byModule = new Map<string, PageEntity[]>();
  for (const p of filteredPages) {
    const mod = p.module || 'geral';
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(p);
  }

  // ── Precompute nav edges for use in dagre ranking ─────────────────────────
  const pageLocMap = new Map(filteredPages.map(p => [normPath(p.location), p]));

  interface RawEdge { source: string; target: string; label: string }
  const rawEdgeDedup = new Map<string, { source: string; target: string; labels: Set<string> }>();

  for (const ia of interactions) {
    if (!ia.apiHint.startsWith(NAV_PREFIX)) continue;
    const src = pageLocMap.get(normPath(ia.location));
    if (!src) continue;
    const route = ia.apiHint.slice(NAV_PREFIX.length).trim();
    const match = matchPageByPath(route, filteredPages);
    const tgt = match.exact ?? match.suggestions[0]?.page;
    if (!tgt || tgt.id === src.id) continue;
    const label = ia.label || ia.handlerName || 'ação';
    const key = `${src.id}=>${tgt.id}`;
    const ex = rawEdgeDedup.get(key);
    if (ex) ex.labels.add(label);
    else rawEdgeDedup.set(key, { source: src.id, target: tgt.id, labels: new Set([label]) });
  }

  // ── Place module groups in a 2-D grid ─────────────────────────────────────
  const allNodes: Node[] = [];
  let colIdx    = 0;
  let cursorX   = 0;
  let cursorY   = 0;
  let rowHeight = 0;   // tallest group in the current row

  for (const [mod, modPages] of byModule) {
    const color   = moduleColor(mod);
    const groupId = `__group__${mod}`;

    // ── dagre layout for this module's pages ────────────────────────────────
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP });
    g.setDefaultEdgeLabel(() => ({}));

    for (const p of modPages) {
      g.setNode(p.id, { width: PAGE_W, height: PAGE_H });
    }

    // Add intra-module nav edges to guide rank ordering
    const modPageIds = new Set(modPages.map(p => p.id));
    for (const { source, target } of rawEdgeDedup.values()) {
      if (modPageIds.has(source) && modPageIds.has(target) && source !== target) {
        try { g.setEdge(source, target); } catch (_) { /* ignore duplicate/cycle */ }
      }
    }

    dagre.layout(g);

    // Compute bounding box of laid-out nodes
    let maxRight = 0, maxBottom = 0;
    for (const p of modPages) {
      const n = g.node(p.id);
      if (!n) continue;
      maxRight  = Math.max(maxRight,  n.x + PAGE_W / 2);
      maxBottom = Math.max(maxBottom, n.y + PAGE_H / 2);
    }

    const groupW = Math.max(maxRight,  PAGE_W)  + GROUP_PAD_X * 2;
    const groupH = Math.max(maxBottom, PAGE_H)  + GROUP_PAD_TOP + GROUP_PAD_BOT;

    // ── Wrap to next row when MAX_COLS is reached ────────────────────────────
    if (colIdx > 0 && colIdx >= MAX_COLS) {
      cursorX   = 0;
      cursorY  += rowHeight + MODULE_GAP_Y;
      rowHeight = 0;
      colIdx    = 0;
    }

    // ── Module group node (background + label) ───────────────────────────────
    allNodes.push({
      id:        groupId,
      type:      'moduleGroup',
      position:  { x: cursorX, y: cursorY },
      data:      { module: mod, color } as Record<string, unknown>,
      style:     { width: groupW, height: groupH },
      draggable: false,
      selectable: false,
      zIndex:    0,
    });

    // ── Page child nodes ─────────────────────────────────────────────────────
    for (const p of modPages) {
      const n = g.node(p.id);
      if (!n) continue;
      allNodes.push({
        id:       p.id,
        type:     'diagram',
        parentId: groupId,
        extent:   'parent' as const,
        position: {
          x: n.x - PAGE_W / 2 + GROUP_PAD_X,
          y: n.y - PAGE_H / 2 + GROUP_PAD_TOP,
        },
        data: {
          name:        p.name,
          path:        p.location,
          module:      p.module,
          category:    'page' as const,
          description: p.description,
        } satisfies FlowNodeData,
        draggable: false,
        zIndex:    1,
      });
    }

    // Advance cursor for next module
    cursorX  += groupW + MODULE_GAP_X;
    rowHeight = Math.max(rowHeight, groupH);
    colIdx++;
  }

  // ── Navigation edges (intra + cross-module) ──────────────────────────────
  const edges: Edge[] = [...rawEdgeDedup.values()].map(e => ({
    id:     `${e.source}=>${e.target}`,
    source:  e.source,
    target:  e.target,
    label:  [...e.labels].slice(0, 2).join(' · '),
    animated: false,
    style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5 },
    labelStyle:   { fontSize: 11, fill: 'hsl(var(--foreground))' },
    labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    markerEnd: { type: 'arrowclosed' as const, width: 16, height: 16 },
    zIndex: 2,
  }));

  return { nodes: allNodes, edges };
}
