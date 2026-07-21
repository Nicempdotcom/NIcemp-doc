import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface SectionNodeData extends Record<string, unknown> {
  name:  string;
  color: string;
  count: number;
}

/**
 * Section node — mid-level tree node representing a module/section.
 * Sits between the root and the page leaves.
 */
export default function SectionNode({ data }: { data: SectionNodeData }) {
  return (
    <div
      style={{ borderColor: data.color }}
      className="flex items-center gap-2.5 w-[220px] rounded-xl border-2 bg-background px-4 py-2.5 shadow-sm"
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

      {/* Colored accent dot */}
      <span
        className="shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: data.color }}
      />

      <div className="min-w-0">
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
    </div>
  );
}
