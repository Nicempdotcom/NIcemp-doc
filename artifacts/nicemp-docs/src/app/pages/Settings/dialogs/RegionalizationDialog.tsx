import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { usePreferences } from '@/hooks/use-preferences';
import { PreferencesRepository, type DateFormat } from '@/services/storage/PreferencesRepository';
import { formatDate } from '@/utils/formatDate';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIMEZONES: string[] = (() => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
  } catch {
    // fall through to fixed list
  }
  return [
    'America/Sao_Paulo', 'America/Manaus', 'America/Noronha', 'America/New_York',
    'America/Los_Angeles', 'Europe/Lisbon', 'Europe/London', 'UTC',
  ];
})();

export default function RegionalizationDialog({ open, onOpenChange }: Props) {
  const prefs = usePreferences();
  const now = new Date().toISOString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regionalização</DialogTitle>
          <DialogDescription>
            Controla como datas são exibidas em todo o portal (Dashboard, Histórico, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Formato de data</Label>
            <Select
              value={prefs.dateFormat}
              onValueChange={(v) => PreferencesRepository.update({ dateFormat: v as DateFormat })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/AAAA (31/12/2026)</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/AAAA (12/31/2026)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fuso horário</Label>
            <Select
              value={prefs.timezone}
              onValueChange={(v) => PreferencesRepository.update({ timezone: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            Pré-visualização: <span className="font-medium text-foreground font-mono">{formatDate(now, { withTime: true })}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
