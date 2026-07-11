import React, { useMemo, useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { buildReplitPrompt, type PromptEntityInput } from '@/services/prompts/PromptGenerator';

interface GeneratePromptButtonProps extends PromptEntityInput {
  /** Render as an icon-only button (for compact table rows). Defaults to false. */
  iconOnly?: boolean;
}

/**
 * "Gerar Prompt para Replit" — available on every Página, Componente, Hook,
 * API e Módulo (EPIC 09). Opens a dialog with a ready-to-paste prompt
 * (objetivo, arquivos permitidos/proibidos, dependências, risco e checklist
 * de testes) and a one-click copy button.
 */
export default function GeneratePromptButton({ iconOnly = false, ...entity }: GeneratePromptButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildReplitPrompt(entity), [
    entity.kind, entity.name, entity.location, entity.module, entity.riskLevel,
    entity.dependencies, entity.details,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({ title: 'Prompt copiado', description: 'O prompt foi copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Copie o texto manualmente selecionando-o abaixo.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? 'icon' : 'sm'}
        className={iconOnly ? undefined : 'gap-1.5 text-xs'}
        title="Gerar Prompt para Replit"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {!iconOnly && 'Gerar Prompt'}
      </Button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Prompt para Replit — {entity.name}
          </DialogTitle>
          <DialogDescription>
            Copie este prompt e cole na conversa com o Replit Agent para pedir a alteração com segurança e escopo bem definidos.
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
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
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
