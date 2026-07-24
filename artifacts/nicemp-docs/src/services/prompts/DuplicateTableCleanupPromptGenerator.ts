// ─── Gerador de Prompt para Limpeza de Tabela Duplicada (nicemp.com) ───────────
//
// Builds a structured, copy-pasteable prompt for the Replit Agent in the
// nicemp.com project when a duplicate or obsolete table needs to be cleaned up.
// This generator only produces TEXT — it never executes SQL or alters data.
//
// IMPORTANTE: as credenciais (URL / anon key) NUNCA aparecem no prompt gerado.
// A operação é destrutiva (DROP TABLE) — o prompt exige confirmação explícita
// antes de qualquer passo irreversível.

import type { LiveColumn }      from '@/services/engine/LiveSupabaseIntrospector';
import type { TableUsageEntry } from '@/services/engine/LiveTableUsageAnalyzer';
import { PROMPT_GENERAL_RULES } from './promptRules';

// ─── Tipos de entrada ──────────────────────────────────────────────────────────

export interface DuplicateTableCleanupInput {
  /** Tabela considerada "boa" (a que ficará). */
  keepTable:      string;
  keepColumns:    LiveColumn[];
  keepUsages:     TableUsageEntry[];

  /** Tabela considerada obsoleta (a que será removida). */
  dropTable:      string;
  dropColumns:    LiveColumn[];
  dropUsages:     TableUsageEntry[];

