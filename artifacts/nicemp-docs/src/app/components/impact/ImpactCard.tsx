import React from 'react';
import { FileText, Layers, Zap, Globe, Table as TableIcon, ArrowDown } from 'lucide-react';
import RiskBadge from '@/app/components/docs/RiskBadge';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/utils';
import type { ImpactEntry } from '@/services/impact/ImpactAnalyzer';
import type { NodeCategory } from '@/services/graph/DependencyGraph';

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  page:      FileText,
  component: Layers,
  hook:      Zap,
  api:       Globe,
  table:     TableIcon,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  page:      'Página',
  component: 'Componente',
  hook:      'Hook',
  api:       'API',
  table:     'Tabela',
};

interface ImpactCardProps {
  entry: ImpactEntry;
  selected?: boolean;
  onSelect?: () => void;
}

/**
 * Shows one "trigger changed → pode impactar: [...]" relationship, e.g.
 * "Dashboard alterado ↓ Pode impactar: Header, Sidebar, MetricCards,
 * use-company, API Dashboard, Tabela Companies".
 */
export default function ImpactCard({ entry, selected, onSelect }: ImpactCardProps) {
  const TriggerIcon = CATEGORY_ICONS[entry.trigger.category];

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-colors',
        selected ? 'border-primary/60 ring-1 ring-primary/30' : 'border-card-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <TriggerIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{entry.trigger.name}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {entry.triggerChange === 'added' ? 'novo' : 'alterado'}
            </Badge>
            {entry.trigger.module && (
              <Badge variant="outline" className="text-[10px] font-normal">{entry.trigger.module}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{entry.trigger.location}</p>
        </div>
        <RiskBadge level={entry.riskLevel === 'none' ? 'low' : entry.riskLevel} />
      </div>

      <div className="flex items-center gap-2 pl-1 my-2.5 text-muted-foreground">
        <ArrowDown className="h-3.5 w-3.5" />
        <span className="text-xs">
          {entry.impacted.length === 0 ? 'Nenhum impacto detectado' : 'Pode impactar:'}
        </span>
      </div>

      {entry.impacted.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {entry.impacted.map((node) => {
            const Icon = CATEGORY_ICONS[node.category];
            return (
              <span
                key={node.id}
                title={`${CATEGORY_LABELS[node.category]} · ${node.location}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                {node.name}
              </span>
            );
          })}
        </div>
      )}

      {onSelect && entry.impacted.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onSelect} className="mt-3 -ml-2 text-xs text-primary">
          Ver grafo de dependências
        </Button>
      )}
    </div>
  );
}
