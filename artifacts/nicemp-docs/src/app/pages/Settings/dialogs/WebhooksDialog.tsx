import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/app/components/ui/select';
import { InfoBox } from '@/app/components/docs';
import { WebhookRepository, WEBHOOK_EVENTS, type WebhookEntry } from '@/services/storage/WebhookRepository';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WebhooksDialog({ open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<WebhookEntry[]>(() => WebhookRepository.findAll());
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState<string>(WEBHOOK_EVENTS[0].value);

  function addEntry() {
    if (!name.trim() || !url.trim()) return;
    const created = WebhookRepository.add({ name: name.trim(), url: url.trim(), event });
    setEntries((prev) => [...prev, created]);
    setName('');
    setUrl('');
  }

  function removeEntry(id: string) {
    WebhookRepository.remove(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhooks Configurados</DialogTitle>
          <DialogDescription>
            Endpoints planejados para futuras notificações automáticas.
          </DialogDescription>
        </DialogHeader>

        <InfoBox variant="warning" title="Ainda não disparam automaticamente">
          O NicEmp Docs não possui um backend de eventos hoje. Os endpoints abaixo ficam salvos como planejamento —
          nenhuma requisição é enviada a eles ainda.
        </InfoBox>

        <div className="flex flex-col gap-3 mt-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum webhook cadastrado.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{e.url}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {WEBHOOK_EVENTS.find((ev) => ev.value === e.event)?.label ?? e.event}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)} className="shrink-0 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wh-name">Nome</Label>
              <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Notificar Slack" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Evento</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map((ev) => (
                    <SelectItem key={ev.value} value={ev.value}>{ev.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wh-url">URL do endpoint</Label>
            <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={addEntry} disabled={!name.trim() || !url.trim()} className="gap-1.5 self-end">
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
