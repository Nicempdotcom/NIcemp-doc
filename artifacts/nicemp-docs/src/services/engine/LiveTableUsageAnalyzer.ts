/**
 * LiveTableUsageAnalyzer
 *
 * Scans already-categorized source files for Supabase table references of the
 * form `.from('tableName')` and maps each hit to the entity that contains it
 * (page / component / api).
 *
 * Runs DURING the analysis pipeline (receives CategorizedFile[] from
 * StructureAnalyzer). Never stores raw source code — only the association
 * between a table name and the entity (by id + label).
 *
 * Never throws — callers always get a (possibly empty) result.
 */

import type { CategorizedFile } from './types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UsageKind = 'page' | 'component' | 'api';

export interface TableUsageEntry {
  kind:     UsageKind;
  entityId: string;
  label:    string;
}

export interface TableUsageRaw {
  tableName: string;
  usages:    TableUsageEntry[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Same ID formula as mapper.ts — must stay in sync. */
function stableId(kind: string, location: string): string {
  return (kind + ':' + location)
    .toLowerCase()
    .replace(/[^a-z0-9:./\-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function mapCategory(cat: CategorizedFile['category']): UsageKind | null {
  if (cat === 'page')      return 'page';
  if (cat === 'component') return 'component';
  if (cat === 'api')       return 'api';
  return null;
}

// ─── Analyzer ──────────────────────────────────────────────────────────────────

const FROM_PATTERN = /\.from\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g;

export class LiveTableUsageAnalyzer {
  /**
   * Scan categorized files and return one TableUsageRaw per distinct table
   * referenced. Each entry lists every page/component/api that references it.
   */
  analyze(files: CategorizedFile[]): TableUsageRaw[] {
    // Map: tableName → usages (deduped by entityId)
    const byTable = new Map<string, Map<string, TableUsageEntry>>();

    for (const file of files) {
      if (file.isBinary || !file.content) continue;

      const kind = mapCategory(file.category);
      if (!kind) continue; // skip non-entity files (config, style, etc.)

      const entityId = stableId(kind, file.path);
      const label    = file.name.replace(/\.(tsx?|jsx?)$/, '');

      FROM_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((match = FROM_PATTERN.exec(file.content)) !== null) {
        const tableName = match[1];
        if (!tableName) continue;

        if (!byTable.has(tableName)) byTable.set(tableName, new Map());
        byTable.get(tableName)!.set(entityId, { kind, entityId, label });
      }
    }

    const result: TableUsageRaw[] = [];
    for (const [tableName, usageMap] of byTable.entries()) {
      result.push({
        tableName,
        usages: Array.from(usageMap.values()),
      });
    }
    return result;
  }
}
