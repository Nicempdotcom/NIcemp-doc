import PageHeader from '@/components/layout/PageHeader';
import { Section, InfoBox, DocCard } from '@/components/docs';
import { SlidersHorizontal, Globe, Palette, Link2, Key, Webhook, Users, ShieldCheck } from 'lucide-react';

export default function Settings() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Configurações"
        description="Preferências, integrações e configurações gerais do portal NicEmp Docs."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="warning" title="Área restrita">
        As configurações aqui documentadas afetam o comportamento global do sistema. Alterações devem ser revisadas antes de aplicadas.
      </InfoBox>

      <Section title="Geral" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={SlidersHorizontal} title="Preferências do Sistema" description="Conteúdo em breve" />
          <DocCard icon={Globe} title="Regionalização" description="Conteúdo em breve" />
          <DocCard icon={Palette} title="Temas & Aparência" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Integrações">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Link2} title="Chaves de API" description="Conteúdo em breve" />
          <DocCard icon={Key} title="Integrações Ativas" description="Conteúdo em breve" />
          <DocCard icon={Webhook} title="Webhooks Configurados" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Usuários & Permissões">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={Users} title="Gestão de Usuários" description="Conteúdo em breve" />
          <DocCard icon={ShieldCheck} title="Papéis & Permissões" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
