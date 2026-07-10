import React from 'react';
import { Plus, Minus, PenSquare, ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/utils';
import type { DiffResult, DiffItem } from '@/services/diff/DiffService';

interface CategorySectionProps {
  icon: React.ElementType;
  title: string;
  diff: DiffResult;
}

function Row({ item }: { item: DiffItem }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors">
      <span className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        item.status === 'added'   && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        item.status === 'removed' && 'bg-red-500/15 text-red-600 dark:text-red-400',
        item.status === 'changed' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}>
        {item.status === 'added'   && <Plus className="h-3 w-3" />}
        {item.status === 'removed' && <Minus className="h-3 w-3" />}
        {item.status === 'changed' && <PenSquare className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground truncate font-mono">{item.location}</p>
      </div>
      {item.module && (
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">{item.module}</Badge>
      )}
    </div>
  );
}

/** Collapsible per-category diff block: e.g. "Páginas (+3 -1 ~2)". */
export default function CategorySection({ icon: Icon, title, diff }: CategorySectionProps) {
  const { added, removed, changed } = diff;
  const totalChanges = added.length + removed.length + changed.length;

  return (
    <Accordion type="single" collapsible defaultValue={totalChanges > 0 ? title : undefined}>
      <AccordionItem value={title} className="rounded-lg border border-border bg-card px-4 last:border-b">
        <AccordionTrigger className="hover:no-underline py-3.5">
          <div className="flex flex-1 items-center gap-2.5">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">{title}</span>

            <div className="ml-auto flex items-center gap-1.5 pr-2">
              {added.length > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent hover:bg-emerald-500/10">
                  +{added.length}
                </Badge>
              )}
              {removed.length > 0 && (
                <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-transparent hover:bg-red-500/10">
                  -{removed.length}
                </Badge>
              )}
              {changed.length > 0 && (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent hover:bg-amber-500/10">
                  ~{changed.length}
                </Badge>
              )}
              {totalChanges === 0 && (
                <span className="text-xs text-muted-foreground">sem alterações</span>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {totalChanges === 0 ? (
            <p className="pb-2 text-sm text-muted-foreground">
              Nenhuma alteração em {title.toLowerCase()} entre as duas versões.
            </p>
          ) : (
            <div className="space-y-0.5 pb-1">
              {added.map((item) => <Row key={`a-${item.id}`} item={item} />)}
              {changed.map((item) => <Row key={`c-${item.id}`} item={item} />)}
              {removed.map((item) => <Row key={`r-${item.id}`} item={item} />)}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
