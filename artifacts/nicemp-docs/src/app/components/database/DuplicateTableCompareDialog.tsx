/**
 * DuplicateTableCompareDialog
 *
 * Dialog de comparação para alertas gerados pelo DuplicateTableAnalyzer.
 *
 * - Para alertas de dois tabelas (similar_name, similar_structure): mostra as
 *   duas tabelas lado a lado com destaque nas colunas em comum e divergentes,
 *   além do botão "Gerar prompt de limpeza".
 * - Para alertas de uma tabela (orphan, ghost): mostra a tabela isolada e a
 *   explicação do problema.
 *
 * Nunca executa SQL nem persiste dados — apenas exibe informações e gera texto.
 */
import React, { useState } from 'react';
import { Database as DatabaseIcon, AlertTriangle, Sparkles, Ghost, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge }  from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table';
import InfoBox from '@/app/components/docs/InfoBox';
import DuplicateTableCleanupPromptDialog from '@/app/components/prompts/DuplicateTableCleanupPromptDialog';
import type { DuplicateAlert }  from '@/services/engine/DuplicateTableAnalyzer';
import type { DiscoveredTable } from '@/services/engine/LiveSupabaseIntrospector';
import type { TableUsageEntry } from '@/services/engine/LiveTableUsageAnalyzer';
import type { DuplicateTableCleanupInput } from '@/services/prompts/DuplicateTableCleanupPromptGenerator';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  alert:         DuplicateAlert | null;
  /** Schema das tabelas do projeto analisado, indexado por nome. */
  schemaByName:  Map<string, DiscoveredTable>;
  /** Usages das tabelas, indexado por nome. */
  usagesByName:  Map<string, TableUsageEntry[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  similar_name:      'Nome parecido',
  similar_structure: 'Estrutura similar',
  orphan:            'Tabela órfã',
  ghost:             'Tabela fantasma',
};

const SEVERITY_COLORS: Record<string, string> = {
  alta:  'text-red-700 dark:text-red-400 border-red-500/30 bg-red-500/10',
  media: 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
};

