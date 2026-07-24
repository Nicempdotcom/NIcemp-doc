// ─── Gerador de Prompts para Replit (EPIC 09) ─────────────────────────────────
//
// Builds a structured, copy-pasteable prompt that a developer can hand to the
// Replit Agent when they need to change a specific Página, Componente, Hook,
// API ou Módulo. The prompt is deterministic and derived only from data
// already present in the documentation database — never invents file paths
// or facts that were not detected during analysis.

import type { RiskLevel } from '@/services/storage/types';
import { PROMPT_GENERAL_RULES } from './promptRules';

export type PromptEntityKind = 'page' | 'component' | 'hook' | 'api' | 'module';

export interface PromptEntityInput {
  kind:         PromptEntityKind;
  name:         string;
  /** File path / route / module reference — as stored in `location`. */
  location:     string;
  module:       string;
  riskLevel:    RiskLevel;
  /** Human-readable names of related entities (resolved from `relationships`/`usedIn`). */
  dependencies: string[];
  /** Kind-specific technical details shown verbatim (e.g. route, method, props). */
  details?:     Record<string, string>;
}

const KIND_LABELS: Record<PromptEntityKind, string> = {
  page:      'Página',
  component: 'Componente',
  hook:      'Hook',
  api:       'Endpoint de API',
  module:    'Módulo',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  none:     'Nenhum',
  low:      'Baixo',
  medium:   'Médio',
  high:     'Alto',
  critical: 'Crítico',
};

const RISK_GUIDANCE: Record<RiskLevel, string> = {
  none:     'Sem risco relevante identificado — ainda assim, siga o checklist antes de considerar a tarefa concluída.',
  low:      'Risco baixo. Alterações pontuais são aceitáveis, mas evite mudanças fora do escopo pedido.',
  medium:   'Risco médio. Prefira alterações mínimas e cirúrgicas. Revise os pontos de uso listados em "Dependências" antes de mudar assinaturas ou contratos.',
  high:     'Risco alto. Evite refatorações amplas. Não altere assinaturas, contratos de dados ou nomes públicos sem confirmar antes. Teste manualmente todos os pontos de uso listados.',
  critical: 'Risco crítico. Faça a menor alteração possível para resolver o pedido. Pare e peça confirmação explícita antes de qualquer mudança estrutural, de contrato de API ou de schema. Não prossiga sem ter certeza do impacto.',
};

/** File-scope rules that never depend on the specific entity being edited. */
const GLOBAL_FORBIDDEN = [
  'Arquivos de configuração global (`.replit`, `vite.config.*`, `package.json`, `tsconfig*.json`), a menos que a tarefa seja explicitamente sobre eles.',
  'Migrations ou schemas de banco de dados, a menos que a tarefa seja explicitamente sobre eles.',
  'Arquivos de outros módulos/domínios não relacionados ao módulo indicado abaixo.',
  'Qualquer arquivo não listado em "Arquivos permitidos" — se precisar tocar em algo fora da lista, pare e peça confirmação antes.',
];

function buildObjective(input: PromptEntityInput): string {
  const label = KIND_LABELS[input.kind];
  const moduleSuffix = input.module ? ` (módulo "${input.module}")` : '';
  return [
    `Realizar uma alteração no ${label.toLowerCase()} "${input.name}"${moduleSuffix}, localizado em \`${input.location}\`.`,
    '',
    '> Descreva aqui, de forma específica, o que precisa mudar (o quê, por quê e o resultado esperado) antes de começar a implementar. Não prossiga com base em suposições.',
  ].join('\n');
}

function buildAllowedFiles(input: PromptEntityInput): string {
  const lines = [
    `- \`${input.location}\` — arquivo principal do ${KIND_LABELS[input.kind].toLowerCase()}.`,
    '- Arquivos de teste diretamente associados a este arquivo (mesmo nome, com sufixo `.test`/`.spec`), se existirem.',
  ];
  if (input.kind === 'component' || input.kind === 'hook') {
    lines.push('- Arquivos de estilo (`.css`/`.module.css`) exclusivos deste arquivo, se existirem.');
  }
  lines.push('- Qualquer outro arquivo, apenas se for estritamente necessário e justificado explicitamente antes de editá-lo.');
  return lines.join('\n');
}

