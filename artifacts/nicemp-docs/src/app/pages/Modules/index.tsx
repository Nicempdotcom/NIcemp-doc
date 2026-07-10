import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard, FeatureCard } from '@/app/components/docs';
import { Users, CreditCard, BarChart2, MessageSquare, Puzzle, Calendar, Bell } from 'lucide-react';

export default function Modules() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Módulos"
        description="Módulos funcionais do sistema NicEmp — escopo, dependências e status."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="info">
        Esta seção irá documentar cada módulo do sistema: funcionalidades, dependências, configurações e integrações.
      </InfoBox>

      <Section title="Módulos Ativos" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <DocCard icon={Users} title="Gestão de Usuários" description="Conteúdo em breve" />
          <DocCard icon={CreditCard} title="Financeiro" description="Conteúdo em breve" />
          <DocCard icon={BarChart2} title="Relatórios" description="Conteúdo em breve" />
          <DocCard icon={MessageSquare} title="Comunicação" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Módulos em Desenvolvimento">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Puzzle} title="Integrações" description="Conteúdo em breve" />
          <DocCard icon={Calendar} title="Agenda" description="Conteúdo em breve" />
          <DocCard icon={Bell} title="Central de Notificações" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Módulos Planejados">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FeatureCard tag="Planejado" title="BI & Analytics" description="Conteúdo em breve" />
          <FeatureCard tag="Planejado" title="Automações" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
