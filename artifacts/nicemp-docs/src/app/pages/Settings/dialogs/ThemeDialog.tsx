import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/app/components/ui/select';
import { useTheme } from '@/App';
import { usePreferences } from '@/hooks/use-preferences';
import { PreferencesRepository } from '@/services/storage/PreferencesRepository';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ThemeDialog({ open, onOpenChange }: Props) {
  const { theme, setTheme } = useTheme();
  const prefs = usePreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temas & Aparência</DialogTitle>
          <DialogDescription>
            Aplicado instantaneamente em todo o portal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="theme-switch" className="text-sm font-medium text-foreground">Modo escuro</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Alterna entre os temas claro e escuro do portal.</p>
            </div>
            <Switch
              id="theme-switch"
              checked={theme === 'dark'}
              onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Densidade</Label>
            <Select
              value={prefs.compactTables ? 'compact' : 'comfortable'}
              onValueChange={(v) => PreferencesRepository.update({ compactTables: v === 'compact' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="compact">Compacta</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Usa a mesma preferência de "Tabelas compactas" das Preferências do Sistema.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
