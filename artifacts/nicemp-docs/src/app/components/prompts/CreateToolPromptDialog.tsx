import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Sparkles, Copy, Check, Plus, Loader2, Wand2 } from 'lucide-react';
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
} from '@/services/prompts/ToolCreationPromptGenerator';
import { ProjectRepository, ToolCategoryRepository, CmsCategoryRepository } from '@/services/storage';
import { usePromptObjectiveAI } from './usePromptObjectiveAI';

// ─── Fallback categories (used when no analysis has been done yet) ─────────────

const FALLBACK_CATEGORIES = ['Financeiro', 'Tributário', 'Matemática', 'Gestão'];

const NEW_CATEGORY_SENTINEL = '__new__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryOption {
  name: string;
  toolCount: number | null; // null = fallback (no count known)
}

/**
 * "Criar Ferramenta" — gera um prompt pronto para colar no Replit Agent
 * pedindo a criação de uma nova calculadora/ferramenta no site nicemp.com
 * (projeto separado, artifacts/nicemp/). A ferramenta apenas GERA O TEXTO
 * do prompt — ela não cria arquivos nem edita rotas/catálogos sozinha.
 */
export default function CreateToolPromptDialog() {
  const [open, setOpen]               = useState(false);
  const [copied, setCopied]           = useState(false);

  const [toolName, setToolName]       = useState('');
  const [routeSlug, setRouteSlug]     = useState('');
  const [routeTouched, setRouteTouched] = useState(false);
  const [category, setCategory]       = useState('Financeiro');
  const [iconName, setIconName]       = useState('');
  const [featureOnHome, setFeatureOnHome] = useState(false);
  const [objective, setObjective]     = useState('');
  const [userRequest, setUserRequest] = useState('');

  const [prompt, setPrompt]           = useState<string | null>(null);

  // ── Dynamic categories ─────────────────────────────────────────────────────
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(
    FALLBACK_CATEGORIES.map((name) => ({ name, toolCount: null })),
  );
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const [newCategoryError, setNewCategoryError] = useState('');
  const [insertingCategory, setInsertingCategory] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const { aiLoading, requestImprovement } = usePromptObjectiveAI();

  // ── Load categories when dialog opens ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingCategories(true);

    (async () => {
      try {
        const cmsCategories = await CmsCategoryRepository.findAll();
        if (cancelled) return;

        if (cmsCategories.length > 0) {
          const opts = cmsCategories.map((c) => ({ name: c.name, toolCount: null as null }));
          setCategoryOptions(opts);
          setCategory(opts[0].name);
          setIsNewCategory(false);
          return;
        }

        const project = ProjectRepository.findLatest();
        if (project) {
          const stored = ToolCategoryRepository.findByProject(project.id);
          if (!cancelled && stored.length > 0) {
            setCategoryOptions(stored.map((c) => ({ name: c.name, toolCount: c.toolCount })));
            setCategory(stored[0].name);
            setIsNewCategory(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[CreateToolPromptDialog] Erro ao carregar categorias:', err);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open]);

  const effectiveSlug = routeTouched ? routeSlug : slugify(toolName);
  const canGenerate   = toolName.trim().length > 0 && effectiveSlug.trim().length > 0 && category.trim().length > 0;

  const handleSelectCategory = (value: string) => {
    if (value === NEW_CATEGORY_SENTINEL) {
      setShowNewCategoryInput(true);
      setNewCategoryDraft('');
      setNewCategoryError('');
      return;
    }
    setCategory(value);
    setIsNewCategory(false);
    setShowNewCategoryInput(false);
  };

  const handleConfirmNewCategory = async () => {
    const trimmed = newCategoryDraft.trim();
    if (!trimmed) {
      setNewCategoryError('Digite um nome para a categoria.');
      return;
    }
    const existing = categoryOptions.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      setCategory(existing.name);
      setIsNewCategory(false);
      setShowNewCategoryInput(false);
      setNewCategoryDraft('');
      setNewCategoryError('');
      return;
    }

    setInsertingCategory(true);
    setNewCategoryError('');

    try {
      const created = await CmsCategoryRepository.create(trimmed);
      const newOpt: CategoryOption = { name: created.name, toolCount: null };
      setCategoryOptions((prev) => {
        const merged = [...prev, newOpt];
        merged.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return merged;
      });
      setCategory(created.name);
      setIsNewCategory(false);
      setShowNewCategoryInput(false);
      setNewCategoryDraft('');
      toast({ title: 'Categoria criada', description: `"${created.name}" foi adicionada ao banco com sucesso.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao criar categoria.';
      setNewCategoryError(msg);
    } finally {
      setInsertingCategory(false);
    }
  };

  const handleCancelNewCategory = () => {
    setShowNewCategoryInput(false);
    setNewCategoryDraft('');
    setNewCategoryError('');
  };

  const handleImproveWithAI = useCallback(async () => {
    const result = await requestImprovement({
      kind:        'tool',
      name:        toolName.trim() || 'Nova ferramenta',
      location:    `/ferramentas/${effectiveSlug}`,
      module:      category,
      userRequest: userRequest.trim(),
    });
    if (result) setObjective(result);
  }, [requestImprovement, toolName, effectiveSlug, category, userRequest]);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const generated = buildToolCreationPrompt({
      toolName:      toolName.trim(),
      routeKey:      effectiveSlug.replace(/-/g, ''),
      routePath:     `/ferramentas/${effectiveSlug}`,
      category,
      iconName:      iconName.trim() || 'Calculator',
      featureOnHome,
      objective:     objective.trim(),
      isNewCategory,
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
      setToolName('');
      setRouteSlug('');
      setRouteTouched(false);
      setCategory('Financeiro');
      setIsNewCategory(false);
      setShowNewCategoryInput(false);
      setNewCategoryDraft('');
      setNewCategoryError('');
      setIconName('');
      setFeatureOnHome(false);
      setObjective('');
      setUserRequest('');
      setPrompt(null);
      setCopied(false);
      setCategoryOptions(FALLBACK_CATEGORIES.map((name) => ({ name, toolCount: null })));
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

            {/* ── Categoria ── */}
            <div className="space-y-1.5">
              <Label htmlFor="tool-category">Categoria</Label>

              {isNewCategory && !showNewCategoryInput && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-sm font-medium text-primary">
                    {category}
                    <span className="text-[10px] font-normal text-muted-foreground">(nova)</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => {
                      setIsNewCategory(false);
                      setCategory(categoryOptions[0]?.name ?? 'Financeiro');
                    }}
                  >
                    Alterar
                  </button>
                </div>
              )}

              {!isNewCategory && !showNewCategoryInput && (
                <Select value={category} onValueChange={handleSelectCategory} disabled={loadingCategories}>
                  <SelectTrigger id="tool-category">
                    {loadingCategories
                      ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando categorias…</span>
                      : <SelectValue />}
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.name} value={opt.name}>
                        {opt.toolCount !== null
                          ? `${opt.name} (${opt.toolCount})`
                          : opt.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_CATEGORY_SENTINEL} className="text-primary font-medium">
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Criar nova categoria
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {showNewCategoryInput && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Nome da nova categoria, ex: Jurídico"
                      value={newCategoryDraft}
                      onChange={(e) => {
                        setNewCategoryDraft(e.target.value);
                        setNewCategoryError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewCategory(); }
                        if (e.key === 'Escape') handleCancelNewCategory();
                      }}
                      className={newCategoryError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmNewCategory}
                      disabled={insertingCategory}
                      className="gap-1.5"
                    >
                      {insertingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {insertingCategory ? 'Salvando…' : 'Confirmar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelNewCategory}
                      disabled={insertingCategory}
                    >
                      Cancelar
                    </Button>
                  </div>
                  {newCategoryError && (
                    <p className="text-xs text-destructive">{newCategoryError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    O prompt gerado incluirá um aviso para que o Replit Agent crie a nova categoria
                    no catálogo do nicemp.com e verifique o filtro de <code>/ferramentas</code>.
                  </p>
                </div>
              )}
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

            {/* ── Melhorar objetivo com IA ──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="tool-user-request">Descreva o que você quer mudar</Label>
              <Textarea
                id="tool-user-request"
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