function ColTable({
  table,
  highlightCols,
}: {
  table: DiscoveredTable | null;
  tableName: string;
  highlightCols?: Set<string>;
}) {
  if (!table) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Ghost className="h-4 w-4" />
        Tabela não encontrada no schema (referência fantasma).
      </div>
    );
  }
  if (table.columns.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Nenhuma coluna detectada.</p>;
  }
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Coluna</TableHead>
            <TableHead className="text-xs">Tipo</TableHead>
            <TableHead className="text-xs">Nullable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.columns.map((col) => {
            const isCommon = highlightCols?.has(`${col.name}::${col.type}`);
            return (
              <TableRow
                key={col.name}
                className={isCommon ? 'bg-emerald-500/5' : ''}
              >
                <TableCell className="font-mono text-xs">{col.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{col.type}</TableCell>
                <TableCell className="text-xs">
                  {col.nullable
                    ? <span className="text-muted-foreground">nullable</span>
                    : <span className="font-medium">NOT NULL</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function UsageList({ usages }: { usages: TableUsageEntry[] }) {
  if (usages.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma referência no código analisado.</p>;
  }
  const kindLabel = (k: TableUsageEntry['kind']) =>
    k === 'page' ? 'Página' : k === 'component' ? 'Componente' : 'API';
  return (
    <div className="flex flex-col gap-1">
      {usages.map((u) => (
        <div key={u.entityId} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] shrink-0">{kindLabel(u.kind)}</Badge>
          <span className="font-mono">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function DuplicateTableCompareDialog({
  open,
  onOpenChange,
  alert,
  schemaByName,
  usagesByName,
}: Props) {
  const [cleanupPromptOpen, setCleanupPromptOpen]           = useState(false);
  const [cleanupInput, setCleanupInput]                     = useState<DuplicateTableCleanupInput | null>(null);
  const [cleanupDropIndex, setCleanupDropIndex]             = useState<0 | 1>(1); // which table to "drop"

  if (!alert) return null;

  const isTwoTable = alert.tables.length === 2;
  const tableA     = isTwoTable ? schemaByName.get(alert.tables[0]!) ?? null : null;
  const tableB     = isTwoTable ? schemaByName.get(alert.tables[1]!) ?? null : null;
  const singleTable = !isTwoTable ? schemaByName.get(alert.tables[0]!) ?? null : null;

  // Colunas em comum para destaque visual
  const commonColKeys: Set<string> = new Set();
  if (tableA && tableB) {
    const setA = new Set(tableA.columns.map((c) => `${c.name}::${c.type}`));
    for (const col of tableB.columns) {
      if (setA.has(`${col.name}::${col.type}`)) commonColKeys.add(`${col.name}::${col.type}`);
    }
  }

  // Determina keepTable / dropTable com base na seleção do usuário
  const keepIdx = cleanupDropIndex === 0 ? 1 : 0;
  const dropIdx = cleanupDropIndex;

  function handleOpenCleanupPrompt() {
    if (!isTwoTable || !alert) return;
    const keepName = alert.tables[keepIdx]!;
    const dropName = alert.tables[dropIdx]!;
    const keepSchema = schemaByName.get(keepName);
    const dropSchema = schemaByName.get(dropName);

    setCleanupInput({
      keepTable:   keepName,
      keepColumns: keepSchema?.columns ?? [],
      keepUsages:  usagesByName.get(keepName) ?? [],
      dropTable:   dropName,
      dropColumns: dropSchema?.columns ?? [],
      dropUsages:  usagesByName.get(dropName) ?? [],
      reason:      alert.reason,
    });
    setCleanupPromptOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              {TYPE_LABELS[alert.type] ?? alert.type}
              <Badge
                variant="outline"
                className={`text-[10px] font-normal ml-1 ${SEVERITY_COLORS[alert.severity] ?? ''}`}
              >
                Severidade {alert.severity}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Motivo */}
            <InfoBox variant={alert.severity === 'alta' ? 'danger' : 'warning'}>
              {alert.reason}
            </InfoBox>

            {/* ── Layout de duas tabelas ── */}
            {isTwoTable && (
              <>
                {commonColKeys.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40 mr-1 align-middle" />
                    Colunas em comum ({commonColKeys.size}) destacadas em verde.
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1].map((idx) => {
                    const name   = alert.tables[idx]!;
                    const table  = schemaByName.get(name) ?? null;
                    const usages = usagesByName.get(name) ?? [];
                    const isDropCandidate = idx === dropIdx;

                    return (
                      <div
                        key={name}
                        className={[
                          'rounded-lg border p-4 space-y-3 transition-colors',
                          isDropCandidate
                            ? 'border-red-500/40 bg-red-500/5'
                            : 'border-emerald-500/40 bg-emerald-500/5',
                        ].join(' ')}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <DatabaseIcon className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-mono text-sm font-semibold">{name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ml-auto shrink-0 ${
                              isDropCandidate
                                ? 'text-red-700 border-red-500/30 bg-red-500/10'
                                : 'text-emerald-700 border-emerald-500/30 bg-emerald-500/10'
                            }`}
                          >
                            {isDropCandidate ? 'candidata a remover' : 'manter'}
                          </Badge>
                        </div>

                        {/* Colunas */}
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">
                            Colunas ({table?.columns.length ?? 0})
                          </p>
                          <ColTable
                            table={table}
                            tableName={name}
                            highlightCols={commonColKeys}
                          />
                        </div>

                        {/* Usages */}
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">
                            Usado em ({usages.length})
                          </p>
                          <UsageList usages={usages} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trocar candidata a remoção */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Candidata a remover:{' '}
                    <strong className="font-mono">{alert.tables[dropIdx]}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 ml-auto"
                    onClick={() => setCleanupDropIndex(cleanupDropIndex === 0 ? 1 : 0)}
                  >
                    Inverter
                  </Button>
                </div>
              </>
            )}

            {/* ── Tabela única (orphan ou ghost) ── */}
            {!isTwoTable && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {alert.type === 'ghost'
                    ? <Ghost className="h-4 w-4 text-muted-foreground" />
                    : <DatabaseIcon className="h-4 w-4 text-primary" />}
                  <span className="font-mono text-sm font-semibold">{alert.tables[0]}</span>
                </div>

                {singleTable ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">
                        Colunas ({singleTable.columns.length})
                      </p>
                      <ColTable table={singleTable} tableName={alert.tables[0]!} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">
                        Usado em ({(usagesByName.get(alert.tables[0]!) ?? []).length})
                      </p>
                      <UsageList usages={usagesByName.get(alert.tables[0]!) ?? []} />
                    </div>
                  </>
                ) : (
                  <InfoBox variant="danger" title="Tabela não encontrada no schema">
                    Esta tabela é referenciada no código mas não existe no Supabase.
                    Verifique se o nome está correto ou se a tabela foi removida.
                  </InfoBox>
                )}
              </div>
            )}

            {/* Botão de limpeza — apenas para alertas de dois tabelas */}
            {isTwoTable && (
              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={handleOpenCleanupPrompt} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar prompt de limpeza
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DuplicateTableCleanupPromptDialog
        open={cleanupPromptOpen}
        onOpenChange={setCleanupPromptOpen}
        input={cleanupInput}
      />
    </>
  );
}
