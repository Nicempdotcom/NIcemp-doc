/**
 * ProjectSnapshotRepository
 *
 * Persists Evolution Engine snapshots — one per analysis run.
 * Each snapshot contains a per-file fingerprint of the project at a point in time,
 * an architectural score, and a human-readable summary.
 */

import { StorageService }         from '../StorageService';
import type { ProjectSnapshotEntity } from '../types';

export const ProjectSnapshotRepository = {
  findAll(): ProjectSnapshotEntity[] {
    return StorageService.read<ProjectSnapshotEntity>('projectSnapshots');
  },

  findById(id: string): ProjectSnapshotEntity | undefined {
    return this.findAll().find((s) => s.id === id);
  },

  findByVersion(versionId: string): ProjectSnapshotEntity | undefined {
    return this.findAll().find((s) => s.versionId === versionId);
  },

  findByProject(projectId: string): ProjectSnapshotEntity[] {
    return this.findAll()
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** The most recent snapshot for a project — used as the previous snapshot when diffing. */
  findLatestByProject(projectId: string): ProjectSnapshotEntity | undefined {
    return this.findByProject(projectId)[0];
  },

  save(entity: ProjectSnapshotEntity): void {
    StorageService.upsert<ProjectSnapshotEntity>('projectSnapshots', entity);
  },

  remove(id: string): void {
    StorageService.remove('projectSnapshots', id);
  },

  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((s) => s.projectId !== projectId);
    StorageService.write('projectSnapshots', remaining);
  },

  clear(): void {
    StorageService.clearStore('projectSnapshots');
  },
} as const;
