/**
 * ToolCategoryAnalyzer
 *
 * Heuristically detects tool/calculator categories by finding a file that
 * contains an `allTools` array where each entry has a `category` field.
 * This pattern matches ToolsHome.tsx in the nicemp.com project.
 *
 * Returns an empty array when:
 *  - No matching catalog file is found (e.g. project is not nicemp.com)
 *  - The file exists but has no parseable category values
 *
 * Never throws — callers can always rely on an empty fallback.
 */

import type { ScannedFile } from './types';

export interface ToolCategoryRaw {
  name: string;
  toolCount: number;
}

export class ToolCategoryAnalyzer {
  /**
   * Scan the given files and return the distinct tool categories found,
   * sorted by toolCount descending. Returns [] if no catalog is detected.
   */
  analyze(files: ScannedFile[]): ToolCategoryRaw[] {
    // Heuristic: find a text file whose content contains both "allTools"
    // and "category" — the nicemp.com ToolsHome.tsx catalog pattern.
    const catalogFile = files.find(
      (f) =>
        !f.isBinary &&
        f.content.includes('allTools') &&
        f.content.includes('category'),
    );

    if (!catalogFile) return [];

    try {
      return this._extractCategories(catalogFile.content);
    } catch {
      return [];
    }
  }

  private _extractCategories(content: string): ToolCategoryRaw[] {
    // Match  category: 'Financeiro'  or  category: "Financeiro"
    // including optional whitespace around the colon.
    const pattern = /\bcategory\s*:\s*['"]([^'"]+)['"]/g;
    const counts  = new Map<string, number>();

    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    if (counts.size === 0) return [];

    return Array.from(counts.entries())
      .map(([name, toolCount]) => ({ name, toolCount }))
      .sort((a, b) => b.toolCount - a.toolCount || a.name.localeCompare(b.name));
  }
}
