import React, { useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  CATEGORY_META,
  SIMPLE_CATEGORY_STYLE,
  moduleColor,
  ViewModeContext,
  type FlowNodeData,
} from './diagramUtils';

/** Truncate a string to `max` characters, appending '…' if cut. */
function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

/**
 * Custom reactflow node — renders differently depending on ViewModeContext:
 *
 * Visão Simples (default):
 *   Larger card, solid color by entity category, name in bold, one line of
 *   plain-language description visible at all times. No module pill, no
 *   technical labels. File path remains tooltip-only.
 *
 * Visão Técnica:
 *   Original layout — module color dot, module name, entity type label. No
 *   description visible. File path remains tooltip-only.
 */
export default function DiagramNode({ data }: { data: FlowNodeData }) {
  const viewMode = useContext(ViewModeContext);
  const meta = CATEGORY_META[data.category];
  const simpleStyle = SIMPLE_CATEGORY_STYLE[data.category];

  if (viewMode === 'simple') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`w-[260px] rounded-xl border-2 ${simpleStyle.border} ${simpleStyle.bg} px-4 py-3 shadow-sm cursor-default`}
          >
            {/* Top/bottom handles match the TB dagre layout direction */}
            <Handle type="target" position={Position.Top}    className="!bg-muted-foreground/40 !w-1.5 !h-1.5" />
            <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/40 !w-1.5 !h-1.5" />
            <p className={`text-sm font-bold leading-tight truncate ${simpleStyle.nameText}`}>
              {data.name}
            </p>
            {data.description && (
              <p className={`mt-1 text-[11px] leading-snug ${simpleStyle.descText}`}>
                {truncate(data.description, 48)}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-[11px]">
          {data.path}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Visão Técnica — original behavior, unchanged
  const color = moduleColor(data.module);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`w-[220px] rounded-lg border ${meta.border} ${meta.bg} px-3 py-2.5 shadow-sm cursor-default`}
        >
          <Handle type="target" position={Position.Left} className="!bg-muted-foreground/40 !w-1.5 !h-1.5" />
          <Handle type="source" position={Position.Right} className="!bg-muted-foreground/40 !w-1.5 !h-1.5" />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground truncate">
              {data.module}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-tight truncate">{data.name}</p>
          <span className={`inline-block mt-1 text-[10px] font-medium ${meta.text}`}>{meta.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-[11px]">
        {data.path}
      </TooltipContent>
    </Tooltip>
  );
}
