import React, { useState, useEffect } from 'react';
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
import { isSupabaseConfigured } from '@/lib/supabase';
import { SlidersHorizontal, Globe, Palette, Link2, Key, Webhook, Users, ShieldCheck, DatabaseZap, Trash2, Cloud, HardDrive, Loader2, Database } from 'lucide-react';
import type { StoreKey } from '@/services/storage/types';
import SystemPreferencesDialog from './dialogs/SystemPreferencesDialog';
import RegionalizationDialog from './dialogs/RegionalizationDialog';
import ThemeDialog from './dialogs/ThemeDialog';
import ApiKeysDialog from './dialogs/ApiKeysDialog';
import IntegrationsDialog from './dialogs/IntegrationsDialog';
import WebhooksDialog from './dialogs/WebhooksDialog';
import UsersDialog from './dialogs/UsersDialog';
import RolesDialog from './dialogs/RolesDialog';
import AnalyzedSupabaseDialog from './dialogs/AnalyzedSupabaseDialog';

type SettingsDialog =
  | 'preferences' | 'regionalization' | 'theme'
  | 'apiKeys' | 'integrations' | 'webhooks'
  | 'users' | 'roles'
  | 'analyzedSupabase'
  | null;

const COUNT_LABELS: Record<string, string> = {
  projects:         'Projetos',
  versions:         'Versões',
  versionSnapshots: 'Fotos de versões',
  pages:            'Páginas',
  components:       'Componentes',
  hooks:            'Hooks',
  apis:             'APIs',
  tables:           'Tabelas',
  dependencies:     'Dependências',
  technologies:     'Tecnologias',
  history:          'Itens do histórico',
  interactions:     'Interações',
  importEdges:      'Ligações de arquitetura',
};

