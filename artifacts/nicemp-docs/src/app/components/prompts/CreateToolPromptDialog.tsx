import React, { useState } from 'react';
import { Calculator, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  buildToolCreationPrompt,
  type ToolCategory,
} from '@/services/prompts/ToolCreationPromptGenerator';

const CATEGORY_OPTIONS: ToolCategory[] = ['Financeiro', 'Tributário', 'Matemática', 'Gestão'];

/** "Calculadora de Depreciação" -> "calculadora-de-depreciacao" */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * "Criar Ferramenta" — gera um prompt pronto para colar no Replit Agent
 * pedindo a criação de uma nova calculadora/ferramenta no site nicemp.com
 * (projeto separado, artifacts/nicemp/). A ferramenta apenas GERA O TEXTO
 * do prompt — ela não cria arquivos nem edita rotas/catálogos sozinha.
 */
export default function CreateToolPromptDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [toolName, setToolName] = useState('');
  const [routeSlug, setRouteSlug] = useState('');
  const [routeTouched, setRouteTouched] = useState(false);
  const [category, setCategory] = useState<ToolCategory>('Financeiro');
  const [iconName, setIconName] = useState('');
  const [featureOnHome, setFeatureOnHome] = useState(false);
  const [objective, setObjective] = useState('');

  const [prompt, setPrompt] = useState<string | null>(null);

  const effectiveSlug = routeTouched ? routeSlug : slugify(toolName);
  const canGenerate = toolName.trim().length > 0 && effectiveSlug.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const generated = buildToolCreationPrompt({
      toolName: toolName.trim(),
      routeKey: effectiveSlug.replace(/-/g, ''),
      routePath: `/ferramentas/${effectiveSlug}`,
      category,
      iconName: iconName.trim() || 'Calculator',
      featureOnHome,
      objective: objective.trim(),
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
      toast({ title: 'Não foi possível copiar', description: 'Copie o texto manualmente selecionando-o abaixo.', variant: 'destructive' });
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset the form for the next time the dialog is opened.
      setToolName('');
      setRouteSlug('');
      setRouteTouched(false);
      setCategory('Financeiro');
      setIconName('');
      setFeatureOnHome(false);
      setObjective('');
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
            <Calculator className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">Criar Ferramenta</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            Gere um prompt pronto para pedir ao Replit Agent uma nova calculadora no nicemp.com.
          </p>
        </div>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — Criar Ferramenta
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para gerar um prompt pronto para colar na conversa com o Replit
            Agent no projeto nicemp.com. A ferramenta só gera o texto — ela não cria a calculadora nem
            edita rotas/catálogos por conta própria.
          </DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tool-name">Nome da ferramenta</Label>
              <Input
                id="tool-name"
                placeholder="Ex: Calculadora de Depreciação"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-route">Rota</Label>
              <Input
                id="tool-route"
                placeholder="calculadora-de-depreciacao"
                value={effectiveSlug}
                onChange={(e) => {
                  setRouteTouched(true);
                  setRouteSlug(slugify(e.target.value));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente a partir do nome da ferramenta, mas pode ser editada. A
                ferramenta ficará em <code>/ferramentas/{effectiveSlug || '...'}</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-category">Categoria</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ToolCategory)}>
                <SelectTrigger id="tool-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-icon">Ícone</Label>
              <Input
                id="tool-icon"
                placeholder="Ex: Calculator"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nome de um ícone de lucide-react, ex: Calculator.</p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="tool-feature-home">Destacar na home?</Label>
                <p className="text-xs text-muted-foreground">
                  Se ligado, o prompt também pede pra adicionar a ferramenta em ToolsSection e ToolsCarousel.
                </p>
              </div>
              <Switch id="tool-feature-home" checked={featureOnHome} onCheckedChange={setFeatureOnHome} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-objective">Objetivo</Label>
              <Textarea
                id="tool-objective"
                placeholder="Descreva o que a ferramenta calcula/faz."
                rows={4}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
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
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
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
