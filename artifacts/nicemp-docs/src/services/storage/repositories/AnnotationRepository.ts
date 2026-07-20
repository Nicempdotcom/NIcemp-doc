/**
 * AnnotationRepository
 *
 * Stores user-written notes attached to any documentation entity (page,
 * component, etc.). Uses the same localStorage + Supabase write-through
 * pattern as every other repository in this codebase.
 *
 * Each annotation has a deterministic id: `${entityType}:${entityId}` so
 * upserts are idempotent and lookups are O(1) without a full scan.
 */

import { StorageService } from '../StorageService';

export interface AnnotationEntity {
  /** Deterministic key: `${entityType}:${entityId}` */
  id:          string;
  entityType:  'page' | 'component';
  entityId:    string;
  note:        string;
  updatedAt:   string;   // ISO timestamp
}

export const AnnotationRepository = {
  findAll(): AnnotationEntity[] {
    return StorageService.read<AnnotationEntity>('annotations');
  },

  findById(id: string): AnnotationEntity | undefined {
    return this.findAll().find((a) => a.id === id);
  },

  findByEntity(entityType: AnnotationEntity['entityType'], entityId: string): AnnotationEntity | undefined {
    return this.findById(`${entityType}:${entityId}`);
  },

  save(entityType: AnnotationEntity['entityType'], entityId: string, note: string): void {
    const entity: AnnotationEntity = {
      id:         `${entityType}:${entityId}`,
      entityType,
      entityId,
      note,
      updatedAt:  new Date().toISOString(),
    };
    StorageService.upsert<AnnotationEntity>('annotations', entity);
  },

  remove(entityType: AnnotationEntity['entityType'], entityId: string): void {
    StorageService.remove('annotations', `${entityType}:${entityId}`);
  },

  clear(): void {
    StorageService.clearStore('annotations');
  },
} as const;
