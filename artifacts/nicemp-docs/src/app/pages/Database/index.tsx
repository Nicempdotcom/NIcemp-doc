import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Database as DatabaseIcon, KeyRound, Link2, Loader2, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/app/components/ui/table';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/app/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { ProjectRepository, TableRepository, TableUsageRepository } from '@/services/storage';
import { isAnalyzedSupabaseConfigured } from '@/lib/analyzedProjectSupabase';
import { LiveSupabaseIntrospector } from '@/services/engine/LiveSupabaseIntrospector';
import type { LiveTableSchema, TableSampleResult } from '@/services/engine/LiveSupabaseIntrospector';
import type { TableUsageEntry } from '@/services/engine/LiveTableUsageAnalyzer';
import EditSupabaseTablePromptDialog from '@/app/components/prompts/EditSupabaseTablePromptDialog';

// ─── Static tab ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = { active: 'Ativa', deprecated: 'Descontinuada', planned: 'Planejada' };
const STATUS_COLOR: Record<string, string> = {
  active:     'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  deprecated: 'text-slate-700 dark:text-slate-400 border-slate-500/30 bg-slate-500/10',
  planned:    'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
};

// ─── Live tab helpers ──────────────────────────────────────────────────────────

function kindRoute(kind: TableUsageEntry['kind']): string {
  if (kind === 'page')      return '/projeto/paginas';
  if (kind === 'component') return '/projeto/componentes';
  return '/projeto/apis';
}

function kindLabel(kind: TableUsageEntry['kind']): string {
  if (kind === 'page')      return 'Página';
  if (kind === 'component') return 'Componente';
  return 'API';
}

// ─── Live table detail dialog ──────────────────────────────────────────────────

interface TableDetailDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  schema:       LiveTableSchema | null;
  sample:       TableSampleResult | null;
  sampleLoading: boolean;
  usages:       TableUsageEntry[];
  onGeneratePrompt: () => void;
}

