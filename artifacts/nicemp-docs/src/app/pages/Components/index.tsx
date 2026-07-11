import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import StatusBadge from '@/app/components/docs/StatusBadge';
import InteractionsDisclosure from '@/app/components/docs/InteractionsDisclosure';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import { ProjectRepository, ComponentRepository, InteractionRepository } from '@/services/storage';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';

/**
 * Full listing of every ComponentEntity in the documentation database —
 * auto-generated, never manually written (EPIC 08 Portal Oficial).
 */
export default function Components() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const components = useMemo(() => (project ? ComponentRepository.findByProject(project.id) : []), [project]);
  const interactions = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);
  const nameIndex = useMemo(() => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return components;
    return components.filter((c) =>
      c.name.toLowerCase().includes(q) || c.module.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
  }, [components, query]);

  return (
    <div className="w-full">
      <PageHeader
        title="Componentes"
        description="Todos os componentes de UI detectados no projeto, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
        termHint="Componente"
      />

      {components.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum componente encontrado">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar componente..." resultCount={filtered.length} totalCount={components.length} />
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Props</TableHead>
                  <TableHead>Usado em</TableHead>
                  <TableHead>O que faz</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.location}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{c.module ? <Badge variant="outline" className="text-[10px] font-normal">{c.module}</Badge> : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.category || '—'}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{c.props.length}</TableCell>
                    <TableCell className="text-muted-foreground">{c.usedIn.length}</TableCell>
                    <TableCell>
                      <InteractionsDisclosure interactions={interactions.filter((i) => i.location === c.location)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <GeneratePromptButton
                        iconOnly
                        kind="component"
                        name={c.name}
                        location={c.location}
                        module={c.module}
                        riskLevel={c.riskLevel}
                        dependencies={resolveNames([...c.relationships, ...c.usedIn], nameIndex)}
                        details={{
                          Categoria: c.category || '—',
                          Status: c.status,
                          Props: String(c.props.length),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