  /** Motivo breve pelo qual a tabela foi identificada como duplicata. */
  reason:         string;
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

function fmtColumns(cols: LiveColumn[]): string {
  if (cols.length === 0) return '  (schema não disponível)';
  return cols
    .map((c) => `  - \`${c.name}\` (${c.type}${c.nullable ? '' : ', NOT NULL'}${c.isPrimaryKey ? ', PK' : ''}${c.foreignKey ? `, FK → ${c.foreignKey}` : ''})`)
    .join('\n');
}

function fmtUsages(tableName: string, usages: TableUsageEntry[]): string {
  if (usages.length === 0) {
    return `  Nenhuma referência a \`${tableName}\` encontrada no código analisado.`;
  }
  return usages
    .map((u) => {
      const kindLabel = u.kind === 'page' ? 'Página' : u.kind === 'component' ? 'Componente' : 'API';
      return `  - ${kindLabel}: **${u.label}**`;
    })
    .join('\n');
}

// ─── Seções do prompt ─────────────────────────────────────────────────────────

function buildObjetivoSection(input: DuplicateTableCleanupInput): string {
  return [
    `Investigar e, se confirmado, realizar a limpeza da tabela duplicada/obsoleta \`${input.dropTable}\` no banco de dados de **produção** do nicemp.com, mantendo a tabela \`${input.keepTable}\` como a versão oficial.`,
    '',
    `**Motivo da identificação:** ${input.reason}`,
    '',
    '> ⚠️ **Esta é uma operação destrutiva (DROP TABLE).** Não execute nenhum passo sem confirmação explícita do usuário. Em caso de dúvida, pare e pergunte antes de prosseguir.',
  ].join('\n');
}

function buildSchemaSection(input: DuplicateTableCleanupInput): string {
  return [
    `### Tabela a manter: \`${input.keepTable}\``,
    fmtColumns(input.keepColumns),
    '',
    `### Tabela a remover: \`${input.dropTable}\``,
    fmtColumns(input.dropColumns),
  ].join('\n');
}

function buildPassoAPassoSection(input: DuplicateTableCleanupInput): string {
  const dropUsagesList = input.dropUsages.length > 0
    ? input.dropUsages.map((u) => {
        const kindLabel = u.kind === 'page' ? 'Página' : u.kind === 'component' ? 'Componente' : 'API';
        return `   - ${kindLabel}: **${u.label}**`;
      }).join('\n')
    : '   (nenhuma referência encontrada — verifique manualmente antes de prosseguir)';

  return [
    'Execute os passos abaixo **na ordem** e **somente com aprovação explícita** a cada etapa:',
    '',
    `**Passo 1 — Comparar os dados das duas tabelas.**`,
    `No Supabase Dashboard ou SQL Editor do nicemp.com, verifique se os dados de \`${input.dropTable}\` já existem em \`${input.keepTable}\` ou se há linhas exclusivas que precisam ser migradas antes de qualquer remoção.`,
    `Consulta sugerida para comparação:`,
    '```sql',
    `-- Linhas em ${input.dropTable} que NÃO existem em ${input.keepTable} (ajuste as colunas conforme o schema):`,
    `SELECT * FROM ${input.dropTable}`,
    `EXCEPT`,
    `SELECT * FROM ${input.keepTable};`,
    '```',
    '',
    `**Passo 2 — Migrar linhas exclusivas (se houver).**`,
    `Se o Passo 1 encontrar linhas em \`${input.dropTable}\` que precisam ser preservadas, insira-as em \`${input.keepTable}\` antes de continuar. Confirme com o usuário antes de executar qualquer INSERT.`,
    '',
    `**Passo 3 — Atualizar o código que ainda referencia \`${input.dropTable}\`.**`,
    `Os seguintes arquivos do projeto nicemp.com referenciam \`${input.dropTable}\` e precisam ser atualizados para usar \`${input.keepTable}\`:`,
    dropUsagesList,
    `Substitua todas as ocorrências de \`.from('${input.dropTable}')\` por \`.from('${input.keepTable}')\` nos arquivos acima. Confirme com o usuário antes de aplicar as alterações.`,
    '',
    `**Passo 4 — Somente após os passos anteriores: remover a tabela obsoleta.**`,
    `Após confirmar que os dados foram migrados e o código atualizado, execute no SQL Editor do nicemp.com:`,
    '```sql',
    `-- ATENÇÃO: operação irreversível. Execute apenas com confirmação explícita do usuário.`,
    `DROP TABLE IF EXISTS public.${input.dropTable};`,
    '```',
    '',
    `**Passo 5 — Verificar políticas de RLS.**`,
    `Após o DROP, verifique se havia políticas de RLS em \`${input.dropTable}\` que precisam ser replicadas ou ajustadas em \`${input.keepTable}\`.`,
  ].join('\n');
}

function buildImpactoSection(input: DuplicateTableCleanupInput): string {
  return [
    `**Código que usa \`${input.keepTable}\` (tabela que fica — não alterar):**`,
    fmtUsages(input.keepTable, input.keepUsages),
    '',
    `**Código que usa \`${input.dropTable}\` (tabela a remover — migrar para \`${input.keepTable}\`):**`,
    fmtUsages(input.dropTable, input.dropUsages),
  ].join('\n');
}

function buildRestricaoSection(): string {
  return [
    '- Não executar DROP TABLE sem confirmação explícita do usuário a cada etapa.',
    '- Não alterar outras tabelas além das especificadas acima.',
    '- Não expor ou logar credenciais do Supabase em nenhum arquivo ou saída.',
    '- Não remover políticas de RLS sem consulta explícita.',
    '- Não aplicar alterações de código sem revisão prévia.',
  ].join('\n');
}

function buildChecklistSection(input: DuplicateTableCleanupInput): string {
  return [
    `- [ ] Os dados de \`${input.dropTable}\` foram comparados com \`${input.keepTable}\` e nenhuma linha exclusiva foi perdida`,
    `- [ ] Todo o código que referenciava \`${input.dropTable}\` foi atualizado para usar \`${input.keepTable}\``,
    `- [ ] A tabela \`${input.dropTable}\` foi removida com sucesso (DROP TABLE confirmado no Dashboard)`,
    `- [ ] As políticas de RLS foram verificadas após a remoção`,
    `- [ ] Nenhuma tela ou API que usava \`${input.dropTable}\` apresenta erro após a migração`,
  ].join('\n');
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Gera o texto completo do prompt de limpeza de tabela duplicada para o
 * Replit Agent do nicemp.com. Não inclui credenciais. Não executa SQL.
 */
export function buildDuplicateTableCleanupPrompt(input: DuplicateTableCleanupInput): string {
  return [
    `# Prompt para Replit — Limpeza de Tabela Duplicada: \`${input.dropTable}\``,
    '',
    '## 1. Objetivo',
    buildObjetivoSection(input),
    '',
    '## 2. Schema atual das tabelas envolvidas (contexto para o Agent)',
    buildSchemaSection(input),
    '',
    '## 3. Passo a passo obrigatório (execute nesta ordem)',
    buildPassoAPassoSection(input),
    '',
    '## 4. Impacto — onde cada tabela é usada no código',
    buildImpactoSection(input),
    '',
    '## 5. Restrições',
    buildRestricaoSection(),
    '',
    '## 6. Checklist final',
    buildChecklistSection(input),
    '',
    '## 7. Ao concluir',
    '⚠️ Obrigatório: confirmar que a tabela foi removida, listar os arquivos alterados no código e verificar que nenhuma tela ou API quebrou.',
    '',
    PROMPT_GENERAL_RULES,
  ].join('\n');
}
