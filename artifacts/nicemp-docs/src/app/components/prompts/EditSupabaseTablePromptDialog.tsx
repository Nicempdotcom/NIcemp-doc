import React, { useState } from 'react';
import { Sparkles, Copy, Check, Database } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { buildEditSupabaseTablePrompt, type ChangeType } from '@/services/prompts/EditSupabaseTablePromptGenerator';
import type { LiveColumn } from '@/services/engine/LiveSupabaseIntrospector';
import type { TableUsageEntry } from '@/services/engine/LiveTableUsageAnalyzer';

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  tableName:     string;
  columns:       LiveColumn[];
  usages:        TableUsageEntry[];
}

const CHANGE_TYPES: ChangeType[] = [
  'Adicionar coluna',
  'Alterar dado existente',
  'Inserir linha',
  'Outra',
];

export default function EditSupabaseTablePromptDialog({
  open,
  onOpenChange,
  tableName,
  columns,
  usages,
}: Props) {
  const [changeType, setChangeType]   = useState<ChangeType>('Adicionar coluna');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt]           = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);

  const canGenerate = description.trim().length > 0;

  function handleGenerate() {
    if (!canGenerate) return;
    const generated = buildEditSupabaseTablePrompt({
      tableName,
      changeType,
      description: description.trim(),
      columns,
      usages,
    });
    setPrompt(generated);
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({ title: 'Prompt copiado', description: 'O prompt foi copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Copie o texto manualmente.', variant: 'destructive' });
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setChangeType('Adicionar coluna');
      setDescription('');
      setPrompt(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar prompt — Alterar tabela <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{tableName}</code>
          </DialogTitle>
          <DialogDescription>
            Descreva a mudança que precisa ser feita. O prompt gerado pode ser colado no Replit Agent
            do projeto nicemp.com. Esta ferramenta apenas gera texto — nenhuma mudança é aplicada automaticamente.
          </DialogDescription>
        </DialogHeader>

        {prompt === null ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tabela</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                {tableName}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="change-type">Tipo de mudança</Label>
              <Select value={changeType} onValueChange={(v) => setChangeType(v as ChangeType)}>
                <SelectTrigger id="change-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="change-description">Descrição da mudança</Label>
              <Textarea
                id="change-description"
                placeholder={
                  changeType === 'Adicionar coluna'
                    ? 'Ex: Adicionar coluna published_at (timestamp, nullable) para controlar a data de publicação.'
                    : changeType === 'Inserir linha'
                    ? 'Ex: Inserir a categoria "Jurídico" com id=15.'
                    : 'Descreva detalhadamente o que precisa ser alterado e por quê.'
                }
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {columns.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {columns.length} coluna{columns.length !== 1 ? 's' : ''} atual{columns.length !== 1 ? 'is' : ''} serão incluídas no prompt como contexto.
                </p>
              )}
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
