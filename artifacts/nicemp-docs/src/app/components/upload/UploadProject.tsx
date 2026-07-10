import React, { useEffect, useState } from 'react';
import {
  AlertCircle, RefreshCcw, Scan, Loader2, CheckCircle2,
  Database, Save, ChevronRight,
} from 'lucide-react';
import { useUpload }                        from '@/features/upload';
import { useAnalyzer, PHASE_LABELS }        from '@/features/analyzer';
import {
  mapProjectMapToEntities,
  StorageService,
  ProjectRepository,
  VersionRepository,
  DocumentationRepository,
  HistoryRepository,
} from '@/services/storage';
import FileDropZone      from './FileDropZone';
import ProgressBar       from './ProgressBar';
import StageIndicator    from './StageIndicator';
import ZipSummary        from './ZipSummary';
import ProjectMapView    from './ProjectMapView';
import { Button }        from '@/app/components/ui/button';
import { cn }            from '@/utils';

// ─── Analysis progress strip ──────────────────────────────────────────────────

function AnalysisProgress() {
  const { phase, progress } = useAnalyzer();

  const phaseSteps = [
    'scanning', 'categorizing', 'dependencies', 'technology', 'building',
  ] as const;
  const currentIdx = phaseSteps.indexOf(phase as never);

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">
          {PHASE_LABELS[phase]} — analisando projeto…
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{progress}%</span>
      </div>

      <ProgressBar value={progress} />

      <div className="flex items-center gap-1 overflow-x-auto pt-1">
        {phaseSteps.map((step, i) => {
          const isDone   = currentIdx > i;
          const isActive = currentIdx === i;
          return (
            <React.Fragment key={step}>
              <div className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-colors',
                isDone   && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                isActive && 'bg-primary/15 text-primary',
                !isDone && !isActive && 'bg-muted text-muted-foreground',
              )}>
                {isDone && '✓ '}{PHASE_LABELS[step]}
              </div>
              {i < phaseSteps.length - 1 && (
                <div className={cn('h-px flex-1 min-w-[8px] transition-colors', isDone ? 'bg-emerald-500' : 'bg-border')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── DB save status card ──────────────────────────────────────────────────────

type DbPhase = 'idle' | 'saving' | 'saved' | 'error';

interface SavedCounts {
  Páginas:      number;
  Componentes:  number;
  Hooks:        number;
  APIs:         number;
  Tabelas:      number;
  Dependências: number;
  Tecnologias:  number;
}

function DbSaveStatus({
  dbPhase,
  counts,
  error,
}: {
  dbPhase: DbPhase;
  counts: SavedCounts | null;
  error: string | null;
}) {
  if (dbPhase === 'idle') return null;

  if (dbPhase === 'saving') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <span className="text-sm text-muted-foreground">Salvando no banco de documentação…</span>
      </div>
    );
  }

  if (dbPhase === 'error') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="text-sm text-destructive">{error ?? 'Falha ao salvar no banco.'}</span>
      </div>
    );
  }

  // saved
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Banco de documentação atualizado
        </span>
        <Save className="h-3.5 w-3.5 ml-auto text-emerald-500 shrink-0" />
      </div>

      {counts && (
        <div className="flex flex-wrap gap-2">
          {(Object.entries(counts) as [string, number][])
            .filter(([, n]) => n > 0)
            .map(([label, n]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                <span className="font-bold tabular-nums">{n}</span>
                {label}
              </span>
            ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Dados salvos localmente em{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">localStorage</code>
        {' '}— nenhum código-fonte foi armazenado.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadProject() {
  const upload   = useUpload();
  const analyzer = useAnalyzer();

  const { stage, progress, zip, error, processFile, takeBuffer, reset: resetUpload } = upload;
  const { phase, projectMap, error: analysisError, startAnalysis, reset: resetAnalysis } = analyzer;

  const [dbPhase,     setDbPhase]     = useState<DbPhase>('idle');
  const [savedCounts, setSavedCounts] = useState<SavedCounts | null>(null);
  const [dbError,     setDbError]     = useState<string | null>(null);

  // ── Auto-save to DB after analysis ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'completed' || !projectMap || dbPhase !== 'idle') return;

    setDbPhase('saving');

    // Use a microtask to let the UI render the saving state first
    Promise.resolve().then(() => {
      try {
        const entities = mapProjectMapToEntities(projectMap);

        // Persist all entity groups
        ProjectRepository.save(entities.project);
        VersionRepository.save(entities.version);
        DocumentationRepository.pages.saveMany(entities.pages);
        DocumentationRepository.components.saveMany(entities.components);
        DocumentationRepository.hooks.saveMany(entities.hooks);
        DocumentationRepository.apis.saveMany(entities.apis);
        DocumentationRepository.tables.saveMany(entities.tables);
        StorageService.upsertMany('dependencies', entities.dependencies);
        StorageService.upsertMany('technologies', entities.technologies);
        HistoryRepository.append(entities.historyEntry);

        setSavedCounts({
          Páginas:      entities.pages.length,
          Componentes:  entities.components.length,
          Hooks:        entities.hooks.length,
          APIs:         entities.apis.length,
          Tabelas:      entities.tables.length,
          Dependências: entities.dependencies.length,
          Tecnologias:  entities.technologies.length,
        });
        setDbPhase('saved');
      } catch (err) {
        setDbError(err instanceof Error ? err.message : 'Erro ao salvar no banco.');
        setDbPhase('error');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, projectMap]);

  const isUploading     = stage === 'reading' || stage === 'analyzing';
  const isAnalyzing     = phase !== 'idle' && phase !== 'completed' && phase !== 'failed';
  const showDropZone    = (stage === 'idle' || stage === 'error') && phase === 'idle';
  const showAnalyzeBtn  = stage === 'completed' && phase === 'idle';

  const handleAnalyze = async () => {
    const buffer = takeBuffer(); // wipes ZIP from upload state immediately
    if (!buffer) return;
    await startAnalysis(buffer); // buffer consumed + released by engine
  };

  const handleReset = () => {
    resetUpload();
    resetAnalysis();
    setDbPhase('idle');
    setSavedCounts(null);
    setDbError(null);
  };

  return (
    <div className="space-y-6">

      {/* Drop zone */}
      {showDropZone && (
        <FileDropZone onFile={processFile} disabled={isUploading} />
      )}

      {/* Upload stage tracker */}
      {stage !== 'idle' && phase === 'idle' && (
        <StageIndicator current={stage} />
      )}

      {/* Upload progress bar */}
      {isUploading && (
        <ProgressBar
          value={progress}
          label={stage === 'reading' ? 'Lendo arquivo…' : 'Validando estrutura…'}
        />
      )}

      {/* ZIP summary + analyze button */}
      {stage === 'completed' && zip && phase === 'idle' && (
        <div className="space-y-4">
          <ProgressBar value={100} variant="success" />
          <ZipSummary zip={zip} />
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RefreshCcw className="h-3.5 w-3.5" />
              Enviar outro
            </Button>
            <Button size="sm" onClick={handleAnalyze} className="gap-2">
              <Scan className="h-4 w-4" />
              Analisar Projeto
            </Button>
          </div>
        </div>
      )}

      {/* Upload error */}
      {stage === 'error' && error && phase === 'idle' && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Falha no upload</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{error.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0 text-muted-foreground hover:text-foreground gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Analysis running */}
      {isAnalyzing && <AnalysisProgress />}

      {/* Analysis error */}
      {phase === 'failed' && analysisError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Falha na análise</p>
            <p className="text-sm text-muted-foreground mt-0.5">{analysisError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground">
            <RefreshCcw className="h-3.5 w-3.5" />
            Recomeçar
          </Button>
        </div>
      )}

      {/* Analysis completed: project map + DB save status */}
      {phase === 'completed' && projectMap && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Mapa do projeto gerado</p>
            <Button variant="outline" size="sm" onClick={handleReset} className="ml-auto gap-2">
              <RefreshCcw className="h-3.5 w-3.5" />
              Novo projeto
            </Button>
          </div>

          {/* DB save status (auto-triggered) */}
          <DbSaveStatus dbPhase={dbPhase} counts={savedCounts} error={dbError} />

          <ProjectMapView map={projectMap} />
        </div>
      )}
    </div>
  );
}
