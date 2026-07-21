/**
 * CmsCategoryRepository
 *
 * Repository for the `cms_categories` table of the *analyzed project* Supabase
 * (nicemp.com), using the connection configured in Settings → Supabase do
 * projeto analisado.
 *
 * Read: always safe (anon key, RLS permitting).
 * Write (create): requires the anon key to have INSERT permission on
 * cms_categories, or an open RLS INSERT policy. Errors are surfaced to the
 * caller so the UI can show a meaningful message.
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

  /**
   * Inserts a new category by name and returns the created row.
   *
   * Throws an Error with a user-readable message when:
   *   - The Supabase connection is not configured.
   *   - The anon key lacks INSERT permission (RLS / missing policy).
   *   - Any other database error occurs.
   *
   * The caller is responsible for showing the error in the UI.
   */
  async create(name: string): Promise<CmsCategory> {
    const client = getAnalyzedSupabaseClient();
    if (!client) {
      throw new Error('Supabase do projeto analisado não configurado. Configure a conexão em Configurações.');
    }

    const trimmed = name.trim();
    if (!trimmed) throw new Error('O nome da categoria não pode estar vazio.');

    const { data, error } = await client
      .from('cms_categories')
      .insert({ name: trimmed })
      .select('id, name')
      .single();

    if (error) {
      // 42501 = insufficient_privilege / RLS blocked
      if (
        (error as { code?: string }).code === '42501' ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('new row violates')
      ) {
        throw new Error(
          `Sem permissão para inserir na tabela cms_categories. ` +
          `Verifique se a anon key tem uma política INSERT habilitada no Supabase.`,
        );
      }
      // 23505 = unique_violation
      if ((error as { code?: string }).code === '23505') {
        throw new Error(`A categoria "${trimmed}" já existe no banco.`);
      }
      throw new Error(`Erro ao criar categoria: ${error.message}`);
    }

    return data as CmsCategory;
  },
};
