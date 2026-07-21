/**
 * buildSimpleFlow.ts — "Visão Simples" hierarchical tree organogram.
 *
 * Produces a 3-level tree laid out by dagre (rankdir: TB):
 *
 *   [Root]  ← project / app name
 *     └─ [Section]  ← one per module
 *          └─ [Page]  ← pages belonging to that module
 *
 * Edges use ReactFlow's `smoothstep` type for orthogonal/elbow routing.
 * The module filter collapses the tree to root → one section → its pages.
 */

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { PageEntity } from '@/services/storage';
import { moduleColor, type FlowNodeData } from './diagramUtils';
import type { RootNodeData }    from './RootNode';
import type { SectionNodeData } from './SectionNode';

// ─── Node dimensions ─────────────────────────────────────────────────────────
const ROOT_W    = 280;
const ROOT_H    = 56;
const SECTION_W = 220;
const SECTION_H = 56;
const PAGE_W    = 260;
const PAGE_H    = 80;

// ─── Dagre graph settings ────────────────────────────────────────────────────
const NODESEP  = 40;   // horizontal gap between sibling nodes
const RANKSEP  = 80;   // vertical gap between tree levels
const MARGINX  = 60;
const MARGINY  = 60;

const ALL = '__all__';

export interface SimpleFlow {
  nodes: Node[];
  edges: Edge[];
}

export function buildSimpleFlow(
  pages: PageEntity[],
  _interactions: unknown,   // unused — tree is structural, not nav-edge-based
  selectedModule: string,
  projectName = 'App',
): SimpleFlow {
  // Filter pages for the selected module
  const filtered = selectedModule === ALL
    ? pages
    : pages.filter((p) => p.module === selectedModule);

  if (filtered.length === 0) return { nodes: [], edges: [] };

  // Group pages by module, preserving alphabetical section order
  const byModule = new Map<string, PageEntity[]>();
  for (const p of [...filtered].sort((a, b) => a.module.localeCompare(b.module))) {
    const mod = p.module || 'geral';
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(p);
  }

  // ── Build dagre graph ─────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: NODESEP, ranksep: RANKSEP, marginx: MARGINX, marginy: MARGINY });
  g.setDefaultEdgeLabel(() => ({}));

  const ROOT_ID = '__root__';
  g.setNode(ROOT_ID, { width: ROOT_W, height: ROOT_H });

  for (const [mod, modPages] of byModule) {
    const sectionId = `__section__${mod}`;
    g.setNode(sectionId, { width: SECTION_W, height: SECTION_H });
    g.setEdge(ROOT_ID, sectionId);

    for (const page of modPages) {
      g.setNode(page.id, { width: PAGE_W, height: PAGE_H });
      g.setEdge(sectionId, page.id);
    }
  }

  dagre.layout(g);

  // ── Build ReactFlow nodes ─────────────────────────────────────────────────
  const rfNodes: Node[] = [];

  // Root node
  const rootPos = g.node(ROOT_ID);
  rfNodes.push({
    id:       ROOT_ID,
    type:     'root',
    position: { x: rootPos.x - ROOT_W / 2, y: rootPos.y - ROOT_H / 2 },
    data:     { name: projectName } satisfies RootNodeData,
    draggable: false,
    selectable: false,
  });

  // Section + page nodes
  for (const [mod, modPages] of byModule) {
    const sectionId = `__section__${mod}`;
    const color     = moduleColor(mod);
    const sPos      = g.node(sectionId);

    rfNodes.push({
      id:       sectionId,
      type:     'section',
      position: { x: sPos.x - SECTION_W / 2, y: sPos.y - SECTION_H / 2 },
      data:     { name: mod, color, count: modPages.length } satisfies SectionNodeData,
      draggable: false,
      selectable: false,
    });

    for (const page of modPages) {
      const pPos = g.node(page.id);
      rfNodes.push({
        id:       page.id,
        type:     'diagram',
        position: { x: pPos.x - PAGE_W / 2, y: pPos.y - PAGE_H / 2 },
        data:     {
          name:        page.name,
          path:        page.location,
          module:      page.module,
          category:    'page' as const,
          description: page.description,
        } satisfies FlowNodeData,
        draggable: false,
      });
    }
  }

  // ── Build ReactFlow edges ─────────────────────────────────────────────────
  const rfEdges: Edge[] = [];

  const treeEdgeStyle = {
    stroke: 'hsl(var(--muted-foreground) / 0.5)',
    strokeWidth: 1.5,
  };

  // Root → sections
  for (const mod of byModule.keys()) {
    const sectionId = `__section__${mod}`;
    rfEdges.push({
      id:     `root→${sectionId}`,
      source:  ROOT_ID,
      target:  sectionId,
      type:   'smoothstep',
      style:   treeEdgeStyle,
      markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14, color: 'hsl(var(--muted-foreground) / 0.5)' },
    });
  }

  // Sections → pages
  for (const [mod, modPages] of byModule) {
    const sectionId = `__section__${mod}`;
    const color = moduleColor(mod);
    for (const page of modPages) {
      rfEdges.push({
        id:     `${sectionId}→${page.id}`,
        source:  sectionId,
        target:  page.id,
        type:   'smoothstep',
        style:   { stroke: color + '88', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed' as const, width: 13, height: 13, color: color + '88' },
      });
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}
