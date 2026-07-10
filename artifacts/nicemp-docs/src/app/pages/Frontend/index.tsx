import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard } from '@/app/components/docs';
import { Box, Layout, ToggleLeft, FormInput, LayoutDashboard, FileText, Settings, Zap, RefreshCw, MousePointer } from 'lucide-react';

export default function Frontend() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Frontend"
        description="Componentes, páginas, hooks e padrões de interface do NicEmp."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="info">
        Esta seção irá documentar toda a camada de interface: componentes reutilizáveis, páginas, hooks e convenções visuais.
      </InfoBox>

      <Section title="Componentes" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <DocCard icon={Box} title="Componentes Base" description="Conteúdo em breve" />
          <DocCard icon={Layout} title="Layout System" description="Conteúdo em breve" />
          <DocCard icon={ToggleLeft} title="Formulários" description="Conteúdo em breve" />
          <DocCard icon={FormInput} title="Feedback & Alertas" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Páginas">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={LayoutDashboard} title="Páginas Principais" description="Conteúdo em breve" />
          <DocCard icon={FileText} title="Páginas de Apoio" description="Conteúdo em breve" />
          <DocCard icon={Settings} title="Fluxos de Navegação" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Hooks & Utilitários">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Zap} title="Custom Hooks" description="Conteúdo em breve" />
          <DocCard icon={RefreshCw} title="Utilitários" description="Conteúdo em breve" />
          <DocCard icon={MousePointer} title="Helpers de UI" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
