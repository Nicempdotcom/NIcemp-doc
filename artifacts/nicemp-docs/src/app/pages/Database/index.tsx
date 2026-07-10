import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard } from '@/app/components/docs';
import { Database as DatabaseIcon, Table2, GitMerge, ArrowRight, History, Gauge, SearchCode } from 'lucide-react';

export default function Database() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Banco de Dados"
        description="Esquemas, tabelas, migrações e convenções de banco de dados do NicEmp."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="info">
        Esta seção irá documentar o modelo de dados completo: tabelas, relacionamentos, índices e políticas de migração.
      </InfoBox>

      <Section title="Modelo de Dados" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={DatabaseIcon} title="Diagrama ER" description="Conteúdo em breve" />
          <DocCard icon={Table2} title="Tabelas Principais" description="Conteúdo em breve" />
          <DocCard icon={GitMerge} title="Relacionamentos" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Migrações">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={ArrowRight} title="Estratégia de Migração" description="Conteúdo em breve" />
          <DocCard icon={History} title="Histórico de Versões" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Performance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={Gauge} title="Índices & Otimizações" description="Conteúdo em breve" />
          <DocCard icon={SearchCode} title="Queries Frequentes" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
