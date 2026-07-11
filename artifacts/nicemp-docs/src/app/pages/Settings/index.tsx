import React, { useState } from 'react';
import PageHeader from '@/app/layouts/PageHeader';
import { Section, InfoBox, DocCard } from '@/app/components/docs';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { StorageService } from '@/services/storage';
import { SlidersHorizontal, Globe, Palette, Link2, Key, Webhook, Users, ShieldCheck, DatabaseZap, Trash2 } from 'lucide-react';

const COUNT_LABELS: Record<string, string> = {
  projects: 'Projetos',
  versions: 'Versões',
  versionSnapshots: 'Fotos de versões',
  pages: 'Páginas',
  components: 'Componentes',
  hooks: 'Hooks',
  apis: 'APIs',
  tables: 'Tabelas',
  dependencies: 'Dependências',
  technologies: 'Tecnologias',
  history: 'Itens do histórico',
  interactions: 'Interações',
  importEdges: 'Ligações de arquitetura',
};

function DataPrivacySection() {
  const { toast } = useToast();
  const [counts, setCounts] = useState(() => StorageService.countAll());
  const [dialogOpen, setDialogOpen] = useState(false);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  function handleReset() {
    StorageService.clearAll();
    setCounts(StorageService.countAll());
    setDialogOpen(false);
    toast({ title: 'Histórico resetado', description: 'Todos os projetos, versões e documentação salvos foram apagados.' });
  }

  return (
    <Section
      title="Dados & Privacidade"
      description="O que está salvo neste navegador e como apagar tudo, se precisar."
      className="mt-8"
    >
      <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Dados salvos neste navegador</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tudo que o NicEmp Docs guardou localmente ao analisar seus projetos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(COUNT_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <div className="text-xl font-bold text-foreground">{counts[key as keyof typeof counts] ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            Total salvo: <span className="font-semibold text-foreground">{total}</span> {total === 1 ? 'registro' : 'registros'}
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3.5 w-3.5" />
                Resetar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar todo o histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai apagar TODOS os projetos, versões e documentação salvos neste navegador.
                  Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground border-destructive-border">
                  Sim, apagar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Section>
  );
}

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

      <DataPrivacySection />

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
