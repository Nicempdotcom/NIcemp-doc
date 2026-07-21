/**
 * IntegrationRepository
 *
 * Persists external service integrations detected by IntegrationAnalyzer for
 * each analyzed project. Follows the same sync-read / async-write-through
 * pattern as other repositories (localStorage + Supabase).
 */

import { StorageService } from '../StorageService';
import type { IntegrationEntity } from '../types';

const CATEGORY_ORDER: IntegrationEntity['category'][] = [
  'payments', 'auth', 'database', 'ai', 'storage', 'email',
  'analytics', 'monitoring', 'messaging', 'graphql', 'state', 'other',
];

export const IntegrationRepository = {
  findAll(): IntegrationEntity[] {
    return StorageService.read<IntegrationEntity>('integrations');
  },

  /** Return all integrations for a project, sorted by category priority then name. */
  findByProject(projectId: string): IntegrationEntity[] {
    return this.findAll()
      .filter((i) => i.projectId === projectId)
      .sort((a, b) => {
        const orderDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
  },

  /**
   * Replace all stored integrations for a given project with the supplied list.
   * Entities for other projects are preserved.
   */
  saveForProject(projectId: string, integrations: IntegrationEntity[]): void {
    const others = this.findAll().filter((i) => i.projectId !== projectId);
    StorageService.write('integrations', [...others, ...integrations]);
  },

  /** Remove all integrations for a project (e.g. when clearing project data). */
  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((i) => i.projectId !== projectId);
    StorageService.write('integrations', remaining);
  },

  clear(): void {
    StorageService.clearStore('integrations');
  },
} as const;
