import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, Layers, Zap, Globe, Table as TableIcon, Package, GitBranch, History, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import Section from '@/app/components/docs/Section';
import InfoBox from '@/app/components/docs/InfoBox';
import { Badge } from '@/app/components/ui/badge';
import {
  ProjectRepository,
  VersionRepository,
  TechnologyRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';

const STAT_ITEMS: { key: 'totalFiles' | 'pages' | 'components' | 'hooks' | 'apis' | 'tables' | 'dependencies' | 'technologies'; label: string; icon: React.ElementType }[] = [
  { key: 'totalFiles',   label: 'Arquivos',     icon: Package    },
  { key: 'pages',        label: 'Páginas',      icon: FileText   },
  { key: 'components',   label: 'Componentes',  icon: Layers     },
  { key: 'hooks',        label: 'Hooks',        icon: Zap        },
  { key: 'apis',         label: 'APIs',         icon: Globe      },
  { key: 'tables',       label: 'Tabelas',      icon: TableIcon  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Overview page for the imported project itself — entirely generated from
 * the ProjectEntity/VersionEntity/TechnologyEntity documentation database.
 * No manually written content (EPIC 08 Portal Oficial).
 */
export default function Project() {
  const [searchParams] = useSearchParams();
  const projects = useMemo(() => ProjectRepository.findAll(), []);
  const project = useMemo(() => {
    const id = searchParams.get('id');
    return (id && ProjectRepository.findById(id)) || ProjectRepository.findLatest();
  }, [searchParams, projects.length]);

  const versions = useMemo(() => (project ? VersionRepository.findByProject(project.id) : []), [project]);
  const technologies = useMemo(() => (project ? TechnologyRepository.findByProject(project.id) : []), [project]);
  const latestVersion = versions[0];

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader title="Projeto" description="Visão geral gerada automaticamente a partir do banco de documentação." badge="EPIC 08" badgeVariant="info" />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para gerar a documentação do projeto.
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title={project.rootName}
        description="Visão geral do projeto, gerada automaticamente a partir do banco de documentação."
        badge={latestVersion?.name ?? 'sem versão'}
        badgeVariant="info"
      />

      <div className="bg-card border border-card-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Nome</span>
            <span className="text-sm font-medium text-foreground">{project.rootName}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Gerenciador de Pacotes</span>
            <span className="text-sm font-medium text-foreground">{project.packageManager}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Versão Atual</span>
            <span className="text-sm font-medium text-foreground">{latestVersion?.name ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Última Análise</span>
            <span className="text-sm font-medium text-foreground">{latestVersion ? formatDate(latestVersion.snapshotAt) : '—'}</span>
          </div>
        </div>
      </div>

      <Section title="Estatísticas do Projeto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-1">
              <Icon className="h-4 w-4 text-primary mb-1" />
              <div className="text-2xl font-bold text-foreground">{project.stats[key]}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stack Tecnológica" description="Extraída automaticamente das dependências do projeto.">
        {technologies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tecnologia detectada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {technologies.map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs font-normal gap-1.5">
                {t.name}{t.version ? ` · ${t.version}` : ''}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title="Versões" description="Todas as análises registradas para este projeto.">
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma versão registrada.</p>
        ) : (
          <div className="space-y-2">
            {versions.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{v.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(v.snapshotAt)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {v.stats.pages} páginas · {v.stats.components} componentes · {v.stats.apis} APIs
                </span>
              </div>
            ))}
          </div>
        )}
        <Link to={ROUTES.history} className="inline-flex items-center gap-1.5 text-sm text-primary mt-3 hover:underline">
          <History className="h-3.5 w-3.5" />
          Ver histórico completo
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Section>
    </div>
  );
}
