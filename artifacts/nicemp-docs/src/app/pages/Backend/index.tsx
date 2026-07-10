import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Lock, LockOpen, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import Section from '@/app/components/docs/Section';
import InfoBox from '@/app/components/docs/InfoBox';
import { Badge } from '@/app/components/ui/badge';
import { ProjectRepository, ApiRepository, TechnologyRepository } from '@/services/storage';
import { ROUTES } from '@/routes';
import type { HttpMethod } from '@/services/storage/types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Backend overview — endpoints, auth coverage and backend technologies,
 * generated automatically from the documentation database (EPIC 08 Portal Oficial).
 */
export default function Backend() {
  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const apis = useMemo(() => (project ? ApiRepository.findByProject(project.id) : []), [project]);
  const backendTech = useMemo(() => (project ? TechnologyRepository.findByProject(project.id).filter((t) => t.category === 'backend') : []), [project]);

  const byMethod = useMemo(() => METHODS.map((m) => ({ method: m, count: apis.filter((a) => a.method === m).length })), [apis]);
  const protectedCount = apis.filter((a) => a.auth).length;
  const modules = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of apis) {
      const key = a.module || 'sem módulo';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [apis]);

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader title="Backend" description="Endpoints, autenticação e tecnologias de servidor, gerados automaticamente." badge="EPIC 08" badgeVariant="info" />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Backend"
        description="Endpoints, autenticação e tecnologias de servidor, gerados automaticamente a partir do banco de documentação."
        badge="EPIC 08"
        badgeVariant="info"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{apis.length}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Endpoints</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-2xl font-bold text-foreground"><Lock className="h-4 w-4 text-amber-500" />{protectedCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Protegidos</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-1.5 text-2xl font-bold text-foreground"><LockOpen className="h-4 w-4 text-muted-foreground" />{apis.length - protectedCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Públicos</div>
        </div>
      </div>

      <Section title="Endpoints por Método">
        {apis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma API detectada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {byMethod.filter((m) => m.count > 0).map(({ method, count }) => (
              <div key={method} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{method}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}
        <Link to={ROUTES.apis} className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 hover:underline">
          Ver todos os endpoints <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Section>

      <Section title="Endpoints por Módulo">
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum módulo de backend detectado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {modules.map(([mod, count]) => (
              <Badge key={mod} variant="outline" className="text-xs font-normal">{mod} · {count}</Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title="Tecnologias de Backend">
        {backendTech.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tecnologia de backend detectada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {backendTech.map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs font-normal">{t.name}{t.version ? ` · ${t.version}` : ''}</Badge>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