function buildForbiddenFiles(input: PromptEntityInput): string {
  const lines = GLOBAL_FORBIDDEN.map((l) => `- ${l}`);
  if (input.dependencies.length > 0) {
    lines.push(`- Os arquivos dos itens listados em "Dependências" — edite-os apenas se a tarefa pedir isso explicitamente, e sempre avise antes.`);
  }
  return lines.join('\n');
}

function buildDependencies(input: PromptEntityInput): string {
  const lines: string[] = [];
  if (input.dependencies.length === 0) {
    lines.push('Nenhuma dependência direta registrada na base de documentação.');
  } else {
    lines.push('Itens relacionados detectados automaticamente (verifique se continuam funcionando após a alteração):');
    for (const dep of input.dependencies) lines.push(`- ${dep}`);
  }
  if (input.details && Object.keys(input.details).length > 0) {
    lines.push('');
    lines.push('Detalhes técnicos conhecidos:');
    for (const [key, value] of Object.entries(input.details)) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

function buildRisk(input: PromptEntityInput): string {
  return `${RISK_LABELS[input.riskLevel]} — ${RISK_GUIDANCE[input.riskLevel]}`;
}

function buildTestChecklist(input: PromptEntityInput): string {
  const lines = [
    '- [ ] A aplicação inicia sem erros no console (browser e servidor) após a alteração.',
    `- [ ] O comportamento existente de "${input.name}" continua funcionando como antes (sem regressão).`,
  ];
  switch (input.kind) {
    case 'page':
      lines.push(`- [ ] A rota associada a esta página carrega corretamente e navega sem erros (\`${input.details?.Rota ?? input.location}\`).`);
      break;
    case 'component':
      lines.push('- [ ] O componente renderiza corretamente com as props documentadas, inclusive casos de borda (vazio, erro, loading).');
      break;
    case 'hook':
      lines.push('- [ ] O hook retorna o valor esperado e não introduz loops de re-render ou dependências ausentes.');
      break;
    case 'api':
      lines.push(`- [ ] O endpoint responde com o status e schema esperados (\`${input.details?.Método ?? ''} ${input.details?.Rota ?? input.location}\`).`);
      break;
    case 'module':
      lines.push(`- [ ] Todas as páginas, componentes, hooks e APIs do módulo "${input.name}" continuam funcionando após a alteração.`);
      break;
  }
  if (input.dependencies.length > 0) {
    lines.push('- [ ] Todos os itens listados em "Dependências" foram verificados manualmente após a alteração.');
  }
  lines.push('- [ ] Nenhum arquivo fora da lista de "Arquivos permitidos" foi alterado.');
  return lines.join('\n');
}

export interface PromptTaskOptions {
  /** Rótulo da tarefa, usado no título do prompt (ex.: "Refatoração", "Correção de Bug"). */
  taskLabel?: string;
  /** Substitui o texto padrão da seção "Objetivo da alteração". */
  objectiveOverride?: string;
  /** Itens extras adicionados ao final do checklist de testes. */
  extraChecklist?: string[];
}

/**
 * Builds the full prompt text for a given entity. The result is meant to be
 * pasted directly into the Replit Agent chat.
 */
export function buildReplitPrompt(input: PromptEntityInput, options: PromptTaskOptions = {}): string {
  const label = KIND_LABELS[input.kind];
  const title = options.taskLabel
    ? `# Prompt para Replit — ${options.taskLabel}: ${input.name}`
    : `# Prompt para Replit — ${label}: ${input.name}`;

  const checklist = options.extraChecklist?.length
    ? [buildTestChecklist(input), ...options.extraChecklist.map((item) => `- [ ] ${item}`)].join('\n')
    : buildTestChecklist(input);

  return [
    title,
    '',
    '## 1. Objetivo da alteração',
    options.objectiveOverride ?? buildObjective(input),
    '',
    '## 2. Arquivos permitidos',
    buildAllowedFiles(input),
    '',
    '## 3. Arquivos proibidos',
    buildForbiddenFiles(input),
    '',
    '## 4. Dependências',
    buildDependencies(input),
    '',
    '## 5. Nível de risco',
    buildRisk(input),
    '',
    '## 6. Checklist de testes',
    checklist,
    '',
    '## 7. Ao concluir',
    '⚠️ Obrigatório: ao final da tarefa, liste TODOS os arquivos que foram criados, modificados ou removidos — mesmo que a alteração pareça pequena. Não omita nenhum arquivo da lista.',
    '',
    PROMPT_GENERAL_RULES,
  ].join('\n');
}
