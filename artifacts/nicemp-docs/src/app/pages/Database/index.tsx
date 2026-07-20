import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Database as DatabaseIcon, KeyRound, Link2, Loader2, RefreshCw, Sparkles, ExternalLink, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import EntityTableToolbar from '@/app/components/docs/EntityTableToolbar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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
import { isAnalyzedSupabaseConfigured, getTrackedTableNames, addTrackedTableName, removeTrackedTableName } from '@/lib/analyzedProjectSupabase';
import { LiveSupabaseIntrospector } from '@/services/engine/LiveSupabaseIntrospector';
import type { LiveTableSchema, LiveTableDescribeResult, TableSampleResult } from '@/services/engine/LiveSupabaseIntrospector';
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

// ─── Tracked table card ────────────────────────────────────────────────────────

interface TrackedTableCardProps {
  tableName:  string;
  projectId:  string | null;
  onRemove:   () => void;
}

function TrackedTableCard({ tableName, projectId, onRemove }: TrackedTableCardProps) {
  const [result, setResult]           = useState<LiveTableDescribeResult | null>(null);
  const [loading, setLoading]         = useState(false);

  const [detailOpen, setDetailOpen]   = useState(false);
  const [sample, setSample]           = useState<TableSampleResult | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [usages, setUsages]           = useState<TableUsageEntry[]>([]);
  const [promptOpen, setPromptOpen]   = useState(false);

  const loadDescribe = useCallback(async () => {
    setLoading(true);
    try {
      const r = await LiveSupabaseIntrospector.describeTable(tableName);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  // Auto-load on mount
  useEffect(() => { loadDescribe(); }, [loadDescribe]);

  async function handleOpen() {
    if (result?.permissionError) return; // do not open detail for error cards
    const schema = result?.schema ?? { name: tableName, columns: [] };
    setSample(null);
    setSampleLoading(true);
    setDetailOpen(true);

    if (projectId) {
      const entity = TableUsageRepository.findByTable(projectId, schema.name);
      setUsages(entity?.usages ?? []);
    } else {
      setUsages([]);
    }

    const s = await LiveSupabaseIntrospector.getTableSample(schema.name);
    setSample(s);
    setSampleLoading(false);
  }

  const schema = result?.schema ?? { name: tableName, columns: [] };
  const isError = !!result?.permissionError;

  return (
    <>
      <div
        className={[
          'rounded-lg border bg-card p-4 transition-all duration-150',
          isError
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-border hover:border-primary/40 hover:shadow-sm cursor-pointer',
        ].join(' ')}
        onClick={!isError ? handleOpen : undefined}
        role={!isError ? 'button' : undefined}
        tabIndex={!isError ? 0 : undefined}
        onKeyDown={!isError ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(); } : undefined}
      >
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin mt-0.5 shrink-0" />
          ) : isError ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <DatabaseIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          )}
          <span className="font-mono text-sm font-semibold text-foreground truncate flex-1">
            {tableName}
          </span>
          {/* Action buttons — stop propagation so they don't trigger handleOpen */}
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Atualizar"
              onClick={loadDescribe}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              title="Remover tabela"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : isError ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Sem permissão de leitura. Rode no SQL Editor do Supabase:
            </p>
            <code className="block text-[11px] bg-amber-500/10 rounded px-2 py-1.5 text-amber-800 dark:text-amber-300 break-all">
              {result!.permissionError}
            </code>
          </div>
        ) : result?.warning ? (
          <p className="text-xs text-muted-foreground italic">{result.warning}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {schema.columns.length} coluna{schema.columns.length !== 1 ? 's' : ''}
            </p>
            {schema.columns.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {schema.columns.slice(0, 4).map((c) => c.name).join(', ')}
                {schema.columns.length > 4 ? ` +${schema.columns.length - 4}` : ''}
              </p>
            )}
          </>
        )}
      </div>

      <TableDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        schema={schema}
        sample={sample}
        sampleLoading={sampleLoading}
        usages={usages}
        onGeneratePrompt={() => { setDetailOpen(false); setPromptOpen(true); }}
      />

      <EditSupabaseTablePromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        tableName={schema.name}
        columns={schema.columns}
        usages={usages}
      />
    </>
  );
}

// ─── Live Supabase tab ─────────────────────────────────────────────────────────

function LiveTab({ projectId }: { projectId: string | null }) {
  const [trackedNames, setTrackedNames] = useState<string[]>(() => getTrackedTableNames());
  const [newName, setNewName]           = useState('');

  const configured = isAnalyzedSupabaseConfigured();

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addTrackedTableName(name);
    setTrackedNames(getTrackedTableNames());
    setNewName('');
  }

  function handleRemove(name: string) {
    removeTrackedTableName(name);
    setTrackedNames(getTrackedTableNames());
  }

  if (!configured) {
    return (
      <InfoBox variant="warning" title="Supabase do projeto analisado não configurado">
        Vá em <strong>Configurações → Supabase do projeto analisado</strong> para informar a URL e
        a anon key do Supabase do nicemp.com. A conexão é somente leitura.
      </InfoBox>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add table form */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="cms_categories"
            className="font-mono text-sm max-w-xs"
          />
          <Button onClick={handleAdd} disabled={!newName.trim()} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            Adicionar tabela
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Digite o nome exato da tabela, igual aparece no Table Editor do Supabase (ex.: cms_categories).
        </p>
      </div>

      {/* Table cards */}
      {trackedNames.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma tabela rastreada ainda">
          Adicione o nome de uma tabela acima para visualizar suas colunas, amostra de dados e referências no código.
        </InfoBox>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackedNames.map((name) => (
            <TrackedTableCard
              key={name}
              tableName={name}
              projectId={projectId}
              onRemove={() => handleRemove(name)}
            />
          ))}
        </div>
      )}
    </div>
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
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm font-semibold text-foreground">{t.tableName || t.name}</span>
                        {t.description && (
                          <div className="text-xs text-muted-foreground truncate" title={t.description}>{t.description}</div>
                        )}
                      </div>
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
