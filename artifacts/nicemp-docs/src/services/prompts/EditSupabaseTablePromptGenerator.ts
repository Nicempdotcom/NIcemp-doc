// ─── Gerador de Prompt para Edição de Tabela Supabase (nicemp.com) ─────────────
//
// Builds a structured, copy-pasteable prompt for the Replit Agent in the
// nicemp.com project when a database schema/data change is needed. This
// generator only produces TEXT — it never executes SQL or alters data.
//
// IMPORTANTE: as credenciais (URL / anon key) NUNCA aparecem no prompt gerado.

import type { LiveColumn } from '@/services/engine/LiveSupabaseIntrospector';
import type { TableUsageEntry } from '@/services/engine/LiveTableUsageAnalyzer';

export type ChangeType =
  | 'Adicionar coluna'
  | 'Alterar dado existente'
  | 'Inserir linha'
  | 'Outra';

export interface EditSupabaseTablePromptInput {
  tableName:   string;
  changeType:  ChangeType;
  description: string;
  columns:     LiveColumn[];
  usages:      TableUsageEntry[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildCurrentSchemaSection(columns: LiveColumn[]): string {
  if (columns.length === 0) return 'Schema não disponível (tabela sem colunas detectadas via introspecção).';
  const lines = columns.map(
    (c) => `  - \`${c.name}\` (${c.type}${c.nullable ? ', nullable' : ', NOT NULL'})`,
  );
  return ['Colunas atuais da tabela `' + columns[0]?.name?.replace(/.*/, '') + '`:', ...lines].join('\n').replace(
    'Colunas atuais da tabela ``:', 'Colunas atuais:',
  );
}

function buildUsagesSection(usages: TableUsageEntry[]): string {
  if (usages.length === 0) {
    return 'Nenhuma referência encontrada no código analisado (a tabela pode ser usada em partes ainda não analisadas).';
  }
  const lines = usages.map(
    (u) => `  - ${u.kind === 'page' ? 'Página' : u.kind === 'component' ? 'Componente' : 'API'}: **${u.label}**`,
  );
  return [
    '⚠️ Atenção: esta tabela é referenciada no código do projeto. Uma mudança de schema pode quebrar os itens abaixo:',
    ...lines,
  ].join('\n');
}

function buildObjectiveSection(input: EditSupabaseTablePromptInput): string {
  const desc = input.description.trim() || 'Descreva aqui a mudança desejada.';
  return [
    `Realizar a seguinte alteração na tabela \`${input.tableName}\` do banco de dados de **produção** do nicemp.com:`,
    '',
    `**Tipo de mudança:** ${input.changeType}`,
    '',
    desc,
  ].join('\n');
}

function buildStepsSection(input: EditSupabaseTablePromptInput): string {
  const lines: string[] = [
    `a) Antes de qualquer mudança: **confirmar com o usuário** que a alteração na tabela \`${input.tableName}\` do banco de PRODUÇÃO está aprovada.`,
    '',
    `b) Se a mudança envolver schema (coluna nova, tipo alterado, coluna removida):`,
    `   - Considerar backup ou snapshot antes de aplicar.`,
    `   - Considerar migração (se o Supabase do projeto tiver migrations configuradas).`,
    `   - Verificar as políticas de RLS vigentes em \`${input.tableName}\` para garantir que a nova coluna/dado esteja coberta.`,
    '',
    `c) Aplicar a mudança via Supabase Dashboard ou SQL Editor do projeto nicemp.com — NÃO via código automático do Agent sem revisão explícita.`,
    '',
    `d) Após aplicar, testar as telas/APIs listadas na seção "Impacto" abaixo para garantir que nada quebrou.`,
  ];

  if (input.usages.length > 0) {
    lines.push(
      '',
      `e) Verificar no código do nicemp.com os arquivos que referenciam \`${input.tableName}\` e ajustar se necessário (ver seção Impacto).`,
    );
  }

  return lines.join('\n');
}

function buildImpactSection(input: EditSupabaseTablePromptInput): string {
  return buildUsagesSection(input.usages);
}

function buildForbiddenSection(): string {
  return [
    '- Não alterar outras tabelas além da especificada acima.',
    '- Não aplicar mudanças de schema sem revisão e aprovação do usuário.',
    '- Não expor ou logar credenciais do Supabase em nenhum arquivo ou saída.',
    '- Não remover políticas de RLS existentes sem consulta explícita.',
  ].join('\n');
}

function buildChecklistSection(input: EditSupabaseTablePromptInput): string {
  const lines = [
    `- [ ] A mudança na tabela \`${input.tableName}\` foi aplicada com sucesso no banco de produção`,
    `- [ ] O Supabase Dashboard confirma a alteração (Schema Editor ou Table Editor)`,
  ];
  if (input.usages.length > 0) {
    lines.push(
      `- [ ] As telas/APIs que usam \`${input.tableName}\` foram testadas e continuam funcionando`,
    );
  }
  if (input.changeType === 'Adicionar coluna') {
    lines.push(`- [ ] A nova coluna tem valor padrão ou é nullable para não quebrar registros existentes`);
  }
  return lines.join('\n');
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds the full "editar tabela Supabase" prompt text for nicemp.com.
 * Does NOT include any credentials (URL / anon key).
 */
export function buildEditSupabaseTablePrompt(input: EditSupabaseTablePromptInput): string {
  const schema = buildCurrentSchemaSection(input.columns);

  return [
    `# Prompt para Replit — Alterar Tabela: \`${input.tableName}\``,
    '',
    '## 1. Objetivo',
    buildObjectiveSection(input),
    '',
    '## 2. Schema atual da tabela (contexto para o Agent)',
    schema,
    '',
    '## 3. Passo a passo obrigatório',
    buildStepsSection(input),
    '',
    '## 4. Impacto — onde esta tabela é usada no código',
    buildImpactSection(input),
    '',
    '## 5. Arquivos proibidos / restrições',
    buildForbiddenSection(),
    '',
    '## 6. Checklist final',
    buildChecklistSection(input),
    '',
    '## 7. Ao concluir',
    '⚠️ Obrigatório: confirmar que a mudança foi aplicada, listar o que foi alterado e verificar que nenhuma tela/API quebrou.',
  ].join('\n');
}
