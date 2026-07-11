import { useMemo } from 'react';
import PageHeader from '@/app/layouts/PageHeader';
import { Section, StatusBadge, InfoBox } from '@/app/components/docs';
import { FileText, Layers, Zap, Globe, Table as TableIcon, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  ProjectRepository, PageRepository, VersionRepository, HistoryRepository,
} from '@/services/storage';

function groupByModule<T extends { module: string }>(items: T[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.module || 'sem módulo';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Dashboard — project overview built directly from the documentation
 * database (same useMemo + repository pattern as Frontend/index.tsx).
 * No mocked/demo data: everything comes from the most recently analyzed
 * project, its versions, its pages and the append-only history log.
 */
export default function Dashboard() {
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  };

  const project = useMemo(() => ProjectRepository.findLatest(), []);
  const pages    = useMemo(() => (project ? PageRepository.findByProject(project.id) : []), [project]);
  const versions = useMemo(() => (project ? VersionRepository.findByProject(project.id) : []), [project]);
  const latestVersion = versions[0];
  const history = useMemo(
    () => (project ? HistoryRepository.findByProject(project.id).slice(0, 10) : []),
    [project],
  );

  const pageModules = useMemo(() => groupByModule(pages), [pages]);

  const coverageData = useMemo(
    () => [...versions]
      .sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt))
      .map((v) => ({
        name: formatDate(v.snapshotAt),
        value: v.stats.pages + v.stats.components + v.stats.hooks + v.stats.apis + v.stats.tables,
      })),
    [versions],
  );

  const moduleData = useMemo(
    () => pageModules.map(([name, value]) => ({ name, value })),
    [pageModules],
  );

  if (!project) {
    return (
      <div className="w-full">
        <PageHeader
          title="Dashboard"
          description="Visão geral do projeto — métricas, cobertura e histórico de atualizações."
          badge="EPIC 08"
          badgeVariant="info"
        />
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para popular esta página automaticamente.
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Dashboard"
        description="Visão geral do projeto — métricas, cobertura e histórico de atualizações."
        badge="EPIC 08"
        badgeVariant="info"
      />

      <div className="bg-card border border-card-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Nome</span>
            <span className="text-sm font-medium text-foreground truncate" title={project.rootName}>{project.rootName}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Versão</span>
            <span className="text-sm font-medium text-foreground">{latestVersion ? `v${latestVersion.semver}` : '—'}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            <div className="flex items-center h-[20px]">
              {latestVersion ? <StatusBadge status={latestVersion.status} /> : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Última Atualização</span>
            <span className="text-sm font-medium text-foreground">{formatDateTime(project.lastChanged)}</span>
          </div>
        </div>
      </div>

      <Section title="Métricas do Projeto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Páginas</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.pages}</div>
            <div className="text-xs text-muted-foreground mt-1">Total de rotas front-end</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Componentes</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.components}</div>
            <div className="text-xs text-muted-foreground mt-1">Elementos de UI reutilizáveis</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Hooks Customizados</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.hooks}</div>
            <div className="text-xs text-muted-foreground mt-1">Lógica React encapsulada</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Endpoints de API</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.apis}</div>
            <div className="text-xs text-muted-foreground mt-1">Rotas de back-end ativas</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <TableIcon className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Tabelas no Banco</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.tables}</div>
            <div className="text-xs text-muted-foreground mt-1">Modelos de dados relacionais</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Dependências</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{project.stats.dependencies}</div>
            <div className="text-xs text-muted-foreground mt-1">Pacotes declarados no projeto</div>
          </div>
        </div>
      </Section>

      <Section title="Cobertura da Documentação">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Evolução da documentação</h3>
            {coverageData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há versões analisadas para traçar a evolução.</p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={coverageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#6366f1' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--card))', stroke: '#6366f1', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#6366f1' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por módulo</h3>
            {moduleData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma página detectada ainda.</p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moduleData}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Atualizações Recentes">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atualização registrada ainda.</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left border-collapse bg-card">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium w-full min-w-[250px]">Alteração</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Enviado por</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={`text-sm text-foreground ${idx % 2 !== 0 ? 'bg-muted/10' : ''} ${idx !== history.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium">{entry.label}</div>
                      {entry.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{entry.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">{entry.uploadedBy?.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
