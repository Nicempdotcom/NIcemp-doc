/**
 * GitHub Import Page
 *
 * Fluxo completo:
 *   1. Autenticação via Device Flow (sem backend — apenas API do GitHub)
 *   2. Listagem de repositórios do usuário (paginação)
 *   3. Listagem de branches do repositório selecionado
 *   4. Download via API (tree + blob) → ScannedFile[]
 *   5. startAnalysisFromFiles() → mesmo pipeline do Upload ZIP
 *   6. Salvamento no banco de documentação (idêntico ao UploadProject)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Github,
  Loader2,
  Lock,
  LogOut,
  RefreshCcw,
  Search,
  Unlock,
  Database,
  Save,
} from 'lucide-react';

import { useAnalyzer }  from '@/features/analyzer';
import { useAuth }       from '@/app/providers/AuthProvider';
import { Button }        from '@/app/components/ui/button';
import ProcessingScreen  from '@/app/components/upload/ProcessingScreen';
import ProjectMapView    from '@/app/components/upload/ProjectMapView';
import ComparisonSummary from '@/app/components/upload/ComparisonSummary';
import { ROUTES }        from '@/routes';

import {
  gitHubProvider,
  initiateDeviceFlow,
  pollDeviceFlow,
  GitHubSession,
  RepositoryError,
} from '@/services/repositories';
import type { RepoInfo, BranchInfo, GitHubUser, DeviceFlowStart } from '@/services/repositories';

import {
  mapProjectMapToEntities,
  buildVersionSnapshot,
  StorageService,
  ProjectRepository,
  VersionRepository,
  VersionSnapshotRepository,
  DocumentationRepository,
  HistoryRepository,
  ToolCategoryRepository,
  IntegrationRepository,
} from '@/services/storage';
import type { ToolCategoryEntity } from '@/services/storage';
import { VersionComparator, type VersionComparisonResult } from '@/services/comparison';
import { EvolutionEngine } from '@/services/evolution/EvolutionEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Formatação relativa de datas */
function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'agora mesmo';
  if (mins  < 60)  return `${mins}min atrás`;
  if (hours < 24)  return `${hours}h atrás`;
  if (days  < 30)  return `${days}d atrás`;
  return new Date(isoString).toLocaleDateString('pt-BR');
}

