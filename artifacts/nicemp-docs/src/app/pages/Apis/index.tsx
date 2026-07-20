import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Globe, Lock, LockOpen } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import StatusBadge from '@/app/components/docs/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import { cn } from '@/utils';
import { ProjectRepository, ApiRepository } from '@/services/storage';
import type { HttpMethod } from '@/services/storage/types';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET:    'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  POST:   'text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/10',
  PUT:    'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
  PATCH:  'text-orange-700 dark:text-orange-400 border-orange-500/30 bg-orange-500/10',
  DELETE: 'text-red-700 dark:text-red-400 border-red-500/30 bg-red-500/10',
};

/** Full listing of every ApiEntity — auto-generated (EPIC 08 Portal Oficial). */
export default function Apis() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const apis = useMemo(() => (project ? ApiRepository.findByProject(project.id) : []), [project]);
  const nameIndex = useMemo(() => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter((a) =>
      a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q) || a.module.toLowerCase().includes(q));
  }, [apis, query]);

  return (
    <div className="w-full">
      <PageHeader
        title="APIs"
        description="Todos os endpoints detectados no projeto, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
        termHint="API"
      />

      {apis.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma API encontrada">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar por nome ou rota..." resultCount={filtered.length} totalCount={apis.length} />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[8%]">Método</TableHead>
                  <TableHead className="w-[28%]">Rota</TableHead>
                  <TableHead className="w-[12%]">Módulo</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[14%]">Autenticação</TableHead>
                  <TableHead className="w-[18%]">Papéis</TableHead>
                  <TableHead className="w-[10%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', METHOD_COLOR[a.method])}>
                        {a.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-mono text-sm text-foreground truncate flex-1 min-w-0" title={a.path || a.location}>{a.path || a.location}</span>
                        </div>
                        {a.description && (
                          <span className="text-xs text-muted-foreground truncate pl-5" title={a.description}>{a.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="truncate">{a.module ? <Badge variant="outline" className="text-[10px] font-normal">{a.module}</Badge> : '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>
                      {a.auth ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><Lock className="h-3 w-3" /> Protegida</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><LockOpen className="h-3 w-3" /> Pública</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs truncate" title={a.roles.length > 0 ? a.roles.join(', ') : '—'}>{a.roles.length > 0 ? a.roles.join(', ') : '—'}</TableCell>
                    <TableCell className="text-right">
                      <GeneratePromptButton
                        iconOnly
                        kind="api"
                        name={a.name}
                        location={a.location}
                        module={a.module}
                        riskLevel={a.riskLevel}
                        dependencies={resolveNames(a.relationships, nameIndex)}
                        details={{
                          Método: a.method,
                          Rota: a.path || a.location,
                          Status: a.status,
                          Autenticação: a.auth ? `Protegida (${a.roles.join(', ') || 'sem papéis definidos'})` : 'Pública',
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
