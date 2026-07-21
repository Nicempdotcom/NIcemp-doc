/**
 * DuplicateTableCleanupPromptDialog
 *
 * Exibe o prompt gerado por DuplicateTableCleanupPromptGenerator em um dialog
 * copiável. Segue o mesmo padrão do EditSupabaseTablePromptDialog:
 *  - Apenas gera texto, nunca executa SQL.
 *  - Credenciais nunca aparecem no texto gerado.
 */
import React, { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Button }      from '@/app/components/ui/button';
import { Textarea }    from '@/app/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  buildDuplicateTableCleanupPrompt,
  type DuplicateTableCleanupInput,
} from '@/services/prompts/DuplicateTableCleanupPromptGenerator';

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  input:         DuplicateTableCleanupInput | null;
}

export default function DuplicateTableCleanupPromptDialog({ open, onOpenChange, input }: Props) {
  const [copied, setCopied] = useState(false);

  const prompt = input ? buildDuplicateTableCleanupPrompt(input) : '';

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({
        title:       'Prompt copiado',
        description: 'O prompt foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title:       'Não foi possível copiar',
        description: 'Copie o texto manualmente.',
        variant:     'destructive',
      });
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setCopied(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Prompt de limpeza —{' '}
            {input
              ? <><code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{input.dropTable}</code></>
              : 'tabela duplicada'}
          </DialogTitle>
          <DialogDescription>
            Copie o texto abaixo e cole no chat do Replit Agent do projeto nicemp.com.
            Esta ferramenta apenas gera texto — nenhuma mudança é aplicada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={prompt}
          readOnly
          rows={18}
          className="font-mono text-xs leading-relaxed resize-none"
          onFocus={(e) => e.currentTarget.select()}
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado!' : 'Copiar prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
