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
      />

      {apis.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma API encontrada">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar por nome ou rota..." resultCount={filtered.length} totalCount={apis.length} />
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Método</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Autenticação</TableHead>
                  <TableHead>Papéis</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono text-sm text-foreground">{a.path || a.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>{a.module ? <Badge variant="outline" className="text-[10px] font-normal">{a.module}</Badge> : '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>
                      {a.auth ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><Lock className="h-3 w-3" /> Protegida</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><LockOpen className="h-3 w-3" /> Pública</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.roles.length > 0 ? a.roles.join(', ') : '—'}</TableCell>
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
