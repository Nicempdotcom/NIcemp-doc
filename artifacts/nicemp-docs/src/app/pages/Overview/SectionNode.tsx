import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useModuleSummary } from './moduleSummaryContext';

export interface SectionNodeData extends Record<string, unknown> {
  name:  string;
  color: string;
  count: number;
}

/**
 * Section node — mid-level tree node representing a module/section.
 * Sits between the root and the page leaves.
 *
 * Includes an on-demand "Resumir com IA" button that, when clicked, calls
 * POST /api/ai/module-summary and displays up to 3 plain-language sentences
 * explaining what the module does — state is managed by ModuleSummaryContext.
 */
export default function SectionNode({ data }: { data: SectionNodeData }) {
  const { state, request } = useModuleSummary(data.name);

  return (
    <div
      style={{ borderColor: data.color }}
      className="w-[220px] rounded-xl border-2 bg-background px-4 py-2.5 shadow-sm"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground/40 !w-1.5 !h-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground/40 !w-1.5 !h-1.5"
      />

      {/* Header row */}
      <div className="flex items-center gap-2.5">
        {/* Colored accent dot */}
        <span
          className="shrink-0 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.color }}
        />

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-tight capitalize truncate"
            style={{ color: data.color }}
          >
            {data.name}
          </p>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
            {data.count} {data.count === 1 ? 'tela' : 'telas'}
          </p>
        </div>

        {/* AI summary button — only shown while idle or on error */}
        {(state.status === 'idle' || state.status === 'error') && (
          <button
            onClick={(e) => { e.stopPropagation(); request(); }}
            title="Resumir módulo com IA"
            className="shrink-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors nodrag"
            style={{ pointerEvents: 'all' }}
          >
            <Sparkles className="w-3 h-3" />
            {state.status === 'error' ? 'Tentar' : 'IA'}
          </button>
        )}

        {/* Loading indicator */}
        {state.status === 'loading' && (
          <Loader2
            className="shrink-0 w-3.5 h-3.5 text-muted-foreground animate-spin"
          />
        )}
      </div>

      {/* AI summary text — shown when done */}
      {state.status === 'done' && state.text && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground border-t border-border/50 pt-2">
          {state.text}
        </p>
      )}
    </div>
  );
}
