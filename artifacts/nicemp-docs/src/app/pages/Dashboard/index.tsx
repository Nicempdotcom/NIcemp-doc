/**
 * NavigationHome — Tela inicial com cards de navegação.
 * Substitui o Dashboard analytics por uma grade de cards
 * organizada por seções, com acesso ao projeto ativo no topo.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Github, FolderKanban, Network, Search, BookOpen,
  History, GitCompare, AlertTriangle, Monitor, Server, Database,
  Layers, Zap, Globe, Package, Plug, Bot, Settings, ArrowRight,
  Sparkles, FileStack,
} from 'lucide-react';
import { ROUTES }             from '@/routes';
import { ProjectRepository }  from '@/services/storage';

// ─── Dados das seções de navegação ───────────────────────────────────────────

const SECTIONS = [
  {
    group: 'Importar & Analisar',
    accent: 'from-violet-500/20 to-indigo-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/10 group-hover:bg-violet-500/20',
    items: [
      {
        label: 'Upload de ZIP',
        icon: UploadCloud,
        href: ROUTES.upload,
        description: 'Envie um arquivo ZIP do projeto para análise automática',
      },
      {
        label: 'Importar do GitHub',
        icon: Github,
        href: ROUTES.github,
        description: 'Analise qualquer repositório diretamente do GitHub',
      },
    ],
  },
  {
    group: 'Visão Geral',
    accent: 'from-sky-500/20 to-cyan-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/10 group-hover:bg-sky-500/20',
    items: [
      {
        label: 'Projeto',
        icon: FolderKanban,
        href: ROUTES.project,
        description: 'Resumo e detalhes do projeto atual',
      },
      {
        label: 'Organograma',
        icon: Network,
        href: ROUTES.overview,
        description: 'Estrutura visual do projeto em fluxo',
      },
      {
        label: 'Explorador ao vivo',
        icon: Search,
        href: ROUTES.explorer,
        description: 'Busca semântica no código-fonte',
      },
      {
        label: 'Glossário',
        icon: BookOpen,
        href: ROUTES.glossario,
        description: 'Termos e definições do sistema',
      },
    ],
  },
  {
    group: 'Histórico & Impacto',
    accent: 'from-amber-500/20 to-orange-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
    items: [
      {
        label: 'Histórico',
        icon: History,
        href: ROUTES.history,
        description: 'Linha do tempo de versões analisadas',
      },
      {
        label: 'Comparação',
        icon: GitCompare,
        href: ROUTES.comparison,
        description: 'Diff detalhado entre versões do projeto',
      },
      {
        label: 'Impacto',
        icon: AlertTriangle,
        href: ROUTES.impact,
        description: 'Análise de risco das alterações',
      },
    ],
  },
  {
    group: 'Arquitetura',
    accent: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    items: [
      {
        label: 'Arquitetura',
        icon: Network,
        href: ROUTES.architecture,
        description: 'Visão arquitetural do sistema',
      },
      {
        label: 'Frontend',
        icon: Monitor,
        href: ROUTES.frontend,
        description: 'Telas, componentes e hooks do frontend',
      },
      {
        label: 'Backend',
        icon: Server,
        href: ROUTES.backend,
        description: 'Serviços, rotas e controladores',
      },
      {
        label: 'Banco de Dados',
        icon: Database,
        href: ROUTES.database,
        description: 'Schemas, tabelas e migrations',
      },
    ],
  },
  {
    group: 'Inventário Técnico',
    accent: 'from-rose-500/20 to-pink-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/10 group-hover:bg-rose-500/20',
    items: [
      {
        label: 'Componentes',
        icon: Layers,
        href: ROUTES.components,
        description: 'Componentes UI identificados no projeto',
      },
      {
        label: 'Hooks',
        icon: Zap,
        href: ROUTES.hooks,
        description: 'Hooks customizados do React',
      },
      {
        label: 'APIs',
        icon: Globe,
        href: ROUTES.apis,
        description: 'Endpoints e contratos de API',
      },
      {
        label: 'Dependências',
        icon: Package,
        href: ROUTES.dependencies,
        description: 'Pacotes e bibliotecas utilizadas',
      },
      {
        label: 'Integrações',
        icon: Plug,
        href: ROUTES.integrations,
        description: 'Serviços e integrações externas',
      },
      {
        label: 'Módulos',
        icon: FileStack,
        href: ROUTES.modules,
        description: 'Módulos do monorepo',
      },
    ],
  },
  {
    group: 'Ferramentas',
    accent: 'from-slate-500/20 to-zinc-500/10',
    iconColor: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
    items: [
      {
        label: 'Prompts Replit',
        icon: Bot,
        href: ROUTES.prompts,
        description: 'Prompts IA gerados para o Replit Agent',
      },
      {
        label: 'Configurações',
        icon: Settings,
        href: ROUTES.settings,
        description: 'Preferências e configurações do sistema',
      },
    ],
  },
];

// ─── Card individual ──────────────────────────────────────────────────────────

function NavCard({
  label, icon: Icon, href, description, iconColor, iconBg,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  description: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Link
      to={href}
      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:border-border/80 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-primary/[0.02] group-hover:to-transparent transition-all duration-300 pointer-events-none" />

      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${iconBg} ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-foreground leading-tight">{label}</span>
        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed pl-11">
        {description}
      </p>
    </Link>
  );
}

// ─── Seção de grupo ───────────────────────────────────────────────────────────

function SectionGroup({
  group, items, iconColor, iconBg,
}: {
  group: string;
  items: typeof SECTIONS[0]['items'];
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          {group}
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {items.map((item) => (
          <NavCard
            key={item.href}
            label={item.label}
            icon={item.icon}
            href={item.href}
            description={item.description}
            iconColor={iconColor}
            iconBg={iconBg}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);

  return (
    <div className="w-full min-h-full space-y-8 pb-12">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 px-8 py-8">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/5" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/8" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                NicEmp Docs
              </h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                v1.0
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma de análise e documentação automática de projetos.
              Escolha uma seção para começar.
            </p>
          </div>

          {project ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 shrink-0">
              <div className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                  Projeto ativo
                </p>
                <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                  {project.name}
                </p>
              </div>
            </div>
          ) : (
            <Link
              to={ROUTES.upload}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
            >
              <UploadCloud className="h-4 w-4" />
              Nenhum projeto ainda — enviar ZIP
            </Link>
          )}
        </div>
      </div>

      {/* ── Grade de cards por seção ─────────────────────────────────────── */}
      {SECTIONS.map((section) => (
        <SectionGroup
          key={section.group}
          group={section.group}
          items={section.items}
          iconColor={section.iconColor}
          iconBg={section.iconBg}
        />
      ))}
    </div>
  );
}
