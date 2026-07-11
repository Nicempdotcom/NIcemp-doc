import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/app/components/ui/tooltip';
import { GLOSSARY } from './glossary';

interface TermHintProps {
  /** Term key as it exists in glossary.ts (e.g. "Componente", "API"). */
  termo: string;
  className?: string;
}

/**
 * Small "?" hint icon that shows a plain-language explanation of a
 * technical term on hover (desktop) or tap (mobile/touch).
 *
 * Renders nothing if the term isn't in the glossary, so it's always safe
 * to drop next to a heading.
 */
export default function TermHint({ termo, className = '' }: TermHintProps) {
  const [open, setOpen] = useState(false);
  const explicacao = GLOSSARY[termo];

  if (!explicacao) return null;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        {/* span, not button — this is often nested inside other clickable
            controls (tabs, headings), so it must stay valid HTML there. */}
        <span
          role="button"
          tabIndex={0}
          aria-label={`O que significa "${termo}"?`}
          className={`inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center text-muted-foreground hover:text-primary transition-colors ${className}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-left">
        <p className="font-semibold mb-0.5">{termo}</p>
        <p className="leading-relaxed">{explicacao}</p>
      </TooltipContent>
    </Tooltip>
  );
}
