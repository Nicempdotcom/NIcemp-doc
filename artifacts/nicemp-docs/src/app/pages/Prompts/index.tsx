import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard } from '@/app/components/docs';
import CreatePagePromptDialog from '@/app/components/prompts/CreatePagePromptDialog';
import CreateToolPromptDialog from '@/app/components/prompts/CreateToolPromptDialog';
import { LayoutTemplate, PackagePlus, Wrench, RefreshCcw, Bug, BookOpen, FileCode2 } from 'lucide-react';

export default function Prompts() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Prompts Replit"
        description="Biblioteca de prompts utilizados no desenvolvimento do NicEmp com Replit Agent."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="tip" title="Sobre esta seção">
        Os prompts documentados aqui são utilizados para guiar o Replit Agent na construção e manutenção do sistema NicEmp.
      </InfoBox>

      <Section title="Prompts de Criação" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CreatePagePromptDialog />
          <CreateToolPromptDialog />
          <DocCard icon={LayoutTemplate} title="Criar Componentes" description="Conteúdo em breve" />
          <DocCard icon={PackagePlus} title="Criar Módulos" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Prompts de Manutenção">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Wrench} title="Refatoração" description="Conteúdo em breve" />
          <DocCard icon={RefreshCcw} title="Atualização de Layout" description="Conteúdo em breve" />
          <DocCard icon={Bug} title="Correção de Bugs" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Prompts de Documentação">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={BookOpen} title="Documentar Código" description="Conteúdo em breve" />
          <DocCard icon={FileCode2} title="Gerar Specs" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
