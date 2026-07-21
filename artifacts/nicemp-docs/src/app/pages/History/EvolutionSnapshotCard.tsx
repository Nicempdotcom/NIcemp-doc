/**
 * EvolutionSnapshotCard
 *
 * Timeline card for the Evolution Engine. Displays one project snapshot with
 * its architectural score, file count, and — when a change record exists —
 * the diff stats (added/removed/modified files) and impacted modules.
 */

import React, { useState } from 'react';
import {
  TrendingUp, FileStack, Plus, Minus, RefreshCw,
  ChevronDown, ChevronUp, GitBranch, Layers,
} from 'lucide-react';
import { Badge }   from '@/app/components/ui/badge';
import { Button }  from '@/app/components/ui/button';
import { cn }      from '@/utils';
import { formatDate } from '@/utils/formatDate';
import type { ProjectSnapshotEntity, ProjectChangeEntity, VersionEntity } from '@/services/storage/types';

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
    score >= 50 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-500/10 text-red-700 dark:text-red-400';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', color)}>
      <TrendingUp className="h-3 w-3" />
      Score {score}/100
    </span>
  );
}

// ─── Change pill ──────────────────────────────────────────────────────────────

function ChangePill({ count, kind }: { count: number; kind: 'added' | 'removed' | 'modified' }) {
  if (count === 0) return null;
  const styles = {
    added:    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    removed:  'bg-red-500/10 text-red-600 dark:text-red-400',
    modified: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  };
  const Icon = kind === 'added' ? Plus : kind === 'removed' ? Minus : RefreshCw;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', styles[kind])}>
      <Icon className="h-3 w-3" />
      {count} {kind === 'added' ? 'adicionado' : kind === 'removed' ? 'removido' : 'modificado'}{count !== 1 ? 's' : ''}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvolutionSnapshotCardProps {
  snapshot:  ProjectSnapshotEntity;
  change:    ProjectChangeEntity | null;
  version:   VersionEntity | undefined;
  isLatest:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EvolutionSnapshotCard({
  snapshot, change, version, isLatest,
}: EvolutionSnapshotCardProps) {
  const [open, setOpen] = useState(false);

  const totalDiff = change ? change.added + change.removed + change.modified : 0;

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <span className={cn(
        'absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
        isLatest ? 'border-primary bg-primary/15' : 'border-border bg-card',
      )}>
        <span className={cn('h-2 w-2 rounded-full', isLatest ? 'bg-primary' : 'bg-muted-foreground/50')} />
      </span>

      <div className="rounded-lg border border-card-border bg-card p-4 mb-4">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {version?.name ?? snapshot.versionId.slice(-8)}
              </span>
              {isLatest && (
                <Badge className="bg-primary/10 text-primary border-transparent hover:bg-primary/10 text-[10px]">
                  Mais recente
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(snapshot.createdAt, { withTime: true })}
            </p>
          </div>

          <Button
            variant="outline" size="sm"
            onClick={() => setOpen((v) => !v)}
            className="gap-1.5 shrink-0"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? 'Fechar' : 'Detalhes'}
          </Button>
        </div>

        {/* Score + stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ScoreBadge score={snapshot.architecturalScore} />

          <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            <FileStack className="h-3 w-3" />
            {snapshot.fileCount} arquivo{snapshot.fileCount !== 1 ? 's' : ''}
          </span>

          {/* Diff pills — only when a change record exists */}
          {change && totalDiff > 0 && (
            <>
              <ChangePill count={change.added}    kind="added"    />
              <ChangePill count={change.removed}  kind="removed"  />
              <ChangePill count={change.modified} kind="modified" />
            </>
          )}

          {!change && (
            <span className="text-xs text-muted-foreground italic">Primeira análise</span>
          )}
        </div>

        {/* Impacted modules row */}
        {change && change.impactedModules.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Módulos:</span>
            {change.impactedModules.map((m) => (
              <span key={m} className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Expandable detail: per-file changes */}
        {open && change && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Arquivos alterados ({change.changes.length})
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {change.changes.map((c) => {
                const kindColor =
                  c.kind === 'added'    ? 'text-emerald-600 dark:text-emerald-400' :
                  c.kind === 'removed'  ? 'text-red-600 dark:text-red-400' :
                                          'text-blue-600 dark:text-blue-400';
                const KindIcon = c.kind === 'added' ? Plus : c.kind === 'removed' ? Minus : RefreshCw;
                return (
                  <div key={c.path} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30">
                    <KindIcon className={cn('h-3 w-3 shrink-0', kindColor)} />
                    <span className="text-xs font-mono text-muted-foreground truncate flex-1 min-w-0" title={c.path}>
                      {c.path}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{c.category}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {open && !change && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Esta é a primeira análise registrada pelo Evolution Engine — sem versão anterior para comparar.
            </p>
            <p className="text-xs text-muted-foreground mt-1">{snapshot.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
