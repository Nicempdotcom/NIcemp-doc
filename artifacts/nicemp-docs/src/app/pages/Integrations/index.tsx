import React, { useMemo, useState } from 'react';
import { Plug, CheckCircle2, AlertCircle, FileCode2, Key, ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import InfoBox from '@/app/components/docs/InfoBox';
import { ProjectRepository, IntegrationRepository } from '@/services/storage';
import type { IntegrationEntity, IntegrationCategory } from '@/services/storage';
import { INTEGRATION_CATEGORY_LABELS } from '@/services/engine/types';

// ─── Category badge colors ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<IntegrationCategory, string> = {
  payments:   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  database:   'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  auth:       'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  storage:    'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  email:      'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  ai:         'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  analytics:  'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  monitoring: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  messaging:  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  graphql:    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  state:      'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  other:      'bg-muted text-muted-foreground border-border',
};

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration }: { integration: IntegrationEntity }) {
  const [expanded, setExpanded] = useState(false);
  const hasFiles = integration.usedInFiles.length > 0;
  const hasEnvDetected = integration.detectedEnvVars.length > 0;
  const missingEnvVars = integration.expectedEnvVars.filter(
    (v) => !integration.detectedEnvVars.includes(v),
  );

  const fileCount = integration.usedInFiles.length;

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Plug className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-foreground text-sm">{integration.name}</span>
            {integration.version && (
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                v{integration.version}
              </span>
            )}
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[integration.category]}`}>
              {INTEGRATION_CATEGORY_LABELS[integration.category]}
            </span>
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${
              integration.confidence === 'high'
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
            }`}>
              {integration.confidence === 'high' ? 'Confirmado' : 'Provável'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-mono">{integration.packageName}</p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 mt-2">
            {hasFiles && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileCode2 className="h-3 w-3" />
                {fileCount} arquivo{fileCount !== 1 ? 's' : ''}
              </span>
            )}
            {hasEnvDetected && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {integration.detectedEnvVars.length} var{integration.detectedEnvVars.length !== 1 ? 's' : ''} detectada{integration.detectedEnvVars.length !== 1 ? 's' : ''}
              </span>
            )}
            {missingEnvVars.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="h-3 w-3" />
                {missingEnvVars.length} var{missingEnvVars.length !== 1 ? 's' : ''} esperada{missingEnvVars.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {(hasFiles || integration.expectedEnvVars.length > 0) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {/* Files */}
          {hasFiles && (
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Arquivos que usam esta integração
              </p>
              <div className="space-y-1">
                {integration.usedInFiles.slice(0, 12).map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <FileCode2 className="h-3 w-3 shrink-0 text-primary/60" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
                {integration.usedInFiles.length > 12 && (
                  <p className="text-xs text-muted-foreground pl-4">
                    + {integration.usedInFiles.length - 12} outros arquivos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Env vars */}
          {integration.expectedEnvVars.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Variáveis de ambiente
              </p>
              <div className="space-y-1">
                {integration.expectedEnvVars.map((v) => {
                  const found = integration.detectedEnvVars.includes(v);
                  return (
                    <div key={v} className="flex items-center gap-2 text-xs font-mono">
                      {found ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                      ) : (
                        <Key className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className={found ? 'text-foreground' : 'text-muted-foreground'}>{v}</span>
                      {found && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-sans">encontrada</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────

const ALL_CATEGORIES: IntegrationCategory[] = [
  'payments', 'auth', 'database', 'ai', 'storage', 'email',
  'analytics', 'monitoring', 'messaging', 'graphql', 'state', 'other',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>('all');

  const project = useMemo(() => ProjectRepository.findLatest(), []);

  // Load integrations from IntegrationRepository, scoped to the latest project
  const integrations: IntegrationEntity[] = useMemo(() => {
    if (!project) return [];
    return IntegrationRepository.findByProject(project.id);
  }, [project]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return integrations;
    return integrations.filter((i) => i.category === activeCategory);
  }, [integrations, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<IntegrationCategory, number>> = {};
    for (const i of integrations) {
      counts[i.category] = (counts[i.category] ?? 0) + 1;
    }
    return counts;
  }, [integrations]);

  const totalEnvDetected = useMemo(
    () => integrations.reduce((s, i) => s + i.detectedEnvVars.length, 0),
    [integrations],
  );

  const activeCategories = ALL_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0);

  return (
    <div className="w-full">
      <PageHeader
        title="Integrações"
        description="Serviços externos detectados automaticamente a partir das dependências e código-fonte do projeto."
        badge="Engine"
        badgeVariant="info"
      />

      {!project || integrations.length === 0 ? (
        <InfoBox variant="tip" title="Nenhuma integração detectada">
          Envie um arquivo ZIP na tela de Upload para detectar integrações externas automaticamente
          (Stripe, Supabase, OpenAI, Clerk, AWS e outros).
        </InfoBox>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{integrations.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Integrações</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{activeCategories.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Categorias</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{totalEnvDetected}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Vars detectadas</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {integrations.filter((i) => i.confidence === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Confirmadas</div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory('all')}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              Todas ({integrations.length})
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {INTEGRATION_CATEGORY_LABELS[cat]} ({categoryCounts[cat]})
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
