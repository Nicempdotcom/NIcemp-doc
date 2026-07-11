import React, { useMemo, useState } from 'react';
import { Sparkles, Copy, Check, Search } from 'lucide-react';
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
import { Badge } from '@/app/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  ProjectRepository,
  PageRepository,
  ComponentRepository,
  HookRepository,
  ApiRepository,
  VersionRepository,
  VersionSnapshotRepository,
} from '@/services/storage';
import type { RiskLevel } from '@/services/storage/types';
import { DependencyGraph } from '@/services/graph/DependencyGraph';
import { buildEntityNameIndex, resolveNames } from '@/services/prompts/resolveDependencyNames';
import {
  buildReplitPrompt,
  type PromptEntityKind,
  type PromptEntityInput,
} from '@/services/prompts/PromptGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Purpose = 'refactor' | 'layout' | 'bugfix' | 'docs' | 'spec';

interface PickableEntity {
  id: string;
  kind: PromptEntityKind;
  name: string;
  location: string;
  module: string;
  riskLevel: RiskLevel;
  relationships: string[];
  components: string[];
  hooks: string[];
  apis: string[];
}

interface EntityPickerPromptDialogProps {
  purpose: Purpose;
  icon: React.ComponentType<{ className?: string }>;
  triggerTitle: string;
  triggerDescription: string;
}

// ─── Per-purpose configuration ────────────────────────────────────────────────

const TASK_LABELS: Record<Purpose, string> = {
  refactor: 'Refatoração',
  layout:   'Atualização de Layout',
  bugfix:   'Correção de Bug',
  docs:     'Documentar Código',
  spec:     'Gerar Spec',
};

const DIALOG_DESCRIPTIONS: Record<Purpose, string> = {
  refactor: 'Selecione uma entidade existente no projeto e descreva o motivo da refatoração. O prompt gerado instrui o Replit Agent a melhorar o código SEM mudar o comportamento externo.',
  layout:   'Selecione uma entidade existente e descreva o que precisa mudar visualmente. O prompt instrui o Replit Agent a atualizar estilo e layout, sem alterar lógica ou dados.',
  bugfix:   'Selecione a entidade onde o bug ocorre e descreva o que está errado e o que deveria acontecer. O prompt orienta o Replit Agent a identificar e corrigir a causa raiz.',
  docs:     'Selecione uma entidade existente para gerar um prompt que pede ao Replit Agent adicionar/melhorar comentários, JSDoc e documentação sem alterar o código funcional.',
  spec:     'Selecione uma entidade existente para gerar um prompt que pede ao Replit Agent criar um arquivo .md de especificação técnica, sem alterar nenhum código.',
};

const KIND_CATEGORY_LABELS: Record<PromptEntityKind, string> = {
  page:      'Página',
  component: 'Componente',
  hook:      'Hook',
  api:       'API',
  module:    'Módulo',
};

function buildObjectiveOverride(
  purpose: Purpose,
  entity: PickableEntity,
  fields: Record<string, string>,
): string {
  const kindLabel = KIND_CATEGORY_LABELS[entity.kind].toLowerCase();
  switch (purpose) {
    case 'refactor':
      return [
        `Refatorar o ${kindLabel} "${entity.name}" em \`${entity.location}\`, SEM mudar o comportamento observável para quem usa.`,
        '',
        `Motivo: ${fields.reason || '(não especificado)'}`,
      ].join('\n');

    case 'layout':
      return [
        `Atualizar o layout/estilo do ${kindLabel} "${entity.name}" em \`${entity.location}\`.`,
        `Mudança desejada: ${fields.change || '(não especificada)'}`,
        'Não alterar lógica, dados ou comportamento — só a aparência.',
      ].join('\n');

    case 'bugfix':
      return [
        `Corrigir um bug no ${kindLabel} "${entity.name}" em \`${entity.location}\`.`,
        '',
        `Comportamento atual (errado): ${fields.actual || '(não descrito)'}`,
        `Comportamento esperado: ${fields.expected || '(não descrito)'}`,
        '',
        'Investigue a causa raiz antes de aplicar a correção — não aplique um "band-aid" que só esconde o sintoma.',
      ].join('\n');

    case 'docs':
      return [
        `Adicionar/melhorar a documentação (comentários, JSDoc, README de pasta se fizer sentido) do ${kindLabel} "${entity.name}" em \`${entity.location}\`, explicando o que ele faz, por que existe e como as dependências listadas abaixo se encaixam.`,
        'Não alterar nenhum comportamento de código, só documentação.',
      ].join('\n');

    case 'spec':
      return [
        `Escrever uma especificação técnica (arquivo .md separado, não altera o código) descrevendo o ${kindLabel} "${entity.name}" em \`${entity.location}\`: o que faz, como se encaixa no módulo "${entity.module}", e suas dependências.`,
        `Público-alvo: ${fields.audience || 'Time técnico'} — ajuste o nível de detalhe técnico conforme isso.`,
      ].join('\n');
  }
}