/** Cartão de status do salvamento no banco */
function DbSaveStatus({
  dbPhase, counts, error, uploaderEmail,
}: {
  dbPhase: DbPhase;
  counts: SavedCounts | null;
  error: string | null;
  uploaderEmail?: string | null;
}) {
  if (dbPhase === 'idle') return null;
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

/** Mensagem de erro formatada */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5">
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
      <p className="flex-1 text-sm text-destructive leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Device Flow Step ─────────────────────────────────────────────────────────

function DeviceFlowStep({
  flow,
  onSuccess,
  onError,
}: {
  flow: DeviceFlowStart;
  onSuccess: (token: string, user: GitHubUser) => void;
  onError: (msg: string) => void;
}) {
  const [status, setStatus] = useState<'waiting' | 'polling' | 'done'>('waiting');
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  const startPolling = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus('polling');

    pollDeviceFlow(flow.deviceCode, flow.interval)
      .then(async (token) => {
        const user = await gitHubProvider.getUser(token);
        GitHubSession.setToken(token);
        GitHubSession.setUser(user);
        setStatus('done');
        onSuccess(token, user);
      })
      .catch((err) => {
        const msg = err instanceof RepositoryError
          ? err.message
          : (err instanceof Error ? err.message : 'Falha na autenticação.');
        onError(msg);
      });
  }, [flow, onSuccess, onError]);

  const copyCode = () => {
    navigator.clipboard.writeText(flow.userCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Github className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Conectar ao GitHub</h3>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <span className="font-semibold text-foreground step-num">1.</span>{' '}
            Abra o link abaixo no seu navegador:
          </p>
          <a
            href={flow.verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 hover:opacity-80"
          >
            {flow.verificationUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <p className="pt-1">
            <span className="font-semibold text-foreground">2.</span>{' '}
            Insira o código abaixo quando o GitHub solicitar:
          </p>

          <div className="flex items-center gap-3">
            <code className="text-2xl font-mono font-bold tracking-widest text-foreground bg-muted px-4 py-2 rounded-lg select-all">
              {flow.userCode}
            </code>
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : 'Copiar'}
            </Button>
          </div>

          <p className="text-xs">
            O código expira em {Math.ceil(flow.expiresIn / 60)} minutos.
          </p>
        </div>

        {status === 'waiting' && (
          <Button onClick={startPolling} className="w-full gap-2">
            <Github className="h-4 w-4" />
            Já autorizei — aguardar confirmação
          </Button>
        )}

        {status === 'polling' && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Aguardando autorização no GitHub…
          </div>
        )}

        {status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Autenticado com sucesso!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Repo List Step ───────────────────────────────────────────────────────────

function RepoListStep({
  token,
  user,
  onSelect,
  onSignOut,
}: {
  token: string;
  user: GitHubUser;
  onSelect: (repo: RepoInfo) => void;
  onSignOut: () => void;
}) {
  const [repos, setRepos]       = useState<RepoInfo[]>([]);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  const loadRepos = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gitHubProvider.listRepositories(token, p);
      setRepos(result.repos);
      setPage(result.page);
      setHasMore(result.hasMore);
    } catch (err) {
      const msg = err instanceof RepositoryError
        ? err.message
        : (err instanceof Error ? err.message : 'Falha ao carregar repositórios.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadRepos(1); }, [loadRepos]);

  const filtered = repos.filter((r) =>
    search === '' ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl}
          alt={user.login}
          className="h-8 w-8 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.name ?? user.login}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{user.login}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filtrar repositórios…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Repo list */}
      {!loading && (
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'Nenhum repositório encontrado.' : 'Nenhum repositório disponível.'}
            </p>
          )}
          {filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent/50 transition-colors group"
            >
              {repo.isPrivate
                ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                : <Unlock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {repo.fullName}
                  </span>
                  {repo.isPrivate && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Privado
                    </span>
                  )}
                  {repo.language && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {repo.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Atualizado {relativeDate(repo.updatedAt)} · branch padrão: {repo.defaultBranch}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !search && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1 || loading}
            onClick={() => loadRepos(page - 1)}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">Página {page}</span>
          <Button
            variant="outline" size="sm"
            disabled={!hasMore || loading}
            onClick={() => loadRepos(page + 1)}
            className="gap-1.5"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Branch Select Step ───────────────────────────────────────────────────────

function BranchSelectStep({
  token,
  repo,
  onBack,
  onAnalyze,
}: {
  token: string;
  repo: RepoInfo;
  onBack: () => void;
  onAnalyze: (branch: string) => void;
}) {
  const [branches, setBranches]       = useState<BranchInfo[]>([]);
  const [selected, setSelected]       = useState<string>(repo.defaultBranch);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    gitHubProvider.listBranches(token, repo.owner, repo.name)
      .then((data) => {
        setBranches(data);
        const hasDefault = data.some((b) => b.name === repo.defaultBranch);
        setSelected(hasDefault ? repo.defaultBranch : (data[0]?.name ?? ''));
      })
      .catch((err) => {
        const msg = err instanceof RepositoryError
          ? err.message
          : (err instanceof Error ? err.message : 'Falha ao listar branches.');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token, repo]);

  return (
    <div className="space-y-4">
      {/* Back + repo name */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
        <span className="text-sm font-medium text-foreground truncate">{repo.fullName}</span>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">
            Selecione a branch para analisar:
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => setSelected(b.name)}
                className={`
                  w-full flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors
                  ${selected === b.name
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border bg-card text-foreground hover:bg-accent/50'
                  }
                `}
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{b.name}</span>
                {b.name === repo.defaultBranch && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    padrão
                  </span>
                )}
                {b.protected && (
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>

          <Button
            disabled={!selected}
            onClick={() => onAnalyze(selected)}
            className="w-full gap-2"
          >
            <Github className="h-4 w-4" />
            Analisar branch "{selected}"
          </Button>
        </div>
      )}

      {!loading && branches.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma branch encontrada neste repositório.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageStep =
  | 'init-flow'     // Iniciando Device Flow
  | 'device-flow'   // Mostrando código para o usuário
  | 'repos'         // Lista de repositórios
  | 'branches';     // Seleção de branch

export default function GitHubPage() {
  const navigate    = useNavigate();
  const analyzer    = useAnalyzer();
  const { session } = useAuth();

  const {
    phase, pct, label, counts, projectMap, error: analyzerError,
    fileName: analyzerFileName, fileSize: analyzerFileSize,
    startAnalysisFromFiles, cancelAnalysis, reset: resetAnalyzer,
  } = analyzer;

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [token, setToken]     = useState<string | null>(GitHubSession.getToken);
  const [user, setUser]       = useState<GitHubUser | null>(GitHubSession.getUser);
  const [step, setStep]       = useState<PageStep>(() =>
    GitHubSession.isAuthenticated() ? 'repos' : 'init-flow',
  );
  const [deviceFlow, setDeviceFlow]   = useState<DeviceFlowStart | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoInfo | null>(null);
  const [authError, setAuthError]     = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);

  // ── DB save state ───────────────────────────────────────────────────────────
  const [dbPhase,     setDbPhase]     = useState<DbPhase>('idle');
  const [savedCounts, setSavedCounts] = useState<SavedCounts | null>(null);
  const [dbError,     setDbError]     = useState<string | null>(null);
  const [comparison, setComparison]   = useState<VersionComparisonResult | null>(null);
  const didSave = useRef(false);

  // ── Download progress ───────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [downloadLabel, setDownloadLabel] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ── Iniciar Device Flow ─────────────────────────────────────────────────────
  const startDeviceFlow = useCallback(async () => {
    setInitLoading(true);
    setAuthError(null);
    try {
      const flow = await initiateDeviceFlow();
      setDeviceFlow(flow);
      setStep('device-flow');
    } catch (err) {
      const msg = err instanceof RepositoryError
        ? err.message
        : (err instanceof Error ? err.message : 'Falha ao iniciar autenticação.');
      setAuthError(msg);
    } finally {
      setInitLoading(false);
    }
  }, []);

  // ── Autenticação concluída ──────────────────────────────────────────────────
  const handleAuthSuccess = useCallback((newToken: string, newUser: GitHubUser) => {
    setToken(newToken);
    setUser(newUser);
    setStep('repos');
    setDeviceFlow(null);
  }, []);

  // ── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(() => {
    GitHubSession.clear();
    setToken(null);
    setUser(null);
    setStep('init-flow');
    setSelectedRepo(null);
    setDeviceFlow(null);
    setAuthError(null);
  }, []);

  // ── Selecionar repositório ──────────────────────────────────────────────────
  const handleSelectRepo = useCallback((repo: RepoInfo) => {
    setSelectedRepo(repo);
    setStep('branches');
  }, []);

  // ── Analisar branch selecionada ─────────────────────────────────────────────
  const handleAnalyze = useCallback(async (branch: string) => {
    if (!token || !selectedRepo) return;
    setDownloadError(null);
    setDownloading(true);
    setDownloadLabel('Preparando download…');
    didSave.current = false;

    try {
      const files = await gitHubProvider.loadFiles(
        token,
        selectedRepo.owner,
        selectedRepo.name,
        branch,
        (_pct, lbl) => setDownloadLabel(lbl),
      );
      setDownloading(false);
      startAnalysisFromFiles(files, `${selectedRepo.fullName}@${branch}`);
    } catch (err) {
      setDownloading(false);
      const msg = err instanceof RepositoryError
        ? err.message
        : (err instanceof Error ? err.message : 'Falha ao baixar o repositório.');
      setDownloadError(msg);
    }
  }, [token, selectedRepo, startAnalysisFromFiles]);

  // ── Resetar tudo ────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    resetAnalyzer();
    setDbPhase('idle');
    setSavedCounts(null);
    setDbError(null);
    setComparison(null);
    setDownloadError(null);
    setDownloading(false);
    didSave.current = false;
    // Volta para a lista de repos se estiver autenticado
    if (GitHubSession.isAuthenticated()) {
      setStep('repos');
      setSelectedRepo(null);
    }
  }, [resetAnalyzer]);

  // ── Ver comparação de versões ───────────────────────────────────────────────
  const handleViewComparison = () => {
    if (!comparison) return;
    navigate(`${ROUTES.comparison}?from=${comparison.fromVersionId}&to=${comparison.toVersionId}`);
  };

  // ── Auto-save quando análise conclui ────────────────────────────────────────
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

        if (projectMap.toolCategories.length > 0) {
          const now = new Date().toISOString();
          const toolCategoryEntities: ToolCategoryEntity[] = projectMap.toolCategories.map((raw) => ({
            id:        `tool-category:${projectId}:${raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            projectId,
            kind:      'tool-category' as const,
            name:      raw.name,
            toolCount: raw.toolCount,
            createdAt: now,
          }));
          ToolCategoryRepository.saveForProject(projectId, toolCategoryEntities);
        }

        IntegrationRepository.saveForProject(projectId, entities.integrations);

        const newSnapshot = buildVersionSnapshot(projectId, entities.version.id, entities);
        VersionSnapshotRepository.save(newSnapshot);

        if (previousSnapshot) {
          setComparison(VersionComparator.compare(previousSnapshot, newSnapshot));
        }

        try {
          EvolutionEngine.run(projectMap, projectId, entities.version.id);
        } catch (evolErr) {
          console.warn('[EvolutionEngine] Snapshot failed:', evolErr);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: download em progresso (antes do worker)
  if (downloading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">Importar do GitHub</h1>
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center rounded-xl border border-border bg-card p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Baixando repositório…</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">{downloadLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render: worker rodando / falhou / cancelado
  const isWorkerActive = phase !== 'idle' && phase !== 'completed';
  if (isWorkerActive) {
    return (
      <ProcessingScreen
        phase={phase}
        pct={pct}
        label={analyzerError ?? label}
        counts={counts}
        fileName={analyzerFileName}
        fileSize={analyzerFileSize}
        onCancel={cancelAnalysis}
        onReset={handleReset}
      />
    );
  }

  // Render: análise concluída
  if (phase === 'completed' && projectMap) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <p className="text-sm font-semibold text-foreground">Mapa do projeto gerado</p>
          <Button variant="outline" size="sm" onClick={handleReset} className="ml-auto gap-2">
            <RefreshCcw className="h-3.5 w-3.5" />
            Novo projeto
          </Button>
        </div>
        <DbSaveStatus
          dbPhase={dbPhase}
          counts={savedCounts}
          error={dbError}
          uploaderEmail={session?.user?.email}
        />
        {comparison && (
          <ComparisonSummary result={comparison} onViewDetails={handleViewComparison} />
        )}
        <ProjectMapView map={projectMap} />
      </div>
    );
  }

  // ── Render principal (auth / repos / branches) ─────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Importar do GitHub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte sua conta do GitHub para analisar qualquer repositório diretamente.
        </p>
      </div>

      {downloadError && (
        <ErrorBanner message={downloadError} onDismiss={() => setDownloadError(null)} />
      )}

      {/* ── Não autenticado — landing ─────────────────────────────────────── */}
      {step === 'init-flow' && (
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center text-center gap-5">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Github className="h-7 w-7 text-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Conectar ao GitHub</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Autentique-se via Device Flow para acessar seus repositórios públicos e privados.
              O token fica apenas nesta aba — nunca é enviado a servidores externos.
            </p>
          </div>

          {authError && (
            <ErrorBanner message={authError} onDismiss={() => setAuthError(null)} />
          )}

          <Button
            onClick={startDeviceFlow}
            disabled={initLoading}
            className="gap-2"
          >
            {initLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Github className="h-4 w-4" />
            }
            {initLoading ? 'Iniciando…' : 'Conectar com GitHub'}
          </Button>
        </div>
      )}

      {/* ── Device Flow ──────────────────────────────────────────────────── */}
      {step === 'device-flow' && deviceFlow && (
        <DeviceFlowStep
          flow={deviceFlow}
          onSuccess={handleAuthSuccess}
          onError={(msg) => { setAuthError(msg); setStep('init-flow'); }}
        />
      )}

      {/* ── Lista de repositórios ─────────────────────────────────────────── */}
      {step === 'repos' && token && user && (
        <RepoListStep
          token={token}
          user={user}
          onSelect={handleSelectRepo}
          onSignOut={handleSignOut}
        />
      )}

      {/* ── Seleção de branch ─────────────────────────────────────────────── */}
      {step === 'branches' && token && selectedRepo && (
        <BranchSelectStep
          token={token}
          repo={selectedRepo}
          onBack={() => setStep('repos')}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  );
}
