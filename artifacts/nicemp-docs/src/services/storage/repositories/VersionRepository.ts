/**
 * VersionRepository
 *
 * CRUD operations for Project and Version entities.
 */

import { StorageService } from '../StorageService';
import type { ProjectEntity, VersionEntity } from '../types';

// ─── Project repository ───────────────────────────────────────────────────────

export const ProjectRepository = {
  findAll(): ProjectEntity[] {
    return StorageService.read<ProjectEntity>('projects');
  },

  findById(id: string): ProjectEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByName(rootName: string): ProjectEntity | undefined {
    return this.findAll().find((e) => e.rootName === rootName);
  },

  /** Returns the most recently changed project. */
  findLatest(): ProjectEntity | undefined {
    return this.findAll().sort((a, b) => b.lastChanged.localeCompare(a.lastChanged))[0];
  },

  save(entity: ProjectEntity): void {
    StorageService.upsert<ProjectEntity>('projects', entity);
  },

  update(id: string, patch: Partial<ProjectEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<ProjectEntity>('projects', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('projects', id);
  },

  clear(): void {
    StorageService.clearStore('projects');
  },
} as const;

// ─── Version repository ───────────────────────────────────────────────────────

export const VersionRepository = {
  findAll(): VersionEntity[] {
    return StorageService.read<VersionEntity>('versions');
  },

  findById(id: string): VersionEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): VersionEntity[] {
    return this.findAll()
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => b.snapshotAt.localeCompare(a.snapshotAt));
  },

  /** Latest version snapshot for a project. */
  findLatest(projectId: string): VersionEntity | undefined {
    return this.findByProject(projectId)[0];
  },

  save(entity: VersionEntity): void {
    StorageService.upsert<VersionEntity>('versions', entity);
  },

  update(id: string, patch: Partial<VersionEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<VersionEntity>('versions', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('versions', id);
  },

  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((e) => e.projectId !== projectId);
    StorageService.write<VersionEntity>('versions', remaining);
  },

  clear(): void {
    StorageService.clearStore('versions');
  },
} as const;