function getExtraChecklist(purpose: Purpose): string[] {
  switch (purpose) {
    case 'refactor':
      return ['O comportamento antes e depois da refatoração é idêntico para quem usa (validado manualmente).'];
    case 'layout':
      return [
        'Nenhuma lógica ou dado foi alterado, só estilo/layout.',
        'Testado em desktop e mobile (responsivo).',
      ];
    case 'bugfix':
      return [
        'A causa raiz foi identificada e documentada (não só o sintoma).',
        'O bug relatado não reproduz mais após a correção.',
      ];
    case 'docs':
      return ['Nenhuma linha de código funcional foi alterada, só comentários/documentação.'];
    case 'spec':
      return ['O arquivo de spec foi criado na pasta de documentação do projeto (perguntar ao usuário onde, se não houver convenção clara), sem alterar nenhum arquivo de código.'];
  }
}

// ─── Extra fields rendered per purpose ───────────────────────────────────────

function ExtraFields({
  purpose,
  fields,
  onChange,
}: {
  purpose: Purpose;
  fields: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  switch (purpose) {
    case 'refactor':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="ep-reason">O que está difícil de manter hoje / motivo da refatoração</Label>
          <Textarea
            id="ep-reason"
            rows={3}
            placeholder="Ex: o componente está com 300 linhas e mistura lógica de negócio com renderização..."
            value={fields.reason ?? ''}
            onChange={(e) => onChange('reason', e.target.value)}
          />
        </div>
      );
    case 'layout':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="ep-change">O que precisa mudar visualmente</Label>
          <Textarea
            id="ep-change"
            rows={3}
            placeholder="Ex: o botão de ação precisa ter mais destaque, mudar para cor primária e aumentar o padding..."
            value={fields.change ?? ''}
            onChange={(e) => onChange('change', e.target.value)}
          />
        </div>
      );
    case 'bugfix':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ep-actual">O que está acontecendo (comportamento atual/errado)</Label>
            <Textarea
              id="ep-actual"
              rows={3}
              placeholder="Ex: ao clicar em Salvar, a página recarrega e os dados digitados são perdidos..."
              value={fields.actual ?? ''}
              onChange={(e) => onChange('actual', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-expected">O que deveria acontecer (comportamento esperado)</Label>
            <Textarea
              id="ep-expected"
              rows={3}
              placeholder="Ex: ao clicar em Salvar, os dados são enviados e uma mensagem de sucesso é exibida..."
              value={fields.expected ?? ''}
              onChange={(e) => onChange('expected', e.target.value)}
            />
          </div>
        </div>
      );
    case 'docs':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="ep-detail">Nível de detalhe</Label>
          <Select value={fields.detail ?? 'Completo'} onValueChange={(v) => onChange('detail', v)}>
            <SelectTrigger id="ep-detail">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Básico">Básico — comentários de alto nível em cada bloco</SelectItem>
              <SelectItem value="Completo">Completo — JSDoc em todas as funções/props exportadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'spec':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="ep-audience">Público-alvo da especificação</Label>
          <Select value={fields.audience ?? 'Time técnico'} onValueChange={(v) => onChange('audience', v)}>
            <SelectTrigger id="ep-audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Time técnico">Time técnico — linguagem técnica, detalhes de implementação</SelectItem>
              <SelectItem value="Stakeholder não-técnico">Stakeholder não-técnico — linguagem simples, foco no impacto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EntityPickerPromptDialog({
  purpose,
  icon: Icon,
  triggerTitle,
  triggerDescription,
}: EntityPickerPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PickableEntity | null>(null);
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const project = useMemo(() => ProjectRepository.findLatest(), []);

  const allEntities = useMemo((): PickableEntity[] => {
    if (!project) return [];
    const pid = project.id;
    const pages = PageRepository.findByProject(pid).map((e) => ({
      id: e.id, kind: 'page' as const, name: e.name, location: e.location,
      module: e.module, riskLevel: e.riskLevel,
      relationships: e.relationships, components: e.components, hooks: e.hooks, apis: e.apis,
    }));
    const components = ComponentRepository.findByProject(pid).map((e) => ({
      id: e.id, kind: 'component' as const, name: e.name, location: e.location,
      module: e.module, riskLevel: e.riskLevel,
      relationships: e.relationships, components: [], hooks: [], apis: [],
    }));
    const hooks = HookRepository.findByProject(pid).map((e) => ({
      id: e.id, kind: 'hook' as const, name: e.name, location: e.location,
      module: e.module, riskLevel: e.riskLevel,
      relationships: e.relationships, components: [], hooks: [], apis: [],
    }));
    const apis = ApiRepository.findByProject(pid).map((e) => ({
      id: e.id, kind: 'api' as const, name: e.name, location: e.location,
      module: e.module, riskLevel: e.riskLevel,
      relationships: e.relationships, components: [], hooks: [], apis: [],
    }));
    // Derive unique modules as synthetic entities
    const moduleNames = [...new Set([...pages, ...components, ...hooks, ...apis].map((e) => e.module))].filter(Boolean);
    const modules: PickableEntity[] = moduleNames.map((name) => ({
      id: `module:${name}`, kind: 'module' as const, name,
      location: `(módulo "${name}")`, module: name, riskLevel: 'medium' as RiskLevel,
      relationships: [], components: [], hooks: [], apis: [],
    }));
    return [...pages, ...components, ...hooks, ...apis, ...modules];
  }, [project]);

  const graph = useMemo(() => {
    if (!project) return null;
    const ver = VersionRepository.findLatest(project.id);
    if (!ver) return null;
    const snap = VersionSnapshotRepository.findByVersion(ver.id);
    return snap ? DependencyGraph.build(snap) : null;
  }, [project]);

  const nameIndex = useMemo(
    () => (project ? buildEntityNameIndex(project.id) : new Map<string, string>()),
    [project],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntities;
    return allEntities.filter(
      (e) => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.module.toLowerCase().includes(q),
    );
  }, [allEntities, search]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const setField = (key: string, value: string) =>
    setExtraFields((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    if (!selected) return;
    const neighbors = graph ? DependencyGraph.getNeighbors(graph, selected.id) : [];
    const deps = resolveNames(
      [...selected.relationships, ...selected.components, ...selected.hooks, ...selected.apis],
      nameIndex,
    );
    const neighborNames = neighbors.map((n) => n.name);
    const allDeps = [...new Set([...deps, ...neighborNames])];

    const input: PromptEntityInput = {
      kind:         selected.kind,
      name:         selected.name,
      location:     selected.location,
      module:       selected.module,
      riskLevel:    selected.riskLevel,
      dependencies: allDeps,
    };

    const generated = buildReplitPrompt(input, {
      taskLabel:        TASK_LABELS[purpose],
      objectiveOverride: buildObjectiveOverride(purpose, selected, extraFields),
      extraChecklist:   getExtraChecklist(purpose),
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
      setSearch('');
      setSelected(null);
      setExtraFields({});
      setPrompt(null);
      setCopied(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full text-left cursor-pointer"
      >
        <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col h-full hover:border-primary/40 hover:shadow-sm transition-all duration-150">
          <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">{triggerTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{triggerDescription}</p>
        </div>
      </button>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — {TASK_LABELS[purpose]}
          </DialogTitle>
          <DialogDescription>{DIALOG_DESCRIPTIONS[purpose]}</DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-5">
            {/* Entity picker */}
            {!project ? (
              <p className="text-sm text-muted-foreground rounded-md border border-border p-3">
                Nenhum projeto analisado. Faça upload de um ZIP na tela de Upload para que as entidades apareçam aqui.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Selecione uma entidade do projeto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, arquivo ou módulo…"
                    className="pl-9"
                  />
                </div>

                {selected && (
                  <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">{KIND_CATEGORY_LABELS[selected.kind]}</Badge>
                      <span className="text-sm font-medium text-foreground truncate">{selected.name}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">{selected.location}</span>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0 ml-2"
                      onClick={() => setSelected(null)}
                    >
                      Trocar
                    </button>
                  </div>
                )}

                {!selected && (
                  <div className="rounded-md border border-border divide-y divide-border max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">Nenhuma entidade encontrada.</p>
                    ) : (
                      filtered.slice(0, 80).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelected(e)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                        >
                          <Badge variant="outline" className="text-[10px] shrink-0">{KIND_CATEGORY_LABELS[e.kind]}</Badge>
                          <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                          <span className="text-xs text-muted-foreground font-mono truncate flex-1 text-right hidden sm:block">{e.location}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Purpose-specific fields */}
            {selected && (
              <ExtraFields purpose={purpose} fields={extraFields} onChange={setField} />
            )}
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
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!selected}
                className="gap-1.5"
              >
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
