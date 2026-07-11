import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { InfoBox } from '@/app/components/docs';
import { isSupabaseConfigured, supabaseProjectUrl, supabaseAnonKeyMasked } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeysDialog({ open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    if (!supabaseProjectUrl) return;
    await navigator.clipboard.writeText(supabaseProjectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chaves de API</DialogTitle>
          <DialogDescription>
            Não há geração de chaves fictícias aqui — apenas o status real da conexão Supabase.
          </DialogDescription>
        </DialogHeader>

        {isSupabaseConfigured && supabaseProjectUrl ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">URL do projeto</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  {supabaseProjectUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyUrl} className="gap-1.5 shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar URL'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Chave anônima (anon key)</span>
              <code className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                {supabaseAnonKeyMasked}
              </code>
              <p className="text-xs text-muted-foreground">
                Exibida parcialmente por segurança. O valor completo está apenas nas variáveis de ambiente do projeto.
              </p>
            </div>
          </div>
        ) : (
          <InfoBox variant="warning" title="Supabase não configurado">
            Para ativar o banco compartilhado, defina as variáveis de ambiente <code className="font-mono">VITE_SUPABASE_URL</code> e{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> nos Secrets do Replit e reinicie o servidor de desenvolvimento.
          </InfoBox>
        )}
      </DialogContent>
    </Dialog>
  );
}
