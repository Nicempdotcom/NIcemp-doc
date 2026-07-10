// ─── Comparison Service ───────────────────────────────────────────────────────
// Diffs two versions of a document or analysis result, producing a structured
// change summary used by the history and impact features.

export { VersionComparator, COMPARISON_CATEGORY_LABELS } from './VersionComparator';
export type { ComparisonCategory, VersionComparisonResult } from './VersionComparator';

export type ChangeKind = 'added' | 'removed' | 'modified' | 'unchanged';

export interface ChangedField {
  field: string;
  kind: ChangeKind;
  before: unknown;
  after: unknown;
}

export interface ComparisonResult {
  baseId: string;
  headId: string;
  changes: ChangedField[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  comparedAt: string;
}

/** Stub — not yet implemented. */
export const comparisonService = {
  /** Compare two plain objects and return a field-level diff. */
  compare<T extends Record<string, unknown>>(
    _base: T,
    _head: T,
    _baseId: string,
    _headId: string,
  ): ComparisonResult {
    // TODO: implement deep-diff algorithm
    return {
      baseId: _baseId,
      headId: _headId,
      changes: [],
      summary: { added: 0, removed: 0, modified: 0 },
      comparedAt: new Date().toISOString(),
    };
  },

  /** Filter a comparison result to only include actual changes. */
  getActualChanges(result: ComparisonResult): ChangedField[] {
    return result.changes.filter((c) => c.kind !== 'unchanged');
  },
};
