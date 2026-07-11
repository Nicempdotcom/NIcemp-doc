import React, { useState } from 'react';
import { ChevronDown, MousePointerClick } from 'lucide-react';
import type { InteractionEntity } from '@/services/storage/types';

interface InteractionsDisclosureProps {
  interactions: InteractionEntity[];
  emptyLabel?: string;
}

/**
 * Expandable "o que este botão/tela faz" panel — plain-language click
 * interactions detected by InteractionAnalyzer (EPIC 10).
 */
export default function InteractionsDisclosure({ interactions, emptyLabel }: InteractionsDisclosureProps) {
  const [open, setOpen] = useState(false);

  if (interactions.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel ?? '—'}</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <MousePointerClick className="h-3.5 w-3.5" />
        {interactions.length} interaç{interactions.length !== 1 ? 'ões' : 'ão'}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 border-l-2 border-border pl-3 max-w-sm">
          {interactions.map((i) => (
            <li key={i.id} className="text-xs text-muted-foreground leading-relaxed">
              {i.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
