// ─── Impact Feature — Types ───────────────────────────────────────────────────

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type ImpactScope = 'module' | 'api' | 'component' | 'database' | 'global';

export interface ImpactNode {
  id: string;
  name: string;
  scope: ImpactScope;
  impactLevel: ImpactLevel;
  dependents: string[];
  dependencies: string[];
}

export interface ImpactReport {
  id: string;
  triggerId: string;
  triggerName: string;
  generatedAt: string;
  nodes: ImpactNode[];
  totalAffected: number;
  maxLevel: ImpactLevel;
}

export interface ImpactState {
  report: ImpactReport | null;
  loading: boolean;
  error: string | null;
}
