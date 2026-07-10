/**
 * DependencyGraph
 *
 * Builds a lightweight graph of every documentation entity in a version
 * snapshot. Since deep code-level relationships (imports, prop-drilling,
 * API calls) are not yet extracted by the analyzer — `usedIn`/`usedBy`
 * fields are still placeholders for a future EPIC — this graph uses the
 * one reliable signal we do have: entities that live in the same `module`
 * (top-level feature folder) are considered related. This matches the
 * product example: a "Dashboard" module change impacts every Header,
 * Sidebar, MetricCards, use-company, API and table also filed under
 * "Dashboard".
 */

import type { VersionSnapshotEntity, EntitySummary } from '@/services/storage/types';

export type NodeCategory = 'page' | 'component' | 'hook' | 'api' | 'table';

export interface GraphNode {
  id:       string;
  name:     string;
  location: string;
  module:   string;
  category: NodeCategory;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Why these two nodes are connected — currently only 'module' co-location. */
  reason: 'module';
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const CATEGORY_KEYS: { key: keyof Pick<VersionSnapshotEntity, 'pages' | 'components' | 'hooks' | 'apis' | 'tables'>; category: NodeCategory }[] = [
  { key: 'pages',      category: 'page' },
  { key: 'components', category: 'component' },
  { key: 'hooks',      category: 'hook' },
  { key: 'apis',       category: 'api' },
  { key: 'tables',     category: 'table' },
];

function toNode(e: EntitySummary, category: NodeCategory): GraphNode {
  return { id: e.id, name: e.name, location: e.location, module: e.module, category };
}

export const DependencyGraph = {
  /** Build the full graph (all nodes + module co-location edges) from a snapshot. */
  build(snapshot: VersionSnapshotEntity): DependencyGraphData {
    const nodes: GraphNode[] = [];
    for (const { key, category } of CATEGORY_KEYS) {
      for (const e of snapshot[key]) nodes.push(toNode(e, category));
    }

    const byModule = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      if (!node.module) continue;
      const list = byModule.get(node.module) ?? [];
      list.push(node);
      byModule.set(node.module, list);
    }

    const edges: GraphEdge[] = [];
    for (const group of byModule.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          edges.push({ source: group[i].id, target: group[j].id, reason: 'module' });
        }
      }
    }

    return { nodes, edges };
  },

  /** All nodes directly connected to `nodeId` (i.e. sharing its module), excluding itself. */
  getNeighbors(graph: DependencyGraphData, nodeId: string): GraphNode[] {
    const neighborIds = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === nodeId) neighborIds.add(edge.target);
      if (edge.target === nodeId) neighborIds.add(edge.source);
    }
    return graph.nodes.filter((n) => neighborIds.has(n.id));
  },

  findNode(graph: DependencyGraphData, nodeId: string): GraphNode | undefined {
    return graph.nodes.find((n) => n.id === nodeId);
  },
};
