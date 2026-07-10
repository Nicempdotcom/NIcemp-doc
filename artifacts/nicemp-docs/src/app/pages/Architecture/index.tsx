import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Package, GitBranch, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import Section from '@/app/components/docs/Section';
import InfoBox from '@/app/components/docs/InfoBox';
import { Badge } from '@/app/components/ui/badge';
import {
  ProjectRepository, TechnologyRepository, DependencyRepository,
  PageRepository, ComponentRepository, HookRepository, ApiRepository, TableRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';
import type { TechCategory } from '@/services/storage/types';

const CATEGORY_LABELS: Record<TechCategory, string> = {
  language:  'Linguagens',
  framework: 'Frameworks',
  styling:   'Estilização',
  backend:   'Backend',
  database:  'Banco de Dados',
  testing:   'Testes',
  build:     'Build',
  runtime:   'Runtime',
};

const CATEGORY_ORDER: TechCategory[] = ['language', 'framework', 'styling', 'backend', 'database', 'build', 'testing', 'runtime'];

/**
 * Arquitetura — tech stack, module breakdown and dependency overview,
 * generated automatically from the documentation database (EPIC 08 Portal Oficial).
 */
export default function Architecture() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const technologies = useMemo(() => (project ? TechnologyRepository.findByProject(project.id) : []), [project]);
  const dependencies = useMemo(() => (project ? DependencyRepository.findByProject(project.id) : []), [project]);

  const pages      = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const components = useMemo(() => (project ? ComponentRepository.findByProject(project.id) : []), [project]);
  const hooks       = useMemo(() => (project ? HookRepository.findByProject(project.id) : []), [project]);
  const apis        = useMemo(() => (project ? ApiRepository.findByProject(project.id) : []), [project]);
  const tables      = useMemo(() => (project ? TableRepository.findByProject(project.id) : []), [project]);

  const byCategory = useMemo(() => {
    const map = new Map<TechCategory, typeof technologies>();
    for (const t of technologies) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [technologies]);

  const modules = useMemo(() => {
    const counts = new Map<string, { pages: number; components: number; hooks: number; apis: number; tables: number }>();
    const bump = (mod: string, key: 'pages' | 'components' | 'hooks' | 'apis' | 'tables') => {
      const m = mod || 'sem módulo';
      const entry = counts.get(m) ?? { pages: 0, components: 0, hooks: 0, apis: 0, tables: 0 };
      entry[key] += 1;
      counts.set(m, entry);
    };
    pages.forEach((p) => bump(p.module, 'pages'));
    components.forEach((c) => bump(c.module, 'components'));
    hooks.forEach((h) => bump(h.module, 'hooks'));
    apis.forEach((a) => bump(a.module, 'apis'));
    tables.forEach((t) => bump(t.module, 'tables'));
    return [...counts.entries()].sort((a, b) =>
      Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0));
  }, [pages, components, hooks, apis, tables]);

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader title="Arquitetura" description="Stack tecnológica e estrutura de módulos, gerados automaticamente." badge="EPIC 08" badgeVariant="info" />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Arquitetura"
        description="Stack tecnológica e estrutura de módulos, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
      />

      <Section title="Stack Tecnológica" description="Agrupada por categoria, extraída das dependências do projeto.">
        {technologies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tecnologia detectada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => (
              <div key={cat} className="rounded-lg border border-card-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {byCategory.get(cat)!.map((t) => (
                    <Badge key={t.id} variant="outline" className="text-[10px] font-normal">{t.name}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Camadas da Aplicação" description="Módulos detectados e como pages, componentes, hooks, APIs e tabelas se distribuem entre eles.">
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum módulo detectado ainda.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Módulo</th>
                  <th className="px-4 py-2.5 text-left font-medium">Páginas</th>
                  <th className="px-4 py-2.5 text-left font-medium">Componentes</th>
                  <th className="px-4 py-2.5 text-left font-medium">Hooks</th>
                  <th className="px-4 py-2.5 text-left font-medium">APIs</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tabelas</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(([mod, c], idx) => (
                  <tr key={mod} className={idx % 2 !== 0 ? 'bg-muted/10' : ''}>
                    <td className="px-4 py-2.5 font-medium text-foreground flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-muted-foreground" />{mod}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.pages}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.components}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.hooks}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.apis}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.tables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Dependências">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">{dependencies.length} pacotes utilizados pelo projeto.</span>
          <Link to={ROUTES.dependencies} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline ml-auto">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Section>
    </div>
  );
}
