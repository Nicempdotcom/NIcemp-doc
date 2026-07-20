/**
 * ToolCategoryRepository
 *
 * Persists tool/calculator categories detected by ToolCategoryAnalyzer for
 * each analyzed project. Follows the same sync-read / async-write-through
 * pattern as other repositories (localStorage + Supabase).
 */

import { StorageService } from '../StorageService';
import type { ToolCategoryEntity } from '../types';

export const ToolCategoryRepository = {
  findAll(): ToolCategoryEntity[] {
    return StorageService.read<ToolCategoryEntity>('toolCategories');
  },

  /** Return all categories for a project, sorted by toolCount descending. */
  findByProject(projectId: string): ToolCategoryEntity[] {
    return this.findAll()
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.toolCount - a.toolCount || a.name.localeCompare(b.name));
  },

  /**
   * Replace all stored categories for a given project with the supplied list.
   * Entities for other projects are preserved.
   */
  saveForProject(projectId: string, categories: ToolCategoryEntity[]): void {
    const others = this.findAll().filter((c) => c.projectId !== projectId);
    StorageService.write('toolCategories', [...others, ...categories]);
  },

  /** Remove all categories for a project (e.g. when clearing project data). */
  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((c) => c.projectId !== projectId);
    StorageService.write('toolCategories', remaining);
  },

  clear(): void {
    StorageService.clearStore('toolCategories');
  },
} as const;
