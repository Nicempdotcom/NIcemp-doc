import React, { useState, useCallback } from 'react';
import { LayoutTemplate, Sparkles, Copy, Check, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  buildComponentCreationPrompt,
  type ComponentProject,
  type ComponentCategory,
} from '@/services/prompts/ComponentCreationPromptGenerator';
import { usePromptObjectiveAI } from './usePromptObjectiveAI';

const CATEGORY_OPTIONS: { value: ComponentCategory; label: string }[] = [
  { value: 'ui',     label: 'UI genérico (botões, badges, cards)' },
  { value: 'layout', label: 'Layout (cabeçalho, sidebar, wrappers)' },
  { value: 'forms',  label: 'Formulários / inputs' },
  { value: 'outro',  label: 'Outro' },
];

/**
 * "Criar Componentes" — gera um prompt pronto para colar no Replit Agent
 * pedindo a criação de um novo componente reutilizável no projeto de destino.
 *
 * Nota estrutural: este gerador não possui um campo "objective" separado —
 * o campo "Props e comportamento esperado" cumpre esse papel. O botão
 * "Melhorar objetivo com IA" pré-preenche esse campo com o texto gerado.
 */
export default function CreateComponentPromptDialog() {
  const [open, setOpen]                     = useState(false);
  const [copied, setCopied]                 = useState(false);

  const [componentName, setComponentName]   = useState('');
  const [project, setProject]               = useState<ComponentProject>('NicEmp Docs');
  const [category, setCategory]             = useState<ComponentCategory>('ui');
  const [propsDescription, setPropsDescription] = useState('');
  const [userRequest, setUserRequest]       = useState('');

  const [prompt, setPrompt]                 = useState<string | null>(null);

  const { aiLoading, requestImprovement } = usePromptObjectiveAI();

  const canGenerate = componentName.trim().length > 0;

  const handleImproveWithAI = useCallback(async () => {
    const result = await requestImprovement({
      kind:        'component',
      name:        componentName.trim() || 'Novo componente',
      module:      `${project} — ${category}`,
      userRequest: userRequest.trim(),
    });
    if (result) setPropsDescription(result);
  }, [requestImprovement, componentName, project, category, userRequest]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const generated = buildComponentCreationPrompt({
      componentName:    componentName.trim(),
      project,
      category,
      propsDescription: propsDescription.trim(),
    });
    setPrompt(generated);
  };

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({ title: 'Prompt copiado', description: 'O prompt foi copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Copie o texto manualmente.', variant: 'destructive' });
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setComponentName('');
      setProject('NicEmp Docs');
      setCategory('ui');
      setPropsDescription('');
      setUserRequest('');
      setPrompt(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full text-left cursor-pointer"
      >
        <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col h-full hover:border-primary/40 hover:shadow-sm transition-all duration-150">
          <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">Criar Componentes</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            Gere um prompt pronto para pedir ao Replit Agent a criação de um novo componente reutilizável.
          </p>
        </div>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — Criar Componente
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para gerar um prompt pronto para colar na conversa com o Replit Agent. A ferramenta só gera o texto — ela não cria o componente por conta própria.
          </DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="comp-project">Projeto de destino</Label>
              <Select value={project} onValueChange={(v) => setProject(v as ComponentProject)}>
                <SelectTrigger id="comp-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NicEmp Docs">NicEmp Docs</SelectItem>
                  <SelectItem value="nicemp.com">nicemp.com</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-name">Nome do componente</Label>
              <Input
                id="comp-name"
                placeholder="Ex: MonthlyChart"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use PascalCase, ex: StatusCard, FilterInput.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ComponentCategory)}>
                <SelectTrigger id="comp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Melhorar objetivo com IA ──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="comp-user-request">Descreva o que você quer mudar</Label>
              <Textarea
                id="comp-user-request"
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

            <div className="space-y-1.5">
              <Label htmlFor="comp-props">Props e comportamento esperado</Label>
              <Textarea
                id="comp-props"
                rows={4}
                placeholder="Ex: recebe um array de registros e exibe como tabela com paginação; props: data[], pageSize, onRowClick..."
                value={propsDescription}
                onChange={(e) => setPropsDescription(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <Textarea
            value={prompt}
            readOnly
            rows={18}
            className="font-mono text-xs leading-relaxed resize-none"
            onFocus={(e) => e.currentTarget.select()}
          />
        )}

        <DialogFooter>
          {prompt === null ? (
            <>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGenerate} disabled={!canGenerate} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Gerar prompt
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setPrompt(null)}>
                Voltar
              </Button>
              <Button type="button" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado!' : 'Copiar prompt'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
