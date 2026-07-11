import React, { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox } from '@/app/components/docs';
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
  InteractionRepository,
  ImportEdgeRepository,
} from '@/services/storage';

import DiagramNode from './DiagramNode';
import { buildNavigationFlow } from './buildNavigationFlow';
import { buildArchitectureFlow } from './buildArchitectureFlow';

const nodeTypes: NodeTypes = { diagram: DiagramNode };

const ALL_MODULES = '__all__';

/**
 * Organograma (EPIC 11) — visual diagram of the app, in two tabs:
 *  - "Fluxo de Navegação": pages connected by the action that navigates
 *    between them (built from InteractionEntity records).
 *  - "Arquitetura por trás": layered Páginas → Componentes → Hooks/APIs →
 *    Banco de Dados diagram (built from resolved ImportEdgeEntity records).
 *
 * Both diagrams show only plain-language names on the boxes — the file path
 * only appears on hover, keeping the default view readable for non-technical
 * stakeholders while still giving engineers the technical detail on demand.
 */
export default function Overview() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);

  const pages = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const interactions = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);
  const importEdges = useMemo(() => (project ? ImportEdgeRepository.findByProject(project.id) : []), [project]);

  const navigationFlow = useMemo(() => buildNavigationFlow(pages, interactions), [pages, interactions]);
  const architectureFlow = useMemo(() => buildArchitectureFlow(importEdges), [importEdges]);

  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const n of navigationFlow.nodes) set.add(n.data.module);
    for (const n of architectureFlow.nodes) set.add(n.data.module);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [navigationFlow.nodes, architectureFlow.nodes]);

  const [selectedModule, setSelectedModule] = useState<string>(ALL_MODULES);

  const filteredNavigation = useMemo(() => filterFlow(navigationFlow, selectedModule), [navigationFlow, selectedModule]);
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
    <div>
      <PageHeader
        title="Organograma"
        description="Diagrama visual do projeto: como as telas se conectam e o que fala com o quê por trás delas."
        badge="Novo"
        badgeVariant="info"
      />

      <div className="mb-4 flex items-center justify-end">
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

      <Tabs defaultValue="navigation">
        <TabsList>
          <TabsTrigger value="navigation">Fluxo de Navegação</TabsTrigger>
          <TabsTrigger value="architecture">Arquitetura por trás</TabsTrigger>
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
    </div>
  );
}

function filterFlow<T extends { nodes: { id: string; data: { module: string } }[]; edges: { source: string; target: string }[] }>(
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

function DiagramCanvas({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  return (
    <div className="h-[600px] w-full rounded-lg border border-border bg-muted/20">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          panOnScroll
          zoomOnScroll={false}
          minZoom={0.2}
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
