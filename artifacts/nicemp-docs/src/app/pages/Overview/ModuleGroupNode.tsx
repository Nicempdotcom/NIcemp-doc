/**
 * ModuleGroupNode.tsx
 *
 * ReactFlow node type "moduleGroup" — renders a labeled, softly colored
 * background rectangle that groups all page nodes belonging to one module.
 * Child page nodes are absolutely positioned inside this container via
 * `parentId` in the ReactFlow node spec.
 *
 * No handles — this node is not an edge endpoint.
 */

import React from 'react';
import type { NodeProps } from '@xyflow/react';

interface ModuleGroupData {
  module: string;
  color:  string;
}

export default function ModuleGroupNode({ data }: NodeProps) {
  const { module: mod, color } = data as unknown as ModuleGroupData;

  return (
    <div
      style={{
        width:           '100%',
        height:          '100%',
        borderRadius:    16,
        border:          `2px solid ${color}50`,
        backgroundColor: `${color}0d`,
        boxSizing:       'border-box',
        position:        'relative',
        overflow:        'visible',
      }}
    >
      {/* Module header label */}
      <div
        style={{
          position:      'absolute',
          top:           14,
          left:          16,
          display:       'flex',
          alignItems:    'center',
          gap:           6,
          fontSize:      11,
          fontWeight:    700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          userSelect:    'none',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            display:         'inline-block',
            width:           8,
            height:          8,
            borderRadius:    '50%',
            backgroundColor: color,
            flexShrink:      0,
          }}
        />
        {mod}
      </div>
    </div>
  );
}
