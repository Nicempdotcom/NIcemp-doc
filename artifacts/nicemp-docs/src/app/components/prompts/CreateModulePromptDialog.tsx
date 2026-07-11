import React, { useState } from 'react';
import { PackagePlus, Sparkles, Copy, Check } from 'lucide-react';
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
  buildModuleCreationPrompt,
  type ModuleProject,
} from '@/services/prompts/ModuleCreationPromptGenerator';

/**
 * "Criar Módulos" — gera um prompt pronto para pedir ao Replit Agent a criação
 * de um novo domínio/módulo no projeto de destino, seguindo as convenções de
 * pasta usadas para que o NicEmp Docs detecte o módulo corretamente.
 */
export default function CreateModulePromptDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [moduleName, setModuleName] = useState('');
  const [project, setProject] = useState<ModuleProject>('NicEmp Docs');
  const [objective, setObjective] = useState('');
  const [hasPage, setHasPage] = useState(true);
  const [hasApi, setHasApi] = useState(false);

  const [prompt, setPrompt] = useState<string | null>(null);

  const canGenerate = moduleName.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const generated = buildModuleCreationPrompt({
      moduleName: moduleName.trim(),
      project,
      objective: objective.trim(),
      hasPage,
      hasApi,
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
      setModuleName('');
      setProject('NicEmp Docs');
      setObjective('');
      setHasPage(true);
      setHasApi(false);
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
            <PackagePlus className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">Criar Módulos</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            Gere um prompt para criar um novo domínio/módulo seguindo as convenções de pasta detectadas pelo NicEmp Docs.
          </p>
        </div>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — Criar Módulo
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para gerar um prompt que orienta o Replit Agent a criar um novo módulo seguindo as convenções de pasta usadas pelo projeto — garantindo que o NicEmp Docs detecte o módulo corretamente no próximo upload.
          </DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod-project">Projeto de destino</Label>
              <Select value={project} onValueChange={(v) => setProject(v as ModuleProject)}>
                <SelectTrigger id="mod-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NicEmp Docs">NicEmp Docs</SelectItem>
                  <SelectItem value="nicemp.com">nicemp.com</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-name">Nome do módulo / domínio</Label>
              <Input
                id="mod-name"
                placeholder="Ex: Relatorios, Clientes, Faturas"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use PascalCase, ex: Pedidos, ContasReceber. É o nome que aparecerá no NicEmp Docs como "Módulo: X".</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-objective">Objetivo do módulo</Label>
              <Textarea
                id="mod-objective"
                rows={3}
                placeholder="Ex: gerenciar o ciclo de vida das faturas — criação, envio, baixa e histórico de pagamentos..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>O módulo inclui…</Label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasPage}
                  onChange={(e) => setHasPage(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-foreground">Página própria (rota + item de menu)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasApi}
                  onChange={(e) => setHasApi(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-foreground">Endpoint de API próprio</span>
              </label>
            </div>
          </div>
        ) : (
          <Textarea
            value={prompt}
            readOnly
            rows={20}
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
