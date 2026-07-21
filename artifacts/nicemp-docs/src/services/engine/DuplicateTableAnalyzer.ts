/**
 * DuplicateTableAnalyzer
 *
 * Cruza os dados já coletados pelo LiveSupabaseIntrospector (schema real das
 * tabelas) e pelo LiveTableUsageAnalyzer (quais entidades do código referenciam
 * cada tabela) para detectar possíveis duplicidades, tabelas obsoletas e
 * referências fantasmas.
 *
 * Não cria um novo pipeline de coleta — apenas recebe os dois resultados como
 * entrada e os cruza para gerar alertas.
 *
 * Tipos de alerta produzidos:
 *  - similar_name      → dois nomes de tabela muito parecidos após normalização
 *  - similar_structure → 80%+ das colunas iguais em nome + tipo
 *  - orphan            → tabela existe no schema, mas nenhuma entidade a referencia
 *  - ghost             → tabela referenciada no código mas ausente do schema real
 *
 * Severidade:
 *  - "alta"  → ghost  (erro silencioso em produção)
 *  - "media" → demais tipos
 *
 * Nunca lança exceção — retorna array vazio como fallback seguro.
 */

import type { DiscoveredTable } from './LiveSupabaseIntrospector';
import type { TableUsageRaw }   from './LiveTableUsageAnalyzer';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type DuplicateAlertType = 'similar_name' | 'similar_structure' | 'orphan' | 'ghost';
export type AlertSeverity      = 'alta' | 'media';

export interface DuplicateAlert {
  /** Categoria do alerta. */
  type:     DuplicateAlertType;
  /** Nomes das tabelas envolvidas (1 para orphan/ghost, 2 para similar_*). */
  tables:   string[];
  /** Explicação curta em português do motivo do alerta. */
  reason:   string;
  severity: AlertSeverity;
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

/** Sufixos que indicam "cópia antiga" — ignorados na comparação de nomes. */
const OBSOLETE_SUFFIXES = /_(old|bak|backup|v\d+|copy|temp|teste|test|copia|archive|arc)$/i;

/** Remove acentos, coloca em minúsculo e descarta sufixos obsoletos. */
function normalizeName(raw: string): string {
  const lower = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove diacríticos
  const stripped = lower.replace(OBSOLETE_SUFFIXES, '');
  // Singularização simples: remove 's' ou 'es' final
  return stripped.replace(/(?:es|s)$/, '') || stripped;
}

/** Distância de Levenshtein — complexidade O(n·m) com n, m ≤ 100. */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Limita strings longas para evitar custo excessivo
  const A = a.slice(0, 60);
  const B = b.slice(0, 60);

  const prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  const curr = new Array<number>(B.length + 1);

  for (let i = 1; i <= A.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]     + 1,       // deleção
        curr[j - 1] + 1,       // inserção
        prev[j - 1] + cost,    // substituição
      );
    }
    for (let j = 0; j <= B.length; j++) prev[j] = curr[j];
  }
  return prev[B.length];
}

/** Retorna true quando dois nomes normalizados são considerados "parecidos". */
function areSimilarNames(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;

  // Aceita distância de Levenshtein de até 2 para strings >= 4 chars
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 4) return false;
  const dist = levenshtein(na, nb);
  return dist <= 2;
}

/** Retorna a fração de colunas em comum entre duas tabelas (mesmo nome + mesmo tipo). */
function structureSimilarity(a: DiscoveredTable, b: DiscoveredTable): number {
  if (a.columns.length === 0 && b.columns.length === 0) return 0;
  const total = Math.max(a.columns.length, b.columns.length);
  if (total === 0) return 0;

  const setA = new Set(a.columns.map((c) => `${c.name}::${c.type}`));
  let common = 0;
  for (const col of b.columns) {
    if (setA.has(`${col.name}::${col.type}`)) common++;
  }
  return common / total;
}

// ─── Analisador ───────────────────────────────────────────────────────────────

export class DuplicateTableAnalyzer {
  /**
   * Cruza o schema real (tabelas do Supabase) com os dados de uso de código
   * e retorna um array de alertas de possíveis duplicidades ou problemas.
   *
   * @param schemaTables   Resultado de LiveSupabaseIntrospector.discoverTables()
   * @param usageRaws      Resultado de LiveTableUsageAnalyzer.analyze()
   */
  analyze(
    schemaTables: DiscoveredTable[],
    usageRaws:    TableUsageRaw[],
  ): DuplicateAlert[] {
    try {
      const alerts: DuplicateAlert[] = [];

      const schemaNames = new Set(schemaTables.map((t) => t.name));
      const usageNames  = new Set(usageRaws.map((u) => u.tableName));

      // ── 1. Nome parecido ────────────────────────────────────────────────────
      for (let i = 0; i < schemaTables.length; i++) {
        for (let j = i + 1; j < schemaTables.length; j++) {
          const ta = schemaTables[i];
          const tb = schemaTables[j];
          if (!ta || !tb) continue;

          if (areSimilarNames(ta.name, tb.name)) {
            alerts.push({
              type:     'similar_name',
              tables:   [ta.name, tb.name],
              reason:   `Os nomes "${ta.name}" e "${tb.name}" são muito parecidos após normalização — possível duplicidade ou tabela obsoleta.`,
              severity: 'media',
            });
          }
        }
      }

      // ── 2. Estrutura quase idêntica ────────────────────────────────────────
      // Cada regra gera seu próprio alerta independentemente — um par pode ter
      // tanto similar_name quanto similar_structure ao mesmo tempo.
      for (let i = 0; i < schemaTables.length; i++) {
        for (let j = i + 1; j < schemaTables.length; j++) {
          const ta = schemaTables[i];
          const tb = schemaTables[j];
          if (!ta || !tb) continue;

          // Só analisa estrutura se cada tabela tiver ao menos 2 colunas
          if (ta.columns.length < 2 || tb.columns.length < 2) continue;

          const sim = structureSimilarity(ta, tb);
          if (sim >= 0.8) {
            const pct = Math.round(sim * 100);
            alerts.push({
              type:     'similar_structure',
              tables:   [ta.name, tb.name],
              reason:   `"${ta.name}" e "${tb.name}" compartilham ${pct}% das colunas (nome + tipo) — possível duplicidade de schema.`,
              severity: 'media',
            });
          }
        }
      }

      // ── 3. Tabela órfã (existe no banco, zero usos no código) ──────────────
      for (const table of schemaTables) {
        if (!usageNames.has(table.name)) {
          alerts.push({
            type:     'orphan',
            tables:   [table.name],
            reason:   `A tabela "${table.name}" existe no banco mas não é referenciada em nenhuma página, componente ou API do código analisado.`,
            severity: 'media',
          });
        }
      }

      // ── 4. Tabela fantasma (referenciada no código, ausente do schema) ─────
      for (const usage of usageRaws) {
        if (!schemaNames.has(usage.tableName)) {
          alerts.push({
            type:     'ghost',
            tables:   [usage.tableName],
            reason:   `A tabela "${usage.tableName}" é referenciada no código (${usage.usages.length} ocorrência${usage.usages.length !== 1 ? 's' : ''}) mas não existe no schema real do Supabase — erro silencioso em produção.`,
            severity: 'alta',
          });
        }
      }

      return alerts;
    } catch (err) {
      console.warn('[DuplicateTableAnalyzer] Erro inesperado na análise:', err);
      return [];
    }
  }
}
