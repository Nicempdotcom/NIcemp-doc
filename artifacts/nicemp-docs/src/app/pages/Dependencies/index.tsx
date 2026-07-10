import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import { ProjectRepository, DependencyRepository } from '@/services/storage';
import type { DepKind } from '@/services/storage/types';

const DEP_KIND_LABEL: Record<DepKind, string> = { prod: 'Produção', dev: 'Desenvolvimento', peer: 'Peer' };

/** Full listing of every DependencyEntity — auto-generated (EPIC 08 Portal Oficial). */
export default function Dependencies() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const dependencies = useMemo(() => (project ? DependencyRepository.findByProject(project.id) : []), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? dependencies.filter((d) => d.name.toLowerCase().includes(q)) : dependencies;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [dependencies, query]);

  const counts = useMemo(() => ({
    prod: dependencies.filter((d) => d.depKind === 'prod').length,
    dev:  dependencies.filter((d) => d.depKind === 'dev').length,
    peer: dependencies.filter((d) => d.depKind === 'peer').length,
  }), [dependencies]);

  return (
    <div className="w-full">
      <PageHeader
        title="Dependências"
        description="Todos os pacotes utilizados pelo projeto, gerados automaticamente a partir do package.json."
        badge="EPIC 08"
        badgeVariant="info"
      />

      {dependencies.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma dependência encontrada">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{counts.prod}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Produção</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{counts.dev}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Desenvolvimento</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{counts.peer}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Peer</div>
            </div>
          </div>

          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar pacote..." resultCount={filtered.length} totalCount={dependencies.length} />
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Pacote</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono text-sm text-foreground">{d.packageName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{d.version}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-normal">{DEP_KIND_LABEL[d.depKind]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.registry || '—'}</TableCell>
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
