import React, { useMemo } from 'react';
import { FileText, Layers, Zap, Globe, Table as TableIcon } from 'lucide-react';
import { cn } from '@/utils';
import type { ImpactEntry } from '@/services/impact/ImpactAnalyzer';
import type { NodeCategory } from '@/services/graph/DependencyGraph';

const CATEGORY_COLOR: Record<NodeCategory, { fill: string; text: string }> = {
  page:      { fill: '#6366f1', text: '#ffffff' },
  component: { fill: '#0ea5e9', text: '#ffffff' },
  hook:      { fill: '#f59e0b', text: '#111827' },
  api:       { fill: '#10b981', text: '#ffffff' },
  table:     { fill: '#ef4444', text: '#ffffff' },
};

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  page:      FileText,
  component: Layers,
  hook:      Zap,
  api:       Globe,
  table:     TableIcon,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  page:      'Página',
  component: 'Componente',
  hook:      'Hook',
  api:       'API',
  table:     'Tabela',
};

const RISK_LINE_COLOR: Record<string, string> = {
  none:     '#94a3b8',
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
};

interface Point { x: number; y: number; }

/**
 * Radial dependency graph: the changed entity sits at the center, with every
 * potentially-impacted entity arranged in a ring around it, connected by a
 * line colored by the overall risk level.
 */
export default function DependencyGraph({ entry }: { entry: ImpactEntry }) {
  const size   = 440;
  const center = size / 2;
  const radius = 160;

  const positions = useMemo<Point[]>(() => {
    const n = entry.impacted.length;
    return entry.impacted.map((_, i) => {
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });
  }, [entry.impacted, center, radius]);

  const lineColor = RISK_LINE_COLOR[entry.riskLevel] ?? RISK_LINE_COLOR.medium;
  const TriggerIcon = CATEGORY_ICONS[entry.trigger.category];

  return (
    <div className="rounded-lg border border-card-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Grafo de Dependências</h3>
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(CATEGORY_LABELS) as NodeCategory[]).map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[cat].fill }} />
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      </div>

      {entry.impacted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          Nenhuma dependência conhecida para visualizar.
        </p>
      ) : (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-h-[440px] mx-auto">
          {/* Edges */}
          {positions.map((p, i) => (
            <line
              key={`edge-${i}`}
              x1={center} y1={center} x2={p.x} y2={p.y}
              stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7}
            />
          ))}

          {/* Impacted nodes */}
          {entry.impacted.map((node, i) => {
            const p = positions[i];
            const color = CATEGORY_COLOR[node.category];
            return (
              <g key={node.id} transform={`translate(${p.x}, ${p.y})`}>
                <circle r={26} fill={color.fill} opacity={0.15} />
                <circle r={18} fill={color.fill} />
                <text textAnchor="middle" dy="34" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
                  {node.name.length > 16 ? `${node.name.slice(0, 15)}…` : node.name}
                </text>
              </g>
            );
          })}

          {/* Trigger node (center) */}
          <g transform={`translate(${center}, ${center})`}>
            <circle r={40} fill={CATEGORY_COLOR[entry.trigger.category].fill} opacity={0.15} />
            <circle r={30} fill={CATEGORY_COLOR[entry.trigger.category].fill} />
            <text textAnchor="middle" dy="50" className="fill-foreground" style={{ fontSize: 12, fontWeight: 700 }}>
              {entry.trigger.name}
            </text>
          </g>
        </svg>
      )}

      <div className="flex items-center justify-center gap-2 mt-2">
        <span
          className={cn('inline-flex h-2 w-2 rounded-full')}
          style={{ background: lineColor }}
        />
        <span className="text-xs text-muted-foreground">
          Conexões coloridas pelo nível de risco calculado para esta alteração.
        </span>
      </div>
    </div>
  );
}
