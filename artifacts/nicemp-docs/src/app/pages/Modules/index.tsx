import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, InteractionsDisclosure } from '@/app/components/docs';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import {
  ProjectRepository, PageRepository, ComponentRepository, HookRepository, ApiRepository, TableRepository, InteractionRepository,
} from '@/services/storage';
import type { InteractionEntity } from '@/services/storage/types';
import type { RiskLevel } from '@/services/storage/types';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';

const RISK_ORDER: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

/** Picks the highest risk level found among a module's entities. */
function highestRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((acc, r) => (RISK_ORDER[r] > RISK_ORDER[acc] ? r : acc), 'none');
}

interface ModuleRow {
  name: string;
  pages: number;
  components: number;
  hooks: number;
  apis: number;
  tables: number;
  riskLevel: RiskLevel;
  dependencies: string[];
  interactions: InteractionEntity[];
}

/**
 * Módulos — agrupamento real de páginas, componentes, hooks, APIs e tabelas
 * por módulo funcional, extraído diretamente da base de documentação
 * (EPIC 08/09). Cada módulo pode gerar um prompt pronto para o Replit.
 */
export default function Modules() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);

  const pages      = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const components = useMemo(() => (project ? ComponentRepository.findByProject(project.id) : []), [project]);
  const hooks       = useMemo(() => (project ? HookRepository.findByProject(project.id) : []), [project]);
  const apis        = useMemo(() => (project ? ApiRepository.findByProject(project.id) : []), [project]);
  const tables      = useMemo(() => (project ? TableRepository.findByProject(project.id) : []), [project]);
  const interactionsAll = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);

  const modules = useMemo<ModuleRow[]>(() => {
    const map = new Map<string, ModuleRow>();
    const ensure = (name: string) => {
      const key = name || 'sem módulo';
      if (!map.has(key)) {
        map.set(key, { name: key, pages: 0, components: 0, hooks: 0, apis: 0, tables: 0, riskLevel: 'none', dependencies: [], interactions: [] });
      }
      return map.get(key)!;
    };
    pages.forEach((p) => { const m = ensure(p.module); m.pages += 1; m.riskLevel = highestRisk([m.riskLevel, p.riskLevel]); m.dependencies.push(`Página: ${p.name}`); });
    components.forEach((c) => { const m = ensure(c.module); m.components += 1; m.riskLevel = highestRisk([m.riskLevel, c.riskLevel]); m.dependencies.push(`Componente: ${c.name}`); });
    hooks.forEach((h) => { const m = ensure(h.module); m.hooks += 1; m.riskLevel = highestRisk([m.riskLevel, h.riskLevel]); m.dependencies.push(`Hook: ${h.name}`); });
    apis.forEach((a) => { const m = ensure(a.module); m.apis += 1; m.riskLevel = highestRisk([m.riskLevel, a.riskLevel]); m.dependencies.push(`API: ${a.name}`); });
    tables.forEach((t) => { const m = ensure(t.module); m.tables += 1; m.dependencies.push(`Tabela: ${t.tableName}`); });
    interactionsAll.forEach((i) => { const m = ensure(i.module); m.interactions.push(i); });
    return [...map.values()].sort((a, b) => (b.pages + b.components + b.hooks + b.apis + b.tables) - (a.pages + a.components + a.hooks + a.apis + a.tables));
  }, [pages, components, hooks, apis, tables, interactionsAll]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.name.toLowerCase().includes(q));
  }, [modules, query]);

  return (
    <div className="w-full">
      <PageHeader
        title="Módulos"
        description="Módulos funcionais do sistema, agrupados automaticamente a partir das páginas, componentes, hooks, APIs e tabelas detectadas."
        badge="EPIC 09"
        badgeVariant="info"
        termHint="Módulo"
      />

      {modules.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum módulo encontrado">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <Section title="Módulos Detectados" description="Cada módulo agrega tudo que foi identificado sob o mesmo nome de pasta/feature.">
          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar módulo..." resultCount={filtered.length} totalCount={modules.length} />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Módulo</TableHead>
                  <TableHead>Páginas</TableHead>
                  <TableHead>Componentes</TableHead>
                  <TableHead>Hooks</TableHead>
                  <TableHead>APIs</TableHead>
                  <TableHead>Tabelas</TableHead>
                  <TableHead>Interações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                        {m.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.pages}</TableCell>
                    <TableCell className="text-muted-foreground">{m.components}</TableCell>
                    <TableCell className="text-muted-foreground">{m.hooks}</TableCell>
                    <TableCell className="text-muted-foreground">{m.apis}</TableCell>
                    <TableCell className="text-muted-foreground">{m.tables}</TableCell>
                    <TableCell>
                      <InteractionsDisclosure interactions={m.interactions} />
                    </TableCell>
                    <TableCell className="text-right">
                      <GeneratePromptButton
                        iconOnly
                        kind="module"
                        name={m.name}
                        location={`módulo "${m.name}"`}
                        module={m.name}
                        riskLevel={m.riskLevel}
                        dependencies={m.dependencies}
                        details={{
                          Páginas: String(m.pages),
                          Componentes: String(m.components),
                          Hooks: String(m.hooks),
                          APIs: String(m.apis),
                          Tabelas: String(m.tables),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}
    </div>
  );
}
