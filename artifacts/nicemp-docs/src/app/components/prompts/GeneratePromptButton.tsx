import React, { useMemo, useState, useCallback } from 'react';
import { Sparkles, Copy, Check, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { buildReplitPrompt, type PromptEntityInput } from '@/services/prompts/PromptGenerator';
import { usePromptObjectiveAI } from './usePromptObjectiveAI';

interface GeneratePromptButtonProps extends PromptEntityInput {
  /** Render as an icon-only button (for compact table rows). Defaults to false. */
  iconOnly?: boolean;
}

/**
 * "Gerar Prompt para Replit" — available on every Página, Componente, Hook,
 * API e Módulo (EPIC 09). Opens a dialog with a ready-to-paste prompt
 * (objetivo, arquivos permitidos/proibidos, dependências, risco e checklist
 * de testes) and a one-click copy button.
 *
 * Optionally the user can describe what they want to change in plain Portuguese
 * and click "Melhorar objetivo com IA" to have the Workers AI rewrite the
 * objective section before copying. The rest of the prompt (allowed/forbidden
 * files, dependencies, risk, checklist) is never touched by the AI.
 */
export default function GeneratePromptButton({ iconOnly = false, ...entity }: GeneratePromptButtonProps) {
  const [open, setOpen]                         = useState(false);
  const [copied, setCopied]                     = useState(false);
  const [userRequest, setUserRequest]           = useState('');
  const [objectiveOverride, setObjectiveOverride] = useState<string | null>(null);

  const { aiLoading, requestImprovement } = usePromptObjectiveAI();

  const prompt = useMemo(
    () => buildReplitPrompt(entity, { objectiveOverride: objectiveOverride ?? undefined }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity.kind, entity.name, entity.location, entity.module, entity.riskLevel,
     entity.dependencies, entity.details, objectiveOverride],
  );

  const handleImproveWithAI = useCallback(async () => {
    const result = await requestImprovement({
      kind:         entity.kind,
      name:         entity.name,
      location:     entity.location,
      module:       entity.module,
      description:  entity.details
        ? Object.entries(entity.details).map(([k, v]) => `${k}: ${v}`).join('; ')
        : '',
      dependencies: entity.dependencies.join(', '),
      userRequest:  userRequest.trim(),
    });
    if (result) setObjectiveOverride(result);
  }, [requestImprovement, entity, userRequest]);

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

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setCopied(false);
      setUserRequest('');
      setObjectiveOverride(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="space-y-3">
          {/* ── Melhorar objetivo com IA ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="gpb-user-request">Descreva o que você quer mudar</Label>
            <Textarea
              id="gpb-user-request"
              placeholder="Ex.: quero que esse botão fique desabilitado enquanto a página carrega"
              rows={2}
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!userRequest.trim() || aiLoading}
            onClick={handleImproveWithAI}
          >
            {aiLoading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando...</>
              : <><Wand2 className="h-3.5 w-3.5" />Melhorar objetivo com IA</>}
          </Button>

          {/* ── Prompt final (somente leitura) ───────────────────────────── */}
          <Textarea
            value={prompt}
            readOnly
            rows={14}
            className="font-mono text-xs leading-relaxed resize-none"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>

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
