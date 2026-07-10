/**
 * VersionComparator
 *
 * Compares two VersionSnapshotEntity records (previous vs. current) and
 * produces a full structured report: per-category diffs (pages, components,
 * hooks, APIs, tables) plus a top-level summary used by the "Comparação"
 * screen and by the post-upload banner (EPIC 05).
 */

import type { VersionSnapshotEntity } from '@/services/storage/types';
import { DiffService, type DiffResult } from '@/services/diff/DiffService';

export type ComparisonCategory = 'pages' | 'components' | 'hooks' | 'apis' | 'tables';

export const COMPARISON_CATEGORY_LABELS: Record<ComparisonCategory, { singular: string; plural: string }> = {
  pages:      { singular: 'página',    plural: 'páginas' },
  components: { singular: 'componente', plural: 'componentes' },
  hooks:      { singular: 'hook',       plural: 'hooks' },
  apis:       { singular: 'API',        plural: 'APIs' },
  tables:     { singular: 'tabela',     plural: 'tabelas' },
};

export interface VersionComparisonResult {
  fromVersionId: string;
  toVersionId:   string;
  comparedAt:    string;
  byCategory:    Record<ComparisonCategory, DiffResult>;
  totals: {
    added:     number;
    removed:   number;
    changed:   number;
    unchanged: number;
  };
  /** True when nothing at all differs between the two versions. */
  isIdentical: boolean;
}

const CATEGORIES: ComparisonCategory[] = ['pages', 'components', 'hooks', 'apis', 'tables'];

export const VersionComparator = {
  /**
   * Compare `from` (older) against `to` (newer). Order matters: additions
   * are things present in `to` but not `from`, removals are the reverse.
   */
  compare(from: VersionSnapshotEntity, to: VersionSnapshotEntity): VersionComparisonResult {
    const byCategory = {} as Record<ComparisonCategory, DiffResult>;

    for (const category of CATEGORIES) {
      byCategory[category] = DiffService.diffList(from[category], to[category]);
    }

    const totals = CATEGORIES.reduce(
      (acc, cat) => {
        acc.added     += byCategory[cat].counts.added;
        acc.removed   += byCategory[cat].counts.removed;
        acc.changed   += byCategory[cat].counts.changed;
        acc.unchanged += byCategory[cat].counts.unchanged;
        return acc;
      },
      { added: 0, removed: 0, changed: 0, unchanged: 0 },
    );

    return {
      fromVersionId: from.versionId,
      toVersionId:   to.versionId,
      comparedAt:    new Date().toISOString(),
      byCategory,
      totals,
      isIdentical: totals.added === 0 && totals.removed === 0 && totals.changed === 0,
    };
  },

  /** Human-readable one-line summary chips, e.g. "+12 componentes", "3 APIs alteradas". */
  buildSummaryChips(result: VersionComparisonResult): string[] {
    const chips: string[] = [];
    for (const category of CATEGORIES) {
      const diff  = result.byCategory[category];
      const label = COMPARISON_CATEGORY_LABELS[category];

      if (diff.counts.added > 0) {
        chips.push(`+${diff.counts.added} ${diff.counts.added === 1 ? label.singular : label.plural}`);
      }
      if (diff.counts.removed > 0) {
        chips.push(`-${diff.counts.removed} ${diff.counts.removed === 1 ? label.singular : label.plural}`);
      }
      if (diff.counts.changed > 0) {
        chips.push(`${diff.counts.changed} ${diff.counts.changed === 1 ? label.singular : label.plural} alterada${diff.counts.changed === 1 ? '' : 's'}`);
      }
    }
    return chips;
  },
};
