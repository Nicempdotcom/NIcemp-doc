import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { usePreferences } from '@/hooks/use-preferences';
import { PreferencesRepository } from '@/services/storage/PreferencesRepository';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ id, title, description, checked, onCheckedChange }: {
  id: string; title: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">{title}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

export default function SystemPreferencesDialog({ open, onOpenChange }: Props) {
  const prefs = usePreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências do Sistema</DialogTitle>
          <DialogDescription>
            Salvas neste navegador (localStorage) e aplicadas imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <Row
            id="pref-sidebar-collapsed"
            title="Sidebar recolhida por padrão"
            description="Grupos de navegação começam fechados ao abrir o portal, exceto o grupo da página atual."
            checked={prefs.sidebarDefaultCollapsed}
            onCheckedChange={(v) => PreferencesRepository.update({ sidebarDefaultCollapsed: v })}
          />
          <Row
            id="pref-auto-open"
            title="Abrir último projeto automaticamente"
            description="Ao entrar no portal, já carrega o projeto analisado mais recentemente."
            checked={prefs.autoOpenLastProject}
            onCheckedChange={(v) => PreferencesRepository.update({ autoOpenLastProject: v })}
          />
          <Row
            id="pref-compact-tables"
            title="Tabelas compactas"
            description="Reduz o espaçamento das linhas em todas as tabelas (Frontend, Backend, Database, etc.)."
            checked={prefs.compactTables}
            onCheckedChange={(v) => PreferencesRepository.update({ compactTables: v })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
