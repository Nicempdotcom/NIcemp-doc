import React, { useState } from 'react';
import { FileStack, FileText, Layers, Zap, Globe, Table as TableIcon, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/utils';
import type { VersionEntity, VersionSnapshotEntity } from '@/services/storage/types';
import VersionEntityList from './VersionEntityList';

interface VersionCardProps {
  version: VersionEntity;
  snapshot?: VersionSnapshotEntity;
  isLatest: boolean;
  selected: boolean;
  selectionDisabled: boolean;
  onToggleSelect: () => void;
  onCompareWithPrevious?: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const STAT_ITEMS: { key: keyof VersionEntity['stats']; label: string; icon: React.ElementType }[] = [
  { key: 'totalFiles', label: 'Arquivos',    icon: FileStack },
  { key: 'pages',      label: 'Páginas',     icon: FileText  },
  { key: 'components', label: 'Componentes', icon: Layers    },
  { key: 'hooks',      label: 'Hooks',       icon: Zap       },
  { key: 'apis',       label: 'APIs',        icon: Globe     },
  { key: 'tables',     label: 'Tabelas',     icon: TableIcon },
];

export default function VersionCard({
  version, snapshot, isLatest, selected, selectionDisabled, onToggleSelect, onCompareWithPrevious,
}: VersionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative pl-10">
      {/* Timeline dot + connector */}
      <span className={cn(
        'absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
        isLatest ? 'border-primary bg-primary/15' : 'border-border bg-card',
      )}>
        <span className={cn('h-2 w-2 rounded-full', isLatest ? 'bg-primary' : 'bg-muted-foreground/50')} />
      </span>

      <div className="rounded-lg border border-card-border bg-card p-4 mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <Checkbox
            checked={selected}
            disabled={selectionDisabled && !selected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
            aria-label="Selecionar para comparação"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{version.name}</span>
              {isLatest && (
                <Badge className="bg-primary/10 text-primary border-transparent hover:bg-primary/10 text-[10px]">Mais recente</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(version.snapshotAt)} às {formatTime(version.snapshotAt)}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {onCompareWithPrevious && (
              <Button variant="ghost" size="sm" onClick={onCompareWithPrevious} className="gap-1.5 text-muted-foreground">
                <GitCompare className="h-3.5 w-3.5" />
                Comparar com anterior
              </Button>
            )}
            <Button
              variant="outline" size="sm" onClick={() => setOpen((v) => !v)}
              disabled={!snapshot}
              className="gap-1.5"
            >
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? 'Fechar' : 'Abrir versão'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
          {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex flex-col items-center gap-1 rounded-md bg-muted/30 py-2.5">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{version.stats[key]}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {open && (
          <div className="mt-4 pt-4 border-t border-border">
            {snapshot ? (
              <VersionEntityList snapshot={snapshot} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta versão foi analisada antes do histórico detalhado existir e não possui dados de snapshot.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
