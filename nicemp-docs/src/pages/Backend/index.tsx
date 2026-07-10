import PageHeader from '@/components/layout/PageHeader';
import { Section, InfoBox, DocCard } from '@/components/docs';
import { Route, ArrowUpDown, ListFilter, Server, Mail, BellRing, LockKeyhole, KeyRound, ShieldCheck, Filter, Activity } from 'lucide-react';

export default function Backend() {
  return (
    <div className="w-full">
      <PageHeader 
        title="Backend"
        description="Rotas, serviços, middlewares e lógica de negócio do servidor NicEmp."
        badge="Em construção"
        badgeVariant="warning"
      />
      
      <InfoBox variant="info">
        Esta seção irá documentar toda a camada de servidor: endpoints, autenticação, serviços e middlewares.
      </InfoBox>

      <Section title="API & Rotas" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Route} title="Endpoints REST" description="Conteúdo em breve" />
          <DocCard icon={ArrowUpDown} title="Parâmetros & Respostas" description="Conteúdo em breve" />
          <DocCard icon={ListFilter} title="Rate Limiting" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Serviços">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Server} title="Serviços de Negócio" description="Conteúdo em breve" />
          <DocCard icon={Mail} title="Serviço de E-mail" description="Conteúdo em breve" />
          <DocCard icon={BellRing} title="Notificações" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Segurança & Auth">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={LockKeyhole} title="Autenticação" description="Conteúdo em breve" />
          <DocCard icon={KeyRound} title="Autorização & Roles" description="Conteúdo em breve" />
          <DocCard icon={ShieldCheck} title="Proteção de Rotas" description="Conteúdo em breve" />
        </div>
      </Section>

      <Section title="Middlewares">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={Filter} title="Pipeline de Middlewares" description="Conteúdo em breve" />
          <DocCard icon={Activity} title="Logging & Monitoramento" description="Conteúdo em breve" />
        </div>
      </Section>
    </div>
  );
}
