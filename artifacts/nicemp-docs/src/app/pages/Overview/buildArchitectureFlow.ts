/**
 * buildArchitectureFlow.ts
 *
 * Aba 2 — "Arquitetura por trás": a layered left-to-right diagram
 * (Páginas → Componentes → Hooks/APIs → Banco de Dados) built from
 * resolved ImportEdgeEntity records (see services/storage/mapper.ts,
 * toImportEdgeEntities). Every box is a real file that participates in at
 * least one resolved internal import — isolated files are omitted, since
 * they add noise without contributing to "who talks to whom".
 */

import type { Edge, Node } from '@xyflow/react';
import type { ImportEdgeEntity } from '@/services/storage';
import { layoutByCategory, type FlowNodeData, type GraphCategory } from './diagramUtils';

export interface ArchitectureFlow {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

/** Turns a file path into a plain-language box name (last path segment, no extension). */
function displayName(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.(tsx|ts|jsx|js)$/i, '');
}

export function buildArchitectureFlow(importEdges: ImportEdgeEntity[]): ArchitectureFlow {
  const nodeMap = new Map<string, FlowNodeData>();

  for (const edge of importEdges) {
    if (!nodeMap.has(edge.fromPath)) {
      nodeMap.set(edge.fromPath, { name: displayName(edge.fromPath), path: edge.fromPath, module: edge.fromModule, category: edge.fromCategory as GraphCategory });
    }
    if (!nodeMap.has(edge.toPath)) {
      nodeMap.set(edge.toPath, { name: displayName(edge.toPath), path: edge.toPath, module: edge.toModule, category: edge.toCategory as GraphCategory });
    }
  }

  const flowNodes = [...nodeMap.entries()].map(([path, data]) => ({ id: path, data }));
  const positioned = layoutByCategory(flowNodes);

  const nodes: Node<FlowNodeData>[] = positioned.map((p) => ({
    id: p.id,
    type: 'diagram',
    position: { x: p.x, y: p.y },
    data: p.data,
    draggable: true,
  }));

  const edges: Edge[] = importEdges.map((e) => ({
    id: `${e.fromPath}=>${e.toPath}`,
    source: e.fromPath,
    target: e.toPath,
    style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.25, opacity: 0.6 },
    markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14 },
  }));

  return { nodes, edges };
}
