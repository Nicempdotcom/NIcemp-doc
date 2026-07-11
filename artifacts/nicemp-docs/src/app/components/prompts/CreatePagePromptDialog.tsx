import React, { useMemo, useState } from 'react';
import { PenLine, Sparkles, Copy, Check } from 'lucide-react';
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
  buildPageCreationPrompt,
  type NavGroupName,
} from '@/services/prompts/PageCreationPromptGenerator';

const NAV_GROUP_OPTIONS: NavGroupName[] = ['Plataforma', 'Documentação', 'Sistema'];

/** "Relatórios Mensais" -> "relatorios-mensais" */
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
 * "Criar Páginas" — gera um prompt pronto para colar no Replit Agent
 * pedindo a criação de uma nova página, seguindo as convenções do projeto
 * (ROUTES, App.tsx, Sidebar.tsx). A ferramenta apenas GERA O TEXTO do
 * prompt — ela não cria arquivos nem edita rotas por conta própria.
 */
export default function CreatePagePromptDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [pageName, setPageName] = useState('');
  const [routeSlug, setRouteSlug] = useState('');
  const [routeTouched, setRouteTouched] = useState(false);
  const [navGroup, setNavGroup] = useState<NavGroupName>('Plataforma');
  const [iconName, setIconName] = useState('');
  const [objective, setObjective] = useState('');

  const [prompt, setPrompt] = useState<string | null>(null);

  const effectiveSlug = routeTouched ? routeSlug : slugify(pageName);

  const canGenerate = pageName.trim().length > 0 && effectiveSlug.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const generated = buildPageCreationPrompt({
      pageName: pageName.trim(),
      routeKey: effectiveSlug.replace(/-/g, ''),
      routePath: `/${effectiveSlug}`,
      navGroup,
      iconName: iconName.trim() || 'FileText',
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
      setPageName('');
      setRouteSlug('');
      setRouteTouched(false);
      setNavGroup('Plataforma');
      setIconName('');
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
            <PenLine className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">Criar Páginas</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            Gere um prompt pronto para pedir ao Replit Agent a criação de uma nova página.
          </p>
        </div>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — Criar Página
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para gerar um prompt pronto para colar na conversa com o Replit
            Agent. A ferramenta só gera o texto — ela não cria a página nem edita rotas por conta própria.
          </DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="page-name">Nome da página</Label>
              <Input
                id="page-name"
                placeholder="Ex: Relatórios"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page-route">Rota</Label>
              <Input
                id="page-route"
                placeholder="ex-relatorios"
                value={effectiveSlug}
                onChange={(e) => {
                  setRouteTouched(true);
                  setRouteSlug(slugify(e.target.value));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente a partir do nome da página, mas pode ser editada.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page-nav-group">Grupo do menu</Label>
              <Select value={navGroup} onValueChange={(value) => setNavGroup(value as NavGroupName)}>
                <SelectTrigger id="page-nav-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NAV_GROUP_OPTIONS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page-icon">Ícone</Label>
              <Input
                id="page-icon"
                placeholder="Ex: FileText"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nome de um ícone de lucide-react, ex: FileText.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="page-objective">Objetivo da página</Label>
              <Textarea
                id="page-objective"
                placeholder="Descreva o que a página deve mostrar/fazer."
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