function TableDetailDialog({
  open,
  onOpenChange,
  schema,
  sample,
  sampleLoading,
  usages,
  onGeneratePrompt,
}: TableDetailDialogProps) {
  if (!schema) return null;

  const sampleCols = sample?.rows?.[0] ? Object.keys(sample.rows[0]) : schema.columns.map((c) => c.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <DatabaseIcon className="h-4 w-4 text-primary" />
            {schema.name}
            {sample?.rowCount != null && (
              <Badge variant="outline" className="text-xs font-normal ml-1">
                {sample.rowCount.toLocaleString('pt-BR')} linha{sample.rowCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Columns */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Colunas ({schema.columns.length})
            </h3>
            {schema.columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma coluna detectada via schema PostgREST.</p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nullable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schema.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-xs">{col.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{col.type}</TableCell>
                        <TableCell className="text-xs">
                          {col.nullable
                            ? <span className="text-muted-foreground">nullable</span>
                            : <span className="text-foreground font-medium">NOT NULL</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Sample data */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Amostra de dados</h3>
            {sampleLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando amostra…
              </div>
            ) : sample?.error ? (
              <InfoBox variant="warning" title="Sem acesso à amostra">
                {sample.error}
              </InfoBox>
            ) : sample && sample.rows.length > 0 ? (
              <div className="rounded-md border border-border overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sampleCols.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sample.rows.map((row, i) => (
                      <TableRow key={i}>
                        {sampleCols.map((col) => (
                          <TableCell key={col} className="text-xs font-mono max-w-[200px] truncate">
                            {row[col] == null
                              ? <span className="text-muted-foreground">null</span>
                              : String(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma linha encontrada na amostra.</p>
            )}
          </section>

          {/* Usado em */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Usado em</h3>
            {usages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma referência encontrada no código analisado.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {usages.map((u) => (
                  <div key={u.entityId} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0">{kindLabel(u.kind)}</Badge>
                    <Link
                      to={`${kindRoute(u.kind)}?q=${encodeURIComponent(u.label)}`}
                      className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
                    >
                      {u.label}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={onGeneratePrompt} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Gerar prompt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Live Supabase tab ─────────────────────────────────────────────────────────

function LiveTab({ projectId }: { projectId: string | null }) {
  const [loading, setLoading]               = useState(false);
  const [tables, setTables]                 = useState<LiveTableSchema[]>([]);
  const [loaded, setLoaded]                 = useState(false);

  const [detailOpen, setDetailOpen]         = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<LiveTableSchema | null>(null);
  const [sample, setSample]                 = useState<TableSampleResult | null>(null);
  const [sampleLoading, setSampleLoading]   = useState(false);
  const [usages, setUsages]                 = useState<TableUsageEntry[]>([]);

  const [promptOpen, setPromptOpen]         = useState(false);

  const configured = isAnalyzedSupabaseConfigured();

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const result = await LiveSupabaseIntrospector.listTables();
      setTables(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first mount if configured
  useEffect(() => {
    if (configured && !loaded) {
      loadTables();
    }
  }, [configured, loaded, loadTables]);

  async function handleSelectTable(schema: LiveTableSchema) {
    setSelectedSchema(schema);
    setSample(null);
    setSampleLoading(true);
    setDetailOpen(true);

    // Load usages from repository (sync)
    if (projectId) {
      const entity = TableUsageRepository.findByTable(projectId, schema.name);
      setUsages(entity?.usages ?? []);
    } else {
      setUsages([]);
    }

    // Load sample (async)
    const result = await LiveSupabaseIntrospector.getTableSample(schema.name);
    setSample(result);
    setSampleLoading(false);
  }

  if (!configured) {
    return (
      <InfoBox variant="warning" title="Supabase do projeto analisado não configurado">
        Vá em <strong>Configurações → Supabase do projeto analisado</strong> para informar a URL e
        a anon key do Supabase do nicemp.com. A conexão é somente leitura.
      </InfoBox>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando tabelas do Supabase…
      </div>
    );
  }

  if (loaded && tables.length === 0) {
    return (
      <InfoBox variant="tip" title="Nenhuma tabela encontrada">
        O endpoint PostgREST não retornou tabelas públicas. Verifique se a anon key tem permissão
        de leitura e se há tabelas no schema <code>public</code>.
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={loadTables} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      </InfoBox>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {loaded && (
          <p className="text-sm text-muted-foreground">
            {tables.length} tabela{tables.length !== 1 ? 's' : ''} encontrada{tables.length !== 1 ? 's' : ''} no Supabase.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={loadTables} className="gap-1.5 ml-auto">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handleSelectTable(t)}
            className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <DatabaseIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono text-sm font-semibold text-foreground truncate">{t.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.columns.length} coluna{t.columns.length !== 1 ? 's' : ''}
            </p>
            {t.columns.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {t.columns.slice(0, 4).map((c) => c.name).join(', ')}
                {t.columns.length > 4 ? ` +${t.columns.length - 4}` : ''}
              </p>
            )}
          </button>
        ))}
      </div>

      <TableDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        schema={selectedSchema}
        sample={sample}
        sampleLoading={sampleLoading}
        usages={usages}
        onGeneratePrompt={() => {
          setDetailOpen(false);
          setPromptOpen(true);
        }}
      />

      {selectedSchema && (
        <EditSupabaseTablePromptDialog
          open={promptOpen}
          onOpenChange={setPromptOpen}
          tableName={selectedSchema.name}
          columns={selectedSchema.columns}
          usages={usages}
        />
      )}
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

/**
 * Banco de Dados — tabs:
 *  1. "Detectado no código" — TableEntity from static analysis (existing behavior)
 *  2. "Live (Supabase)"    — live introspection from the analyzed project's Supabase
 */
export default function Database() {
  const [searchParams] = useSearchParams();
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const tables  = useMemo(() => (project ? TableRepository.findByProject(project.id) : []), [project]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tableName.toLowerCase().includes(q) || t.module.toLowerCase().includes(q));
  }, [tables, query]);

  const totalColumns  = tables.reduce((sum, t) => sum + t.columns.length, 0);
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

      <Tabs defaultValue="static" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="static">Detectado no código</TabsTrigger>
          <TabsTrigger value="live">Live (Supabase)</TabsTrigger>
        </TabsList>

        {/* ── Static tab (existing behavior, untouched) ── */}
        <TabsContent value="static">
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
        </TabsContent>

        {/* ── Live tab ── */}
        <TabsContent value="live">
          <LiveTab projectId={project?.id ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
