import React, { useMemo, useState } from 'react';
import { Search, FileText, Layers, Zap, Globe2, Database, Share2, ExternalLink } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, InteractionsDisclosure } from '@/app/components/docs';
import StatusBadge from '@/app/components/docs/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  ProjectRepository,
  PageRepository,
  ComponentRepository,
  HookRepository,
  ApiRepository,
  InteractionRepository,
  VersionRepository,
  VersionSnapshotRepository,
} from '@/services/storage';
import { matchPageByPath, type UrlMatchResult } from '@/services/exploration/urlMatch';
import type { PageEntity } from '@/services/storage/types';
import { DependencyGraph, type NodeCategory } from '@/services/graph/DependencyGraph';
import GeneratePromptButton from '@/app/components/prompts/GeneratePromptButton';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';

const CATEGORY_ICON: Record<NodeCategory, React.ComponentType<{ className?: string }>> = {
  page:      FileText,
  component: Layers,
  hook:      Zap,
  api:       Globe2,
  table:     Database,
};

const CATEGORY_LABEL: Record<NodeCategory, string> = {
  page:      'Página',
  component: 'Componente',
  hook:      'Hook',
  api:       'API',
  table:     'Tabela',
};

/**
 * Explorador ao vivo — cole a URL de uma tela em produção e veja o rastreio
 * completo: arquivo da página, módulo, rota, componentes, hooks, APIs,
 * interações e dependências reais (EPIC 10).
 *
 * Matching is approximate: it compares the URL's path against each
 * detected page's inferred route, which works best for conventional
 * file/folder routing. It will not resolve custom routers, rewrites,
 * or server-side redirects.
 */
export default function Explorer() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const pages = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const components = useMemo(() => (project ? ComponentRepository.findByProject(project.id) : []), [project]);
  const hooks = useMemo(() => (project ? HookRepository.findByProject(project.id) : []), [project]);
  const apis = useMemo(() => (project ? ApiRepository.findByProject(project.id) : []), [project]);
  const interactions = useMemo(() => (project ? InteractionRepository.findByProject(project.id) : []), [project]);
  const nameIndex = useMemo(() => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()), [project]);

  const latestVersion = useMemo(() => (project ? VersionRepository.findLatest(project.id) : undefined), [project]);
  const snapshot = useMemo(
    () => (latestVersion ? VersionSnapshotRepository.findByVersion(latestVersion.id) : undefined),
    [latestVersion],
  );
  const graph = useMemo(() => (snapshot ? DependencyGraph.build(snapshot) : null), [snapshot]);

  const [urlInput, setUrlInput] = useState('');
  const [result, setResult] = useState<UrlMatchResult | null>(null);

  const handleExplore = () => {
    if (!urlInput.trim()) return;
    const matched = matchPageByPath(urlInput.trim(), pages);
    setResult(matched);
  };

  const moduleDataFor = (page: PageEntity) => ({
    components: components.filter((c) => c.module === page.module),
    hooks: hooks.filter((h) => h.module === page.module),
    apis: apis.filter((a) => a.module === page.module),
    interactions: interactions.filter((i) => i.module === page.module),
  });

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader
          title="Explorador ao vivo"
          description="Cole a URL de uma tela em produção e veja o que o NicEmp Docs sabe sobre ela."
          badge="EPIC 10"
          badgeVariant="info"
        />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      </div>
    );
  }

  const matched = result?.exact ?? null;
  const matchedData = matched ? moduleDataFor(matched) : null;
  const matchedNeighbors = matched && graph ? DependencyGraph.getNeighbors(graph, matched.id) : [];

  return (
    <div className="w-full">
      <PageHeader
        title="Explorador ao vivo"
        description="Cole a URL de uma tela em produção e veja o rastreio completo — arquivo, módulo, rota, componentes, hooks, APIs e interações."
        badge="EPIC 10"
        badgeVariant="info"
      />

      <Section title="Buscar por URL" description="Funciona melhor com roteamento convencional por pastas/arquivos (ex.: pages/, app/.../page.tsx). Rotas customizadas, redirects e reescritas podem não ser encontrados.">
        <div className="flex gap-2 max-w-xl">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleExplore(); }}
            placeholder="https://meuapp.com/pedidos/123"
            className="flex-1"
          />
          <Button onClick={handleExplore} className="gap-2">
            <Search className="h-4 w-4" /> Explorar
          </Button>
        </div>
      </Section>

      {result && (
        <>
          {matched && matchedData && (
            <Section title="Página encontrada" description={`Correspondência para o caminho "${result.path}".`}>
              <div className="rounded-lg border border-border p-5 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{matched.name}</span>
                  <StatusBadge status={matched.status} />
                </div>
                <div className="text-xs text-muted-foreground font-mono mb-3 truncate" title={matched.location}>{matched.location}</div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] font-normal">Módulo: {matched.module}</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal font-mono">Rota: {matched.route || '—'}</Badge>
                  <GeneratePromptButton
                    kind="page"
                    name={matched.name}
                    location={matched.location}
                    module={matched.module}
                    riskLevel={matched.riskLevel}
                    dependencies={resolveNames(
                      [...matched.relationships, ...matched.components, ...matched.hooks, ...matched.apis],
                      nameIndex,
                    )}
                    details={{ Rota: matched.route || '—', Status: matched.status }}
                  />
                  <a
                    href={urlInput}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir página em nova aba
                  </a>
                </div>
                <InteractionsDisclosure interactions={matchedData.interactions} emptyLabel="Nenhuma interação detectada nesta tela." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <Layers className="h-4 w-4 text-primary mb-1" />
                  <div className="text-2xl font-bold text-foreground">{matchedData.components.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Componentes do módulo</div>
                </div>
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <Zap className="h-4 w-4 text-primary mb-1" />
                  <div className="text-2xl font-bold text-foreground">{matchedData.hooks.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Hooks do módulo</div>
                </div>
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <Globe2 className="h-4 w-4 text-primary mb-1" />
                  <div className="text-2xl font-bold text-foreground">{matchedData.apis.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">APIs do módulo</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Dependências reais (mesmo módulo)</span>
                </div>
                {matchedNeighbors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma entidade relacionada encontrada no grafo de dependências.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {matchedNeighbors.map((n) => {
                      const Icon = CATEGORY_ICON[n.category];
                      return (
                        <div key={n.id} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{n.name}</span>
                            <span className="text-xs text-muted-foreground font-mono truncate" title={n.location}>{n.location}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-normal shrink-0">{CATEGORY_LABEL[n.category]}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>
          )}

          {!matched && (
            <Section title="Nenhuma correspondência exata" description={`Não encontramos uma página cuja rota inferida bata com "${result.path}".`}>
              {result.suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma página parecida foi encontrada.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">Páginas parecidas:</p>
                  {result.suggestions.map(({ page, score }) => (
                    <div key={page.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{page.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{page.route || '—'}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-normal">{Math.round(score * 100)}% parecido</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {!result && (
        <InfoBox variant="info" title="Como funciona">
          Cole a URL de uma tela em produção, extraímos o caminho (ex.: /pedidos/123) e comparamos com as rotas inferidas de cada página detectada no projeto. Quando há correspondência, mostramos o arquivo responsável pela rota, o módulo ao qual pertence, e todas as entidades relacionadas — componentes, hooks, APIs e interações. Quando não há correspondência exata, mostramos as páginas mais parecidas.
        </InfoBox>
      )}
    </div>
  );
}