function DataPrivacySection() {
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<StoreKey, number>>(() => StorageService.countAll());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Refresh counts on mount (data may have changed since last render)
  useEffect(() => {
    setCounts(StorageService.countAll());
  }, []);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  async function handleReset() {
    setResetting(true);
    StorageService.clearAll();   // sync clear (localStorage) + async clear (Supabase)
    setCounts(StorageService.countAll());
    setDialogOpen(false);
    setResetting(false);
    toast({
      title: 'Histórico resetado',
      description: isSupabaseConfigured
        ? 'Todos os registros foram apagados do banco compartilhado (Supabase) e do cache local.'
        : 'Todos os projetos, versões e documentação salvos neste navegador foram apagados.',
    });
  }

  return (
    <Section
      title="Dados & Privacidade"
      description={isSupabaseConfigured
        ? 'Dados armazenados no banco compartilhado Supabase — visíveis para todos os sócios.'
        : 'O que está salvo neste navegador e como apagar tudo, se precisar.'}
      className="mt-8"
    >
      {/* Storage backend indicator */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        {isSupabaseConfigured ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-emerald-500" />
            <span>Backend: <span className="font-medium text-foreground">Supabase (banco compartilhado)</span> — dados sincronizados entre todos os sócios</span>
          </>
        ) : (
          <>
            <HardDrive className="h-3.5 w-3.5 text-amber-500" />
            <span>Backend: <span className="font-medium text-foreground">localStorage</span> — dados visíveis apenas neste navegador</span>
          </>
        )}
      </div>

      <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {isSupabaseConfigured ? 'Dados salvos no banco compartilhado' : 'Dados salvos neste navegador'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSupabaseConfigured
                ? 'Todos os resumos e metadados extraídos ao analisar projetos. Código-fonte nunca é armazenado.'
                : 'Tudo que o NicEmp Docs guardou localmente ao analisar seus projetos.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(COUNT_LABELS).map(([k, label]) => (
            <div key={k} className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <div className="text-xl font-bold text-foreground">{counts[k as StoreKey] ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            Total salvo: <span className="font-semibold text-foreground">{total}</span>{' '}
            {total === 1 ? 'registro' : 'registros'}
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={resetting}>
                {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Resetar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar todo o histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isSupabaseConfigured
                    ? 'Isso vai apagar TODOS os projetos, versões e documentação do banco compartilhado (Supabase). Todos os sócios perderão os dados. Essa ação não pode ser desfeita.'
                    : 'Isso vai apagar TODOS os projetos, versões e documentação salvos neste navegador. Essa ação não pode ser desfeita.'}
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
  const [activeDialog, setActiveDialog] = useState<SettingsDialog>(null);
  const close = () => setActiveDialog(null);

  return (
    <div className="w-full">
      <PageHeader
        title="Configurações"
        description="Preferências, integrações e configurações gerais do portal NicEmp Docs."
      />

      <InfoBox variant={isSupabaseConfigured ? 'tip' : 'warning'} title={isSupabaseConfigured ? 'Banco compartilhado ativo' : 'Modo localStorage'}>
        {isSupabaseConfigured
          ? 'O NicEmp Docs está conectado ao Supabase. Todos os sócios compartilham os mesmos dados.'
          : 'Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o banco compartilhado.'}
      </InfoBox>

      <DataPrivacySection />

      <Section title="Geral" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={SlidersHorizontal} title="Preferências do Sistema" description="Sidebar, tabelas compactas e abertura automática do último projeto." onClick={() => setActiveDialog('preferences')} />
          <DocCard icon={Globe} title="Regionalização" description="Formato de data e fuso horário usados em todo o portal." onClick={() => setActiveDialog('regionalization')} />
          <DocCard icon={Palette} title="Temas & Aparência" description="Modo claro/escuro e densidade visual." onClick={() => setActiveDialog('theme')} />
        </div>
      </Section>

      <Section title="Integrações">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <DocCard icon={Link2} title="Chaves de API" description="Status real da conexão Supabase — sem chaves fictícias." onClick={() => setActiveDialog('apiKeys')} />
          <DocCard icon={Key} title="Integrações Ativas" description="Supabase e localStorage — as únicas fontes de dados do portal." onClick={() => setActiveDialog('integrations')} />
          <DocCard icon={Webhook} title="Webhooks Configurados" description="Endpoints planejados para notificações futuras." onClick={() => setActiveDialog('webhooks')} />
          <DocCard icon={Database} title="Supabase do projeto analisado" description="Conecte ao Supabase do nicemp.com para carregar categorias reais no dropdown Criar Ferramenta." onClick={() => setActiveDialog('analyzedSupabase')} />
        </div>
      </Section>

      <Section title="Usuários & Permissões">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocCard icon={Users} title="Gestão de Usuários" description="Sua sessão atual e como criar novos acessos." onClick={() => setActiveDialog('users')} />
          <DocCard icon={ShieldCheck} title="Papéis & Permissões" description="Situação atual: acesso total para todo usuário autenticado." onClick={() => setActiveDialog('roles')} />
        </div>
      </Section>

      <SystemPreferencesDialog open={activeDialog === 'preferences'} onOpenChange={(v) => !v && close()} />
      <RegionalizationDialog open={activeDialog === 'regionalization'} onOpenChange={(v) => !v && close()} />
      <ThemeDialog open={activeDialog === 'theme'} onOpenChange={(v) => !v && close()} />
      <ApiKeysDialog open={activeDialog === 'apiKeys'} onOpenChange={(v) => !v && close()} />
      <IntegrationsDialog open={activeDialog === 'integrations'} onOpenChange={(v) => !v && close()} />
      <WebhooksDialog open={activeDialog === 'webhooks'} onOpenChange={(v) => !v && close()} />
      <UsersDialog open={activeDialog === 'users'} onOpenChange={(v) => !v && close()} />
      <RolesDialog open={activeDialog === 'roles'} onOpenChange={(v) => !v && close()} />
      <AnalyzedSupabaseDialog open={activeDialog === 'analyzedSupabase'} onOpenChange={(v) => !v && close()} />
    </div>
  );
}
