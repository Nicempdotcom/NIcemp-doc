import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import StatusBadge from '@/app/components/docs/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import { ProjectRepository, HookRepository } from '@/services/storage';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';

/** Full listing of every HookEntity — auto-generated (EPIC 08 Portal Oficial). */
export default function Hooks() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const hooks = useMemo(() => (project ? HookRepository.findByProject(project.id) : []), [project]);
  const nameIndex = useMemo(() => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hooks;
    return hooks.filter((h) =>
      h.name.toLowerCase().includes(q) || h.module.toLowerCase().includes(q) || h.location.toLowerCase().includes(q));
  }, [hooks, query]);

  return (
    <div className="w-full">
      <PageHeader
        title="Hooks"
        description="Todos os hooks customizados detectados no projeto, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
        termHint="Hook"
      />

      {hooks.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum hook encontrado">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar hook..." resultCount={filtered.length} totalCount={hooks.length} />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parâmetros</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Usado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground font-mono truncate">{h.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate" title={h.location}>{h.location}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{h.module ? <Badge variant="outline" className="text-[10px] font-normal">{h.module}</Badge> : '—'}</TableCell>
                    <TableCell><StatusBadge status={h.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{h.params.length}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{h.returns || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{h.usedIn.length}</TableCell>
                    <TableCell className="text-right">
                      <GeneratePromptButton
                        iconOnly
                        kind="hook"
                        name={h.name}
                        location={h.location}
                        module={h.module}
                        riskLevel={h.riskLevel}
                        dependencies={resolveNames([...h.relationships, ...h.usedIn], nameIndex)}
                        details={{
                          Status: h.status,
                          Parâmetros: String(h.params.length),
                          Retorno: h.returns || '—',
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
