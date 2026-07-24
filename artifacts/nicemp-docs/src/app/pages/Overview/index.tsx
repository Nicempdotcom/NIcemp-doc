import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox, TermHint } from '@/app/components/docs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  ProjectRepository,
  PageRepository,
  ComponentRepository,
  HookRepository,
  ApiRepository,
  InteractionRepository,
  ImportEdgeRepository,
} from '@/services/storage';
import {
  ModuleSummaryContext,
  type ModuleSummaryState,
} from './moduleSummaryContext';

import DiagramNode from './DiagramNode';
import ModuleGroupNode from './ModuleGroupNode';
import RootNode from './RootNode';
import SectionNode from './SectionNode';
import { buildSimpleFlow } from './buildSimpleFlow';
import { buildNavigationFlow } from './buildNavigationFlow';
import { buildArchitectureFlow } from './buildArchitectureFlow';
import { ViewModeContext, type ViewMode } from './diagramUtils';

const nodeTypes: NodeTypes = {
  diagram:     DiagramNode,
  moduleGroup: ModuleGroupNode,
  root:        RootNode    as NodeTypes[string],
  section:     SectionNode as NodeTypes[string],
};

const ALL_MODULES = '__all__';

/**
 * Organograma (EPIC 11) — visual diagram of the app.
 *
 * Two view modes:
 *  - "Visão Simples" (default): ReactFlow canvas, pages grouped by module via
 *    dagre layout inside colored group nodes, navigation edges connecting pages.
 *  - "Visão Técnica": two-tab ReactFlow graph (Fluxo de Navegação + Arquitetura).
 */
