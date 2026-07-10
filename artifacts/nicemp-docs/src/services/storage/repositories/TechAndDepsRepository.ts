/**
 * TechAndDepsRepository
 *
 * CRUD for DependencyEntity and TechnologyEntity — the two stores that back
 * the "Dependências" doc page and the tech-stack section of "Arquitetura"
 * (EPIC 08 Portal Oficial).
 */

import { StorageService } from '../StorageService';
import type { DependencyEntity, TechnologyEntity } from '../types';

export const DependencyRepository = {
  findAll(): DependencyEntity[] {
    return StorageService.read<DependencyEntity>('dependencies');
  },

  findById(id: string): DependencyEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): DependencyEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  save(entity: DependencyEntity): void {
    StorageService.upsert<DependencyEntity>('dependencies', entity);
  },

  saveMany(entities: DependencyEntity[]): void {
    StorageService.upsertMany<DependencyEntity>('dependencies', entities);
  },

  remove(id: string): void {
    StorageService.remove('dependencies', id);
  },

  clear(): void {
    StorageService.clearStore('dependencies');
  },
} as const;

export const TechnologyRepository = {
  findAll(): TechnologyEntity[] {
    return StorageService.read<TechnologyEntity>('technologies');
  },

  findById(id: string): TechnologyEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): TechnologyEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByCategory(category: TechnologyEntity['category']): TechnologyEntity[] {
    return this.findAll().filter((e) => e.category === category);
  },

  save(entity: TechnologyEntity): void {
    StorageService.upsert<TechnologyEntity>('technologies', entity);
  },

  saveMany(entities: TechnologyEntity[]): void {
    StorageService.upsertMany<TechnologyEntity>('technologies', entities);
  },

  remove(id: string): void {
    StorageService.remove('technologies', id);
  },

  clear(): void {
    StorageService.clearStore('technologies');
  },
} as const;
