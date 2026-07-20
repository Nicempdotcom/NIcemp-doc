import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Layers, Zap, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import Section from '@/app/components/docs/Section';
import InfoBox from '@/app/components/docs/InfoBox';
import StatusBadge from '@/app/components/docs/StatusBadge';
import InteractionsDisclosure from '@/app/components/docs/InteractionsDisclosure';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import {
  ProjectRepository, PageRepository, ComponentRepository, HookRepository, InteractionRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';

function groupByModule<T extends { module: string }>(items: T[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.module || 'sem módulo';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Frontend overview — pages, components and hooks summarized directly from
 * the documentation database (EPIC 08 Portal Oficial). Full listings live
 * on the dedicated Componentes/Hooks pages.
 */
export default function Frontend() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const pages      = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const components = useMemo(() => (project ? ComponentRepository.findByProject(project.id) : []), [project]);
  const hooks       = useMemo(() => (project ? HookRepository.findByProject(project.id) : []), [project]);
  const interactions = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);
  const nameIndex   = useMemo(() => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) =>
      p.name.toLowerCase().includes(q) || p.module.toLowerCase().includes(q) || p.route.toLowerCase().includes(q));
  }, [pages, query]);

  const pageModules = useMemo(() => groupByModule(pages), [pages]);
  const componentCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of components) {
      const key = c.category || 'sem categoria';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [components]);

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader title="Frontend" description="Componentes, páginas e hooks do projeto, gerados automaticamente." badge="EPIC 08" badgeVariant="info" termHint="Frontend" />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Frontend"
        description="Componentes, páginas e hooks do projeto, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
        termHint="Frontend"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
          <FileText className="h-4 w-4 text-primary mb-1" />
          <div className="text-3xl font-bold text-foreground">{pages.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Páginas</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
          <Layers className="h-4 w-4 text-primary mb-1" />
          <div className="text-3xl font-bold text-foreground">{components.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Componentes</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
          <Zap className="h-4 w-4 text-primary mb-1" />
          <div className="text-3xl font-bold text-foreground">{hooks.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Hooks</div>
        </div>
      </div>

      <Section title="Páginas por Módulo" description="Distribuição das páginas encontradas no projeto.">
        {pageModules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma página detectada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pageModules.map(([mod, count]) => (
              <Badge key={mod} variant="outline" className="text-xs font-normal">{mod} · {count}</Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title="Todas as Páginas" description="Listagem completa de páginas detectadas, com prompt pronto para pedir alterações ao Replit.">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma página detectada ainda.</p>
        ) : (
          <>
            <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar página..." resultCount={filteredPages.length} totalCount={pages.length} />
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[25%]">Nome</TableHead>
                    <TableHead className="w-[15%]">Rota</TableHead>
                    <TableHead className="w-[12%]">Módulo</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                    <TableHead className="w-[28%]">O que faz</TableHead>
                    <TableHead className="w-[10%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate" title={p.name}>{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-muted-foreground truncate" title={p.description}>{p.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground font-mono truncate" title={p.location}>{p.location}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate" title={p.route || '—'}>{p.route || '—'}</TableCell>
                      <TableCell className="truncate">{p.module ? <Badge variant="outline" className="text-[10px] font-normal">{p.module}</Badge> : '—'}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>
                        <InteractionsDisclosure interactions={interactions.filter((i) => i.location === p.location)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <GeneratePromptButton
                          iconOnly
                          kind="page"
                          name={p.name}
                          location={p.location}
                          module={p.module}
                          riskLevel={p.riskLevel}
                          dependencies={resolveNames([...p.relationships, ...p.components, ...p.hooks, ...p.apis], nameIndex)}
                          details={{ Rota: p.route || '—', Status: p.status }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      <Section title="Componentes por Categoria">
        {componentCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum componente detectado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {componentCategories.map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-xs font-normal">{cat} · {count}</Badge>
            ))}
          </div>
        )}
        <Link to={ROUTES.components} className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 hover:underline">
          Ver todos os componentes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Section>

      <Section title="Hooks Customizados">
        {hooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum hook detectado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {hooks.slice(0, 12).map((h) => (
              <Badge key={h.id} variant="outline" className="text-xs font-normal font-mono">{h.name}</Badge>
            ))}
          </div>
        )}
        <Link to={ROUTES.hooks} className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 hover:underline">
          Ver todos os hooks <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Section>
    </div>
  );
}