export default function Overview() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);

  const pages        = useMemo(() => (project ? PageRepository.findByProject(project.id)        : []), [project]);
  const components   = useMemo(() => (project ? ComponentRepository.findByProject(project.id)   : []), [project]);
  const hooks        = useMemo(() => (project ? HookRepository.findByProject(project.id)        : []), [project]);
  const apis         = useMemo(() => (project ? ApiRepository.findByProject(project.id)         : []), [project]);
  const interactions = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);
  const importEdges  = useMemo(() => (project ? ImportEdgeRepository.findByProject(project.id)  : []), [project]);

  // ── AI module summaries ────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<Record<string, ModuleSummaryState>>({});
  // Tracks in-flight requests so double-clicks don't fire twice
  const inflight = useRef<Set<string>>(new Set());

  const requestSummary = useCallback(async (moduleName: string) => {
    if (inflight.current.has(moduleName)) return;
    inflight.current.add(moduleName);
    setSummaries((prev) => ({ ...prev, [moduleName]: { status: 'loading' } }));

    try {
      // Build compact entity list for this module (name + description only)
      const entities = [
        ...pages.filter((e) => e.module === moduleName).map((e) => ({ name: e.name, description: e.description })),
        ...components.filter((e) => e.module === moduleName).map((e) => ({ name: e.name, description: e.description })),
        ...hooks.filter((e) => e.module === moduleName).map((e) => ({ name: e.name, description: e.description })),
        ...apis.filter((e) => e.module === moduleName).map((e) => ({ name: e.name, description: e.description })),
      ];

      const res  = await fetch('/api/ai/module-summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ moduleName, entities }),
      });
      const data = await res.json() as { summary?: string | null; fallback?: boolean };

      if (data.fallback || !data.summary) {
        setSummaries((prev) => ({ ...prev, [moduleName]: { status: 'error' } }));
      } else {
        setSummaries((prev) => ({ ...prev, [moduleName]: { status: 'done', text: data.summary! } }));
      }
    } catch {
      setSummaries((prev) => ({ ...prev, [moduleName]: { status: 'error' } }));
    } finally {
      inflight.current.delete(moduleName);
    }
  }, [pages, components, hooks, apis]);

  const navigationFlow   = useMemo(() => buildNavigationFlow(pages, interactions),  [pages, interactions]);
  const architectureFlow = useMemo(() => buildArchitectureFlow(importEdges),         [importEdges]);

  // Modules: union across all data sources so the filter covers all views.
  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages)                 set.add(p.module);
    for (const n of navigationFlow.nodes)  set.add(n.data.module as string);
    for (const n of architectureFlow.nodes) set.add(n.data.module as string);
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [pages, navigationFlow.nodes, architectureFlow.nodes]);

  const [selectedModule, setSelectedModule] = useState<string>(ALL_MODULES);
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  // Simple view flow — hierarchical tree: root → sections → pages
  const simpleFlow = useMemo(
    () => buildSimpleFlow(pages, interactions, selectedModule, project?.name ?? 'App'),
    [pages, interactions, selectedModule, project],
  );

  const filteredNavigation   = useMemo(() => filterFlow(navigationFlow,   selectedModule), [navigationFlow,   selectedModule]);
  const filteredArchitecture = useMemo(() => filterFlow(architectureFlow, selectedModule), [architectureFlow, selectedModule]);

  if (!project) {
    return (
      <div>
        <PageHeader
          title="Organograma"
          description="Diagrama visual da navegação e da arquitetura do projeto."
          badge="Novo"
          badgeVariant="info"
        />
        <InfoBox variant="info" title="Nenhum projeto analisado ainda">
          Envie um projeto na página de Upload para gerar o organograma.
        </InfoBox>
      </div>
    );
  }

  return (
    <ViewModeContext.Provider value={viewMode}>
      <div>
        <PageHeader
          title="Organograma"
          description="Diagrama visual do projeto: como as telas se conectam e o que fala com o quê por trás delas."
          badge="Novo"
          badgeVariant="info"
        />

        {/* Controls row */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'simple'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Visão simples
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'technical'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Visão técnica
            </button>
          </div>

          {/* Module filter */}
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MODULES}>Todos os módulos</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Visão Simples — ReactFlow canvas with module groups ── */}
        {viewMode === 'simple' && (
          simpleFlow.nodes.length === 0 ? (
            <InfoBox variant="info" title="Nenhuma página detectada">
              Nenhuma página foi encontrada para este filtro.
            </InfoBox>
          ) : (
            <ModuleSummaryContext.Provider value={{ summaries, requestSummary }}>
              <DiagramCanvas
                nodes={simpleFlow.nodes}
                edges={simpleFlow.edges}
                className="h-[calc(100vh-260px)] min-h-[520px]"
              />
            </ModuleSummaryContext.Provider>
          )
        )}

        {/* ── Visão Técnica — original two-tab ReactFlow graph, unchanged ── */}
        {viewMode === 'technical' && (
          <Tabs defaultValue="navigation">
            <TabsList>
              <TabsTrigger value="navigation" className="gap-1.5">
                Fluxo de Navegação
                <TermHint termo="Fluxo de Navegação" />
              </TabsTrigger>
              <TabsTrigger value="architecture" className="gap-1.5">
                Arquitetura por trás
                <TermHint termo="Arquitetura por trás" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="navigation">
              {filteredNavigation.nodes.length === 0 ? (
                <InfoBox variant="info" title="Sem fluxos de navegação detectados">
                  Nenhuma navegação entre telas foi identificada para este filtro.
                </InfoBox>
              ) : (
                <DiagramCanvas nodes={filteredNavigation.nodes} edges={filteredNavigation.edges} />
              )}
            </TabsContent>

            <TabsContent value="architecture">
              {filteredArchitecture.nodes.length === 0 ? (
                <InfoBox variant="info" title="Sem relações de arquitetura detectadas">
                  Nenhum import interno resolvido foi identificado para este filtro.
                </InfoBox>
              ) : (
                <DiagramCanvas nodes={filteredArchitecture.nodes} edges={filteredArchitecture.edges} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ViewModeContext.Provider>
  );
}

function filterFlow<T extends { nodes: { id: string; data: { module: unknown } }[]; edges: { source: string; target: string }[] }>(
  flow: T,
  selectedModule: string,
): T {
  if (selectedModule === ALL_MODULES) return flow;
  const keptIds = new Set(flow.nodes.filter((n) => n.data.module === selectedModule).map((n) => n.id));
  return {
    ...flow,
    nodes: flow.nodes.filter((n) => keptIds.has(n.id)),
    edges: flow.edges.filter((e) => keptIds.has(e.source) && keptIds.has(e.target)),
  };
}

function DiagramCanvas({
  nodes,
  edges,
  className = 'h-[600px]',
}: {
  nodes: any[];
  edges: any[];
  className?: string;
}) {
  return (
    <div className={`w-full rounded-lg border border-border bg-muted/20 ${className}`}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          panOnScroll
          zoomOnScroll={false}
          minZoom={0.1}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-background" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
