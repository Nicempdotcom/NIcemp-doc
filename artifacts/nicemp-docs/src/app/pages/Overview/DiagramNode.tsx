import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { CATEGORY_META, moduleColor, type FlowNodeData } from './diagramUtils';

/**
 * Custom reactflow node — shows only the plain-language name and a module
 * color pill. The technical file path is a secondary, opt-in detail that
 * only appears on hover (never on the box itself), per the UX requirement
 * that non-technical stakeholders should never see file paths by default.
 */
export default function DiagramNode({ data }: { data: FlowNodeData }) {
  const meta = CATEGORY_META[data.category];
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
