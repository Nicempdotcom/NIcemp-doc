/**
 * ProjectChangesRepository
 *
 * Persists Evolution Engine diff records — one per consecutive snapshot pair.
 * Each record captures added / removed / modified files and the affected modules.
 */

import { StorageService }         from '../StorageService';
import type { ProjectChangeEntity } from '../types';

export const ProjectChangesRepository = {
  findAll(): ProjectChangeEntity[] {
    return StorageService.read<ProjectChangeEntity>('projectChanges');
  },

  findById(id: string): ProjectChangeEntity | undefined {
    return this.findAll().find((c) => c.id === id);
  },

  findByProject(projectId: string): ProjectChangeEntity[] {
    return this.findAll()
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Change record where `toVersionId` matches — the diff applied to arrive at this version. */
  findByToVersion(versionId: string): ProjectChangeEntity | undefined {
    return this.findAll().find((c) => c.toVersionId === versionId);
  },

  save(entity: ProjectChangeEntity): void {
    StorageService.upsert<ProjectChangeEntity>('projectChanges', entity);
  },

  remove(id: string): void {
    StorageService.remove('projectChanges', id);
  },

  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((c) => c.projectId !== projectId);
    StorageService.write('projectChanges', remaining);
  },

  clear(): void {
    StorageService.clearStore('projectChanges');
  },
} as const;
