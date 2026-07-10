import PageHeader from '@/components/layout/PageHeader';
import { Section, StatusBadge, InfoBox } from '@/components/docs';
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
  Bar 
} from 'recharts';

const coverageData = [
  { name: 'Jan', value: 45 },
  { name: 'Fev', value: 51 },
  { name: 'Mar', value: 58 },
  { name: 'Abr', value: 63 },
  { name: 'Mai', value: 68 },
  { name: 'Jun', value: 73 },
];

const moduleData = [
  { name: 'Auth', value: 28 },
  { name: 'Dashboard', value: 22 },
  { name: 'Módulos', value: 19 },
  { name: 'Configurações', value: 15 },
  { name: 'Banco de Dados', value: 12 },
  { name: 'API', value: 11 },
  { name: 'Prompts', value: 9 },
  { name: 'Arquitetura', value: 8 },
];

const recentUpdates = [
  { date: '10 jul 2025', section: 'Frontend', change: 'Atualização da seção de componentes', author: 'Carlos M.' },
  { date: '09 jul 2025', section: 'Backend', change: 'Novos endpoints de autenticação', author: 'Ana P.' },
  { date: '08 jul 2025', section: 'Banco de Dados', change: 'Schema de usuários revisado', author: 'Carlos M.' },
  { date: '07 jul 2025', section: 'Módulos', change: 'Integração com WhatsApp documentada', author: 'Sofia R.' },
  { date: '05 jul 2025', section: 'API', change: 'Documentação de rate limiting', author: 'Ana P.' },
];

export default function Dashboard() {
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))'
  };

  return (
    <div className="w-full">
      <PageHeader 
        title="Dashboard" 
        description="Visão geral do projeto NicEmp — métricas, cobertura e histórico de atualizações." 
        badge="v2.4.1" 
      />

      <div className="bg-card border border-card-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Nome</span>
            <span className="text-sm font-medium text-foreground">NicEmp</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Versão</span>
            <span className="text-sm font-medium text-foreground">v2.4.1</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Ambiente</span>
            <span className="text-sm font-medium text-foreground">Produção</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            <div className="flex items-center h-[20px]">
              <StatusBadge status="stable" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Última Atualização</span>
            <span className="text-sm font-medium text-foreground">10 de julho de 2025, 14h32</span>
          </div>
        </div>
      </div>

      <InfoBox variant="tip" title="Dados de demonstração">
        As métricas exibidas são fictícias e serão substituídas por dados reais nas próximas etapas.
      </InfoBox>

      <Section title="Métricas do Projeto" className="mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Páginas</span>
            </div>
            <div className="text-3xl font-bold text-foreground">38</div>
            <div className="text-xs text-muted-foreground mt-1">Total de rotas front-end</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Componentes</span>
            </div>
            <div className="text-3xl font-bold text-foreground">124</div>
            <div className="text-xs text-muted-foreground mt-1">Elementos de UI reutilizáveis</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Hooks Customizados</span>
            </div>
            <div className="text-3xl font-bold text-foreground">17</div>
            <div className="text-xs text-muted-foreground mt-1">Lógica React encapsulada</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Endpoints de API</span>
            </div>
            <div className="text-3xl font-bold text-foreground">42</div>
            <div className="text-xs text-muted-foreground mt-1">Rotas de back-end ativas</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <TableIcon className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Tabelas no Banco</span>
            </div>
            <div className="text-3xl font-bold text-foreground">19</div>
            <div className="text-xs text-muted-foreground mt-1">Modelos de dados relacionais</div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-[18px] w-[18px] text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Cobertura de Docs</span>
            </div>
            <div className="text-3xl font-bold text-foreground">73%</div>
            <div className="text-xs text-muted-foreground mt-1">Código mapeado no portal</div>
          </div>
        </div>
      </Section>

      <Section title="Cobertura da Documentação">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Evolução da documentação</h3>
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
                    tickFormatter={(val) => `${val}%`}
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
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por módulo</h3>
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
          </div>
        </div>
      </Section>

      <Section title="Atualizações Recentes">
        <div className="w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse bg-card">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Data</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Seção</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium w-full min-w-[250px]">Alteração</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Autor</th>
              </tr>
            </thead>
            <tbody>
              {recentUpdates.map((update, idx) => (
                <tr 
                  key={idx} 
                  className={`text-sm text-foreground ${idx % 2 !== 0 ? 'bg-muted/10' : ''} ${idx !== recentUpdates.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">{update.date}</td>
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap">{update.section}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{update.change}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{update.author}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
