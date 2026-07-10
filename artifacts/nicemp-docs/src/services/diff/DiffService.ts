/**
 * DiffService
 *
 * Generic, reusable list-diffing primitive. Compares two lists of
 * `EntitySummary` (identified by stable `id`, compared by `signature`)
 * and classifies each item as added / removed / changed / unchanged.
 *
 * This is deliberately generic — it knows nothing about pages, components,
 * hooks, APIs, or tables. `VersionComparator` applies it per-category.
 */

import type { EntitySummary } from '@/services/storage/types';

export type DiffItemStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffItem {
  status:   DiffItemStatus;
  id:       string;
  name:     string;
  location: string;
  module:   string;
  /** Only present when status === 'changed'. */
  before?:  EntitySummary;
  /** Present for added / changed / unchanged. */
  after?:   EntitySummary;
}

export interface DiffResult {
  added:     DiffItem[];
  removed:   DiffItem[];
  changed:   DiffItem[];
  unchanged: DiffItem[];
  counts: {
    added:     number;
    removed:   number;
    changed:   number;
    unchanged: number;
  };
}

function toMap(list: EntitySummary[]): Map<string, EntitySummary> {
  return new Map(list.map((e) => [e.id, e]));
}

export const DiffService = {
  /**
   * Diff two lists of the same entity kind (e.g. two versions' pages).
   * `before` = older/previous version, `after` = newer/current version.
   */
  diffList(before: EntitySummary[], after: EntitySummary[]): DiffResult {
    const beforeMap = toMap(before);
    const afterMap  = toMap(after);

    const added:     DiffItem[] = [];
    const removed:   DiffItem[] = [];
    const changed:   DiffItem[] = [];
    const unchanged: DiffItem[] = [];

    for (const [id, entity] of afterMap) {
      const prev = beforeMap.get(id);
      if (!prev) {
        added.push({ status: 'added', id, name: entity.name, location: entity.location, module: entity.module, after: entity });
        continue;
      }
      if (prev.signature !== entity.signature) {
        changed.push({ status: 'changed', id, name: entity.name, location: entity.location, module: entity.module, before: prev, after: entity });
      } else {
        unchanged.push({ status: 'unchanged', id, name: entity.name, location: entity.location, module: entity.module, before: prev, after: entity });
      }
    }

    for (const [id, entity] of beforeMap) {
      if (!afterMap.has(id)) {
        removed.push({ status: 'removed', id, name: entity.name, location: entity.location, module: entity.module, before: entity });
      }
    }

    return {
      added, removed, changed, unchanged,
      counts: {
        added:     added.length,
        removed:   removed.length,
        changed:   changed.length,
        unchanged: unchanged.length,
      },
    };
  },
};
