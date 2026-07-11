import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Loader2, CheckCircle2, Database, Save } from 'lucide-react';
import { useUpload }   from '@/features/upload';
import { useAnalyzer } from '@/features/analyzer';
import { useAuth }     from '@/app/providers/AuthProvider';
import {
  mapProjectMapToEntities,
  buildVersionSnapshot,
  StorageService,
  ProjectRepository,
  VersionRepository,
  VersionSnapshotRepository,
  DocumentationRepository,
  HistoryRepository,
} from '@/services/storage';
import { VersionComparator, type VersionComparisonResult } from '@/services/comparison';
import FileDropZone       from './FileDropZone';
import ProcessingScreen   from './ProcessingScreen';
import ProjectMapView     from './ProjectMapView';
import ComparisonSummary  from './ComparisonSummary';
import { Button }         from '@/app/components/ui/button';
import { cn }             from '@/utils';
import { ROUTES }         from '@/routes';

// ─── Reading progress (before worker starts) ──────────────────────────────────

function ReadingOverlay({ pct, fileName }: { pct: number; fileName: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">Lendo arquivo…</p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{fileName}</p>
      </div>
      <div className="w-64">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}

// ─── DB save status ───────────────────────────────────────────────────────────

type DbPhase = 'idle' | 'saving' | 'saved' | 'error';

interface SavedCounts {
  Páginas:      number;
  Componentes:  number;
  Hooks:        number;
  APIs:         number;
  Tabelas:      number;
  Dependências: number;
  Tecnologias:  number;
  Interações:   number;
}

function DbSaveStatus({ dbPhase, counts, error, uploaderEmail }: {
  dbPhase: DbPhase; counts: SavedCounts | null; error: string | null; uploaderEmail?: string | null;
}) {
  if (dbPhase === 'idle')   return null;
  if (dbPhase === 'saving') return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-5 py-3.5">
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <span className="text-sm text-muted-foreground">Salvando no banco de documentação…</span>
    </div>
  );
  if (dbPhase === 'error') return (
    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3.5">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <span className="text-sm text-destructive">{error ?? 'Falha ao salvar no banco.'}</span>
    </div>
  );
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
            .map(([k, n]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span className="font-bold tabular-nums">{n}</span> {k}
              </span>
            ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Salvo localmente em{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">localStorage</code>
        {' '}— nenhum código-fonte foi armazenado.
      </p>
      {uploaderEmail && (
        <p className="text-xs text-muted-foreground">Enviado por {uploaderEmail}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadProject() {
  const upload   = useUpload();
  const analyzer = useAnalyzer();
  const { session } = useAuth();

  const {
    stage, readProgress, fileName, fileSize, error: uploadError,
    processFile, takeBuffer, reset: resetUpload,
  } = upload;

  const {
    phase, pct, label, counts, projectMap, error: analyzerError,
    fileName: workerFileName, fileSize: workerFileSize,
    startAnalysis, cancelAnalysis, reset: resetAnalyzer,
  } = analyzer;

  // ── Auto-start analysis when upload buffer is ready ──────────────────────
  const didStart = useRef(false);

  useEffect(() => {
    if (stage !== 'completed' || upload.zipBuffer === null || phase !== 'idle') return;
    // Guard BEFORE the async-ish takeBuffer() call — if this effect somehow
    // runs twice for the same completed upload (e.g. a duplicate dependency
    // change in the same commit), the ref check below must be the only thing
    // that decides whether we proceed. Relying on takeBuffer()'s return value
    // as the guard is unsafe: the first call already nulls the state, so a
    // second invocation gets `null` back and silently no-ops forever, even
    // though `didStart.current` was already flipped to `true`.
    if (didStart.current) return;
    didStart.current = true;

    // Read the buffer straight from this render's state — `takeBuffer()`
    // updates state via a `setState` updater callback, which React runs
    // asynchronously on the next render. Relying on its return value here
    // always yields `null` (the updater hasn't run yet), which is why the
    // analysis never used to start. We already have the real buffer in
    // `upload.zipBuffer` from the closure; call takeBuffer() only to clear
    // it out of UploadProvider's state (for GC), ignoring its return value.
    const buffer = upload.zipBuffer;
    takeBuffer();
    startAnalysis(buffer, upload.fileName, upload.fileSize);
  }, [stage, upload.zipBuffer, phase]);

  // Reset the didStart guard when returning to idle
  useEffect(() => {
    if (phase === 'idle') didStart.current = false;
  }, [phase]);

  // ── DB auto-save ──────────────────────────────────────────────────────────
  const [dbPhase,     setDbPhase]     = useState<DbPhase>('idle');
  const [savedCounts, setSavedCounts] = useState<SavedCounts | null>(null);
  const [dbError,     setDbError]     = useState<string | null>(null);
  const didSave = useRef(false);
  const navigate = useNavigate();

  // ── Version comparison (EPIC 05) ──────────────────────────────────────────
  const [comparison, setComparison] = useState<VersionComparisonResult | null>(null);

  // ── On-screen error surfacing ──────────────────────────────────────────────
  // Catches anything that would otherwise fail silently (uncaught exceptions,
  // unhandled promise rejections) so the user always sees *something*
  // instead of a drop zone that appears to do nothing.
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const onWindowError = (e: ErrorEvent) => {
      setPageError(e.message || 'Erro inesperado.');
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      setPageError(reason instanceof Error ? reason.message : String(reason ?? 'Erro inesperado.'));
    };
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'completed' || !projectMap || didSave.current) return;
    didSave.current = true;
    setDbPhase('saving');

    Promise.resolve().then(() => {
      try {
        const uploadedBy = session
          ? { id: session.user.id, email: session.user.email ?? '' }
          : null;
        const entities  = mapProjectMapToEntities(projectMap, uploadedBy);
        const projectId = entities.project.id;

        // Capture the previous latest version + its snapshot BEFORE overwriting,
        // so we can diff "last version" vs the one we're about to save.
        const previousVersion  = VersionRepository.findLatest(projectId);
        const previousSnapshot = previousVersion
          ? VersionSnapshotRepository.findByVersion(previousVersion.id)
          : undefined;

        ProjectRepository.save(entities.project);
        VersionRepository.save(entities.version);
        DocumentationRepository.pages.saveMany(entities.pages);
        DocumentationRepository.components.saveMany(entities.components);
        DocumentationRepository.hooks.saveMany(entities.hooks);
        DocumentationRepository.apis.saveMany(entities.apis);
        DocumentationRepository.tables.saveMany(entities.tables);
        DocumentationRepository.interactions.saveMany(entities.interactions);
        DocumentationRepository.importEdges.saveMany(entities.importEdges);
        StorageService.upsertMany('dependencies', entities.dependencies);
        StorageService.upsertMany('technologies', entities.technologies);
        HistoryRepository.append(entities.historyEntry);

        const newSnapshot = buildVersionSnapshot(projectId, entities.version.id, entities);
        VersionSnapshotRepository.save(newSnapshot);

        if (previousSnapshot) {
          setComparison(VersionComparator.compare(previousSnapshot, newSnapshot));
        }

        setSavedCounts({
          Páginas:      entities.pages.length,
          Componentes:  entities.components.length,
          Hooks:        entities.hooks.length,
          APIs:         entities.apis.length,
          Tabelas:      entities.tables.length,
          Dependências: entities.dependencies.length,
          Tecnologias:  entities.technologies.length,
          Interações:   entities.interactions.length,
        });
        setDbPhase('saved');
      } catch (err) {
        setDbError(err instanceof Error ? err.message : 'Erro ao salvar.');
        setDbPhase('error');
      }
    });
  }, [phase, projectMap, session?.user?.id]);

  const handleReset = () => {
    resetUpload();
    resetAnalyzer();
    setDbPhase('idle');
    setSavedCounts(null);
    setDbError(null);
    setComparison(null);
    didSave.current  = false;
    didStart.current = false;
  };

  const handleViewComparison = () => {
    if (!comparison) return;
    navigate(`${ROUTES.comparison}?from=${comparison.fromVersionId}&to=${comparison.toVersionId}`);
  };

  // ── Render: file reading progress (fast, before worker starts) ────────────
  if (stage === 'reading') {
    return <ReadingOverlay pct={readProgress} fileName={fileName} />;
  }

  // ── Render: worker running / failed / cancelled ────────────────────────────
  const isWorkerActive = phase !== 'idle' && phase !== 'completed';

  if (isWorkerActive) {
    return (
      <ProcessingScreen
        phase={phase}
        pct={pct}
        label={analyzerError ?? label}
        counts={counts}
        fileName={workerFileName || fileName}
        fileSize={workerFileSize || fileSize}
        onCancel={cancelAnalysis}
        onReset={handleReset}
      />
    );
  }

  // ── Render: analysis completed — results + DB status ──────────────────────
  if (phase === 'completed' && projectMap) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <p className="text-sm font-semibold text-foreground">Mapa do projeto gerado</p>
          <Button variant="outline" size="sm" onClick={handleReset} className="ml-auto gap-2">
            <RefreshCcw className="h-3.5 w-3.5" />
            Novo projeto
          </Button>
        </div>
        <DbSaveStatus dbPhase={dbPhase} counts={savedCounts} error={dbError} uploaderEmail={session?.user?.email} />
        {comparison && (
          <ComparisonSummary result={comparison} onViewDetails={handleViewComparison} />
        )}
        <ProjectMapView map={projectMap} />
      </div>
    );
  }

  // ── Render: idle / upload error ────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {pageError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Algo deu errado ao processar o arquivo</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed break-words">{pageError}</p>
          </div>
          <Button
            variant="ghost" size="sm" onClick={() => setPageError(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Fechar
          </Button>
        </div>
      )}

      <FileDropZone onFile={processFile} disabled={false} onError={setPageError} />

      {stage === 'error' && uploadError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Arquivo inválido</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{uploadError.message}</p>
          </div>
          <Button
            variant="ghost" size="sm" onClick={handleReset}
            className="shrink-0 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
