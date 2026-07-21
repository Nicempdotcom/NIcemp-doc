import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface RootNodeData extends Record<string, unknown> {
  name: string;
}

/**
 * Root node — sits at the very top of the tree, represents the project/app.
 * Only has a source handle at the bottom (no incoming edges).
 */
export default function RootNode({ data }: { data: RootNodeData }) {
  return (
    <div className="flex items-center justify-center w-[280px] rounded-2xl bg-slate-800 dark:bg-slate-100 px-6 py-3.5 shadow-lg">
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-2 !h-2"
      />
      <span className="text-white dark:text-slate-900 font-bold text-base text-center leading-tight truncate">
        {data.name}
      </span>
    </div>
  );
}
