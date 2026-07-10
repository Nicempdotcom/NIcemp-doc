import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard } from '@/app/components/docs';
import { Network, Layers, GitBranch, Cpu, Code2, Shield, Plug, Globe, Webhook } from 'lucide-react';

export default function Architecture() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Arquitetura"
        description="Estrutura técnica, diagramas e decisões de design do sistema NicEmp."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="info">
        Esta seção irá documentar toda a arquitetura do sistema, incluindo diagramas, fluxos e decisões técnicas.
      </InfoBox>

      <Section title="Visão Geral" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Network} title="Diagrama do Sistema" description="Conteúdo em breve" />
          <DocCard icon={Layers} title="Camadas da Aplicação" description="Conteúdo em breve" />
          <DocCard icon={GitBranch} title="Fluxo de Dados" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Decisões Técnicas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Cpu} title="Stack Tecnológica" description="Conteúdo em breve" />
          <DocCard icon={Code2} title="Padrões de Projeto" description="Conteúdo em breve" />
          <DocCard icon={Shield} title="Segurança" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Integrações Externas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Plug} title="APIs Externas" description="Conteúdo em breve" />
          <DocCard icon={Globe} title="Serviços de Terceiros" description="Conteúdo em breve" />
          <DocCard icon={Webhook} title="Webhooks" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
