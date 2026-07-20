/**
 * CmsCategoryRepository
 *
 * Read-only repository that fetches categories from the `cms_categories` table
 * of the *analyzed project* Supabase (nicemp.com), using the connection
 * configured by the user in Settings → Supabase do projeto analisado.
 *
 * No write operations (insert / update / delete) are ever performed here.
 */

import { getAnalyzedSupabaseClient } from '@/lib/analyzedProjectSupabase';

export interface CmsCategory {
  id: string;
  name: string;
}

export const CmsCategoryRepository = {
  /**
   * Returns all categories ordered by name.
   * Returns [] if the connection is not configured or the query fails.
   * Never throws.
   */
  async findAll(): Promise<CmsCategory[]> {
    const client = getAnalyzedSupabaseClient();
    if (!client) {
      console.warn('[CmsCategoryRepository] Supabase do projeto analisado não configurado.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('cms_categories')
        .select('id, name')
        .order('name');

      if (error) {
        console.warn('[CmsCategoryRepository] Erro ao buscar categorias:', error.message);
        return [];
      }

      return (data ?? []) as CmsCategory[];
    } catch (err) {
      console.warn('[CmsCategoryRepository] Exceção ao buscar categorias:', err);
      return [];
    }
  },
};
