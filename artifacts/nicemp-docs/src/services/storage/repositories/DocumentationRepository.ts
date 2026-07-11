/**
 * DocumentationRepository
 *
 * CRUD operations for all documentation entities:
 * Page, Component, Hook, API, Table.
 *
 * Each method delegates to StorageService — no business logic here.
 */

import { StorageService } from '../StorageService';
import type {
  PageEntity,
  ComponentEntity,
  HookEntity,
  ApiEntity,
  TableEntity,
  InteractionEntity,
} from '../types';

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PageRepository = {
  findAll(): PageEntity[] {
    return StorageService.read<PageEntity>('pages');
  },

  findById(id: string): PageEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): PageEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): PageEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  save(entity: PageEntity): void {
    StorageService.upsert<PageEntity>('pages', entity);
  },

  saveMany(entities: PageEntity[]): void {
    StorageService.upsertMany<PageEntity>('pages', entities);
  },

  update(id: string, patch: Partial<PageEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<PageEntity>('pages', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('pages', id);
  },

  clear(): void {
    StorageService.clearStore('pages');
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const ComponentRepository = {
  findAll(): ComponentEntity[] {
    return StorageService.read<ComponentEntity>('components');
  },

  findById(id: string): ComponentEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): ComponentEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): ComponentEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  findByCategory(category: string): ComponentEntity[] {
    return this.findAll().filter((e) => e.category === category);
  },

  save(entity: ComponentEntity): void {
    StorageService.upsert<ComponentEntity>('components', entity);
  },

  saveMany(entities: ComponentEntity[]): void {
    StorageService.upsertMany<ComponentEntity>('components', entities);
  },

  update(id: string, patch: Partial<ComponentEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<ComponentEntity>('components', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('components', id);
  },

  clear(): void {
    StorageService.clearStore('components');
  },
} as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const HookRepository = {
  findAll(): HookEntity[] {
    return StorageService.read<HookEntity>('hooks');
  },

  findById(id: string): HookEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): HookEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): HookEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  save(entity: HookEntity): void {
    StorageService.upsert<HookEntity>('hooks', entity);
  },

  saveMany(entities: HookEntity[]): void {
    StorageService.upsertMany<HookEntity>('hooks', entities);
  },

  update(id: string, patch: Partial<HookEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<HookEntity>('hooks', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('hooks', id);
  },

  clear(): void {
    StorageService.clearStore('hooks');
  },
} as const;

// ─── API ──────────────────────────────────────────────────────────────────────

export const ApiRepository = {
  findAll(): ApiEntity[] {
    return StorageService.read<ApiEntity>('apis');
  },

  findById(id: string): ApiEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): ApiEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): ApiEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  findByMethod(method: ApiEntity['method']): ApiEntity[] {
    return this.findAll().filter((e) => e.method === method);
  },

  save(entity: ApiEntity): void {
    StorageService.upsert<ApiEntity>('apis', entity);
  },

  saveMany(entities: ApiEntity[]): void {
    StorageService.upsertMany<ApiEntity>('apis', entities);
  },

  update(id: string, patch: Partial<ApiEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<ApiEntity>('apis', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('apis', id);
  },

  clear(): void {
    StorageService.clearStore('apis');
  },
} as const;

// ─── Table ────────────────────────────────────────────────────────────────────

export const TableRepository = {
  findAll(): TableEntity[] {
    return StorageService.read<TableEntity>('tables');
  },

  findById(id: string): TableEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): TableEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): TableEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  findActive(): TableEntity[] {
    return this.findAll().filter((e) => e.status === 'active');
  },

  save(entity: TableEntity): void {
    StorageService.upsert<TableEntity>('tables', entity);
  },

  saveMany(entities: TableEntity[]): void {
    StorageService.upsertMany<TableEntity>('tables', entities);
  },

  update(id: string, patch: Partial<TableEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<TableEntity>('tables', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('tables', id);
  },

  clear(): void {
    StorageService.clearStore('tables');
  },
} as const;

// ─── Interaction ("o que este botão/tela faz" — EPIC 10) ─────────────────────

export const InteractionRepository = {
  findAll(): InteractionEntity[] {
    return StorageService.read<InteractionEntity>('interactions');
  },

  findById(id: string): InteractionEntity | undefined {
    return this.findAll().find((e) => e.id === id);
  },

  findByProject(projectId: string): InteractionEntity[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByModule(module: string): InteractionEntity[] {
    return this.findAll().filter((e) => e.module === module);
  },

  findByFilePath(filePath: string): InteractionEntity[] {
    return this.findAll().filter((e) => e.location === filePath);
  },

  save(entity: InteractionEntity): void {
    StorageService.upsert<InteractionEntity>('interactions', entity);
  },

  saveMany(entities: InteractionEntity[]): void {
    StorageService.upsertMany<InteractionEntity>('interactions', entities);
  },

  update(id: string, patch: Partial<InteractionEntity>): void {
    const all = this.findAll();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return;
    StorageService.write<InteractionEntity>('interactions', [
      ...all.slice(0, idx),
      { ...all[idx], ...patch, lastChanged: new Date().toISOString() },
      ...all.slice(idx + 1),
    ]);
  },

  remove(id: string): void {
    StorageService.remove('interactions', id);
  },

  clear(): void {
    StorageService.clearStore('interactions');
  },
} as const;

// ─── Convenience: DocumentationRepository (façade) ────────────────────────────

/**
 * High-level facade that bundles all documentation entity repositories.
 * Use this in features/providers when you need cross-entity operations.
 */
export const DocumentationRepository = {
  pages:        PageRepository,
  components:   ComponentRepository,
  hooks:        HookRepository,
  apis:         ApiRepository,
  tables:       TableRepository,
  interactions: InteractionRepository,

  /** Remove all documentation entities for a given project. */
  clearByProject(projectId: string): void {
    const stores = ['pages', 'components', 'hooks', 'apis', 'tables', 'interactions'] as const;
    for (const store of stores) {
      const remaining = StorageService.read<{ id: string; projectId: string }>(store)
        .filter((e) => e.projectId !== projectId);
      StorageService.write(store, remaining);
    }
  },

  /** Count all entities for a project, grouped by type. */
  countByProject(projectId: string): Record<string, number> {
    return {
      pages:        PageRepository.findByProject(projectId).length,
      components:   ComponentRepository.findByProject(projectId).length,
      hooks:        HookRepository.findByProject(projectId).length,
      apis:         ApiRepository.findByProject(projectId).length,
      tables:       TableRepository.findByProject(projectId).length,
      interactions: InteractionRepository.findByProject(projectId).length,
    };
  },
} as const;
