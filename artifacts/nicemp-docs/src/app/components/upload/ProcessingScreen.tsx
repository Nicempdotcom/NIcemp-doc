import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2, XCircle, AlertCircle, RefreshCcw,
  FileArchive, Clock, File, Layers, Hook,
  Server, Database, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn }     from '@/utils';
import type { AnalysisPhase, LiveCounts } from '@/features/analyzer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes === 0)          return '—';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 ** 2)    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function fmtElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${m}m ${String(s).padStart(2, '0')}s`
    : `${s}s`;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, indeterminate }: { value: number; indeterminate?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      {indeterminate ? (
        <div className="h-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  );
}

// ─── Live count chip ──────────────────────────────────────────────────────────

function CountChip({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors',
      highlight && value > 0
        ? 'border-primary/30 bg-primary/5'
        : 'border-border bg-card',
    )}>
      <Icon className={cn('h-4 w-4', value > 0 ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn(
        'text-xl font-bold tabular-nums leading-none',
        value > 0 ? 'text-foreground' : 'text-muted-foreground/40',
      )}>
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ─── Processing screen ────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  phase:    AnalysisPhase;
  pct:      number;
  label:    string;
  counts:   LiveCounts;
  fileName: string;
  fileSize: number;
  onCancel: () => void;
  onReset:  () => void;
}

export default function ProcessingScreen({
  phase, pct, label, counts, fileName, fileSize, onCancel, onReset,
}: ProcessingScreenProps) {
  // ── Elapsed time ──────────────────────────────────────────────────────────
  const startRef    = useRef<number>(Date.now());
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (phase === 'completed' || phase === 'failed' || phase === 'cancelled') return;
    startRef.current = Date.now();
    setSecs(0);
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'idle']);   // restart timer on new session only

  const isRunning   = phase !== 'idle' && phase !== 'completed' && phase !== 'failed' && phase !== 'cancelled';
  const isFailed    = phase === 'failed';
  const isCancelled = phase === 'cancelled';
  const isFinished  = phase === 'completed';

  const showIndeterminate = pct <= 4 && isRunning;

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">

        {/* Header icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          {isRunning && (
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isFailed && (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          )}
          {isCancelled && (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {isFinished && (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isRunning   && 'Analisando projeto'}
              {isFailed    && 'Falha na análise'}
              {isCancelled && 'Análise cancelada'}
              {isFinished  && 'Análise concluída'}
            </h2>
            {isRunning && (
              <p className="mt-1 text-sm text-muted-foreground">
                O processamento ocorre em segundo plano — a interface continua responsiva
              </p>
            )}
          </div>
        </div>

        {/* File info */}
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium text-foreground">{fileName || 'arquivo.zip'}</span>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{fmtSize(fileSize)}</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Tempo decorrido:</span>
            <span className="font-mono font-medium text-foreground">{fmtElapsed(secs)}</span>
          </div>
        </div>

        {/* Current label + progress bar */}
        {(isRunning || isFinished) && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate pr-4">{label}</span>
              {!showIndeterminate && (
                <span className="shrink-0 tabular-nums text-foreground font-medium">{pct}%</span>
              )}
            </div>
            <ProgressBar value={pct} indeterminate={showIndeterminate} />
          </div>
        )}

        {/* Error message */}
        {(isFailed || isCancelled) && label && (
          <div className={cn(
            'rounded-lg border px-4 py-3 text-sm leading-relaxed',
            isFailed
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-muted text-muted-foreground',
          )}>
            {label}
          </div>
        )}

        {/* Live entity counts */}
        {(isRunning || isFinished) && (
          <div>
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Identificados até agora
            </p>
            <div className="grid grid-cols-5 gap-2">
              <CountChip icon={File}     label="Páginas"     value={counts.pages}      highlight />
              <CountChip icon={Layers}   label="Componentes" value={counts.components}  highlight />
              <CountChip icon={Hook}     label="Hooks"       value={counts.hooks}       highlight />
              <CountChip icon={Server}   label="APIs"        value={counts.apis}        highlight />
              <CountChip icon={Database} label="Tabelas"     value={counts.tables}      highlight />
            </div>
            {counts.filesTotal > 0 && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {counts.filesScanned} de {counts.filesTotal.toLocaleString('pt-BR')} arquivos processados
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          {isRunning && (
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelar análise
            </Button>
          )}
          {(isFailed || isCancelled) && (
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reiniciar análise
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
