import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database as DatabaseIcon, KeyRound, Link2 } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import { ProjectRepository, TableRepository } from '@/services/storage';

const STATUS_LABEL: Record<string, string> = { active: 'Ativa', deprecated: 'Descontinuada', planned: 'Planejada' };
const STATUS_COLOR: Record<string, string> = {
  active:     'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  deprecated: 'text-slate-700 dark:text-slate-400 border-slate-500/30 bg-slate-500/10',
  planned:    'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
};

/**
 * Banco de Dados — every TableEntity detected in the project, generated
 * automatically from the documentation database (EPIC 08 Portal Oficial).
 */
export default function Database() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const tables = useMemo(() => (project ? TableRepository.findByProject(project.id) : []), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tableName.toLowerCase().includes(q) || t.module.toLowerCase().includes(q));
  }, [tables, query]);

  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
  const withForeignKeys = tables.filter((t) => t.columns.some((c) => c.foreignKey)).length;

  return (
    <div className="w-full">
      <PageHeader
        title="Banco de Dados"
        description="Tabelas, colunas e relacionamentos detectados no projeto, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
        termHint="Banco de Dados"
      />

      {tables.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma tabela encontrada">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{tables.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Tabelas</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{totalColumns}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Colunas mapeadas</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{withForeignKeys}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Com chaves estrangeiras</div>
            </div>
          </div>

          <EntityTableToolbar query={query} onQueryChange={setQuery} placeholder="Buscar tabela..." resultCount={filtered.length} totalCount={tables.length} />

          <div className="space-y-4">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <DatabaseIcon className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-semibold text-foreground">{t.tableName || t.name}</span>
                  {t.module && <Badge variant="outline" className="text-[10px] font-normal">{t.module}</Badge>}
                  <span className={`ml-auto inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                {t.columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-3">Colunas ainda não detectadas para esta tabela.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coluna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Regras</TableHead>
                        <TableHead>Relacionamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.columns.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-mono text-xs">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex gap-1.5">
                              {c.primary && <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3" /> PK</span>}
                              {c.unique && <span>UNIQUE</span>}
                              {!c.nullable && <span>NOT NULL</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.foreignKey ? (
                              <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> {c.foreignKey}</span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
