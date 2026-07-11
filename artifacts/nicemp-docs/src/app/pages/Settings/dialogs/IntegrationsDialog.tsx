import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { isSupabaseConfigured } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function IntegrationRow({ name, description, active }: { name: string; description: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{name}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
        <span className="text-xs text-muted-foreground">{active ? 'Ativo' : 'Desconectado'}</span>
      </div>
    </div>
  );
}

export default function IntegrationsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Integrações Ativas</DialogTitle>
          <DialogDescription>
            Lista real das fontes de dados usadas pelo portal — nenhuma integração fictícia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <IntegrationRow
            name="Supabase"
            description="Banco compartilhado de projetos, versões e documentação."
            active={isSupabaseConfigured}
          />
          <IntegrationRow
            name="localStorage"
            description="Cache local do navegador — sempre disponível, mesmo offline."
            active
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
