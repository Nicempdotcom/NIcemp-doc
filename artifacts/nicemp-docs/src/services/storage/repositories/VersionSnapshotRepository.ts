/**
 * VersionSnapshotRepository
 *
 * Stores a lightweight, comparable fingerprint of every documentation entity
 * that existed at the time each version was analyzed. Used exclusively by
 * the version comparison feature (EPIC 05) to diff two versions of a
 * project without needing the full entity records or re-running analysis.
 */

import { StorageService } from '../StorageService';
import type { VersionSnapshotEntity } from '../types';

export const VersionSnapshotRepository = {
  findAll(): VersionSnapshotEntity[] {
    return StorageService.read<VersionSnapshotEntity>('versionSnapshots');
  },

  /** A snapshot's id is always its versionId (1:1 relationship). */
  findByVersion(versionId: string): VersionSnapshotEntity | undefined {
    return this.findAll().find((s) => s.versionId === versionId);
  },

  findByProject(projectId: string): VersionSnapshotEntity[] {
    return this.findAll()
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  save(entity: VersionSnapshotEntity): void {
    StorageService.upsert<VersionSnapshotEntity>('versionSnapshots', entity);
  },

  remove(versionId: string): void {
    StorageService.remove('versionSnapshots', versionId);
  },

  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((s) => s.projectId !== projectId);
    StorageService.write('versionSnapshots', remaining);
  },

  clear(): void {
    StorageService.clearStore('versionSnapshots');
  },
} as const;
