// ─── Graph Service ────────────────────────────────────────────────────────────
// Builds and queries a dependency graph from parsed nodes.
// Used by the impact feature to traverse relationships between modules,
// components, APIs, and tables.

import type { ParsedNode } from '../parser';

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'imports' | 'uses' | 'extends' | 'references';
}

export interface DependencyGraph {
  nodes: ParsedNode[];
  edges: GraphEdge[];
  builtAt: string;
}

/** Stub — not yet implemented. */
export const graphService = {
  /** Build a dependency graph from a list of parsed nodes. */
  async build(_nodes: ParsedNode[]): Promise<DependencyGraph> {
    // TODO: resolve import paths and construct edges
    return { nodes: [], edges: [], builtAt: new Date().toISOString() };
  },

  /** Return all nodes that depend on a given node ID (direct dependents). */
  getDependents(_graph: DependencyGraph, _nodeId: string): string[] {
    // TODO: traverse edges in reverse direction
    return [];
  },

  /** Return all nodes a given node depends on (transitive dependencies). */
  getDependencies(_graph: DependencyGraph, _nodeId: string): string[] {
    // TODO: BFS/DFS traversal
    return [];
  },

  /** Detect circular dependencies in the graph. */
  findCycles(_graph: DependencyGraph): Array<string[]> {
    // TODO: implement cycle detection
    return [];
  },
};
