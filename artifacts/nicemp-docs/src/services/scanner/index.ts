// ─── Scanner Service ──────────────────────────────────────────────────────────
// Traverses parsed nodes to detect patterns, issues, and metadata:
// complexity scores, missing docs, deprecated usage, unused exports.

import type { ParsedNode } from '../parser';

export type ScanRuleId =
  | 'missing-description'
  | 'deprecated-usage'
  | 'unused-export'
  | 'high-complexity'
  | 'missing-types';

export interface ScanViolation {
  ruleId: ScanRuleId;
  severity: 'info' | 'warning' | 'error';
  nodeId: string;
  message: string;
}

export interface ScanReport {
  violations: ScanViolation[];
  scannedAt: string;
  totalNodes: number;
}

/** Stub — not yet implemented. */
export const scannerService = {
  /** Scan a list of parsed nodes against all active rules. */
  async scan(_nodes: ParsedNode[]): Promise<ScanReport> {
    // TODO: implement rule engine
    return { violations: [], scannedAt: new Date().toISOString(), totalNodes: 0 };
  },

  /** Run a single rule against all nodes. */
  async runRule(_ruleId: ScanRuleId, _nodes: ParsedNode[]): Promise<ScanViolation[]> {
    // TODO: implement individual rule execution
    return [];
  },
};
