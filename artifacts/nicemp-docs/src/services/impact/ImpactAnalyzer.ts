/**
 * ImpactAnalyzer
 *
 * Given a version comparison result (EPIC 05) and the dependency graph
 * (EPIC 06/07) of the newer version, figures out which modules/entities are
 * likely affected by every added or changed entity, and assigns a risk
 * level: baixo / médio / alto / crítico.
 */

import type { RiskLevel } from '@/services/storage/types';
import type { VersionComparisonResult, ComparisonCategory } from '@/services/comparison';
import { DependencyGraph, type DependencyGraphData, type GraphNode, type NodeCategory } from '@/services/graph/DependencyGraph';

export interface ImpactEntry {
  trigger:       GraphNode;
  triggerChange: 'added' | 'changed';
  impacted:      GraphNode[];
  riskLevel:     RiskLevel;
}

export interface ImpactReport {
  generatedAt: string;
  entries:     ImpactEntry[];
  /** Highest risk level across all entries — used for a top-level badge. */
  overallRisk: RiskLevel;
}

const CATEGORY_TO_KEY: Record<ComparisonCategory, NodeCategory> = {
  pages:      'page',
  components: 'component',
  hooks:      'hook',
  apis:       'api',
  tables:     'table',
};

/** How much weight each impacted category's presence adds to the risk score. */
const CATEGORY_WEIGHT: Record<NodeCategory, number> = {
  page:      1,
  component: 1,
  hook:      1.2,
  api:       1.8,
  table:     2,
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  none:     'Baixo',
  low:      'Baixo',
  medium:   'Médio',
  high:     'Alto',
  critical: 'Crítico',
};

const RISK_ORDER: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];

function scoreToRisk(score: number): RiskLevel {
  if (score <= 0) return 'low';
  if (score <= 2) return 'medium';
  if (score <= 5) return 'high';
  return 'critical';
}

function higherRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

export const ImpactAnalyzer = {
  /** Build the graph for the "to" (newer) version — impact is analyzed against the current structure. */
  buildGraph: DependencyGraph.build,

  analyze(comparison: VersionComparisonResult, graph: DependencyGraphData): ImpactReport {
    const entries: ImpactEntry[] = [];

    (Object.keys(comparison.byCategory) as ComparisonCategory[]).forEach((category) => {
      const diff = comparison.byCategory[category];
      const changeSets: { items: typeof diff.added; kind: 'added' | 'changed' }[] = [
        { items: diff.added,   kind: 'added'   },
        { items: diff.changed, kind: 'changed' },
      ];

      for (const { items, kind } of changeSets) {
        for (const item of items) {
          const triggerNode = DependencyGraph.findNode(graph, item.id)
            ?? { id: item.id, name: item.name, location: item.location, module: item.module, category: CATEGORY_TO_KEY[category] };

          const impacted = DependencyGraph.getNeighbors(graph, triggerNode.id);
          const score = impacted.reduce((sum, n) => sum + CATEGORY_WEIGHT[n.category], 0);

          entries.push({
            trigger:       triggerNode,
            triggerChange: kind,
            impacted,
            riskLevel:     scoreToRisk(score),
          });
        }
      }
    });

    // Highest-risk, most-impactful entries first.
    entries.sort((a, b) => {
      const riskDiff = RISK_ORDER.indexOf(b.riskLevel) - RISK_ORDER.indexOf(a.riskLevel);
      if (riskDiff !== 0) return riskDiff;
      return b.impacted.length - a.impacted.length;
    });

    const overallRisk = entries.reduce<RiskLevel>((acc, e) => higherRisk(acc, e.riskLevel), 'none');

    return { generatedAt: new Date().toISOString(), entries, overallRisk };
  },
};
