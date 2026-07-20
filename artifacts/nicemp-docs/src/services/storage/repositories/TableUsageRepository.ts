/**
 * TableUsageRepository
 *
 * Persists TableUsageEntity records (which Supabase tables are referenced by
 * which pages/components/APIs in the analyzed project). Follows the same
 * sync-read / async-write-through pattern as ToolCategoryRepository.
 *
 * Stored in the NicEmp Docs own Supabase (not the analyzed project's Supabase).
 */

import { StorageService } from '../StorageService';
import type { TableUsageEntity } from '../types';

export const TableUsageRepository = {
  findAll(): TableUsageEntity[] {
    return StorageService.read<TableUsageEntity>('tableUsages');
  },

  /** Return all table usage records for a given project. */
  findByProject(projectId: string): TableUsageEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  /** Return usages for a specific table within a project, or null if not found. */
  findByTable(projectId: string, tableName: string): TableUsageEntity | null {
    return (
      this.findAll().find(
        (e) => e.projectId === projectId && e.tableName === tableName,
      ) ?? null
    );
  },

  /**
   * Replace all stored usages for a given project with the supplied list.
   * Entities for other projects are preserved.
   */
  saveForProject(projectId: string, usages: TableUsageEntity[]): void {
    const others = this.findAll().filter((e) => e.projectId !== projectId);
    StorageService.write('tableUsages', [...others, ...usages]);
  },

  /** Remove all usages for a project (e.g. when clearing project data). */
  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((e) => e.projectId !== projectId);
    StorageService.write('tableUsages', remaining);
  },

  clear(): void {
    StorageService.clearStore('tableUsages');
  },
} as const;
