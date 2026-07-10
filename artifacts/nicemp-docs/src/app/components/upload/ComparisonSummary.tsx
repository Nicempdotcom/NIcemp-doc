import React from 'react';
import { GitCompare, Plus, Minus, PenSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/utils';
import { VersionComparator, type VersionComparisonResult } from '@/services/comparison';

interface ComparisonSummaryProps {
  result: VersionComparisonResult;
  onViewDetails: () => void;
}

/**
 * Compact "what changed since the last import" banner shown right after an
 * analysis completes. Chips read like: "+12 componentes", "3 APIs alteradas".
 */
export default function ComparisonSummary({ result, onViewDetails }: ComparisonSummaryProps) {
  const chips = VersionComparator.buildSummaryChips(result);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <GitCompare className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">
          Comparado com a versão anterior
        </span>
        <Button
          variant="outline" size="sm" onClick={onViewDetails}
          className="ml-auto gap-1.5 bg-background"
        >
          Ver comparação completa
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {result.isIdentical ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma alteração estrutural detectada em relação à última versão analisada.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <ChangeChip key={i} label={chip} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeChip({ label }: { label: string }) {
  const isAdd     = label.startsWith('+');
  const isRemove  = label.startsWith('-');
  const isChanged = !isAdd && !isRemove;

  const Icon = isAdd ? Plus : isRemove ? Minus : PenSquare;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
      isAdd     && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      isRemove  && 'bg-red-500/10 text-red-700 dark:text-red-400',
      isChanged && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
